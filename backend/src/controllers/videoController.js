const fs = require('fs');
const path = require('path');
const Video = require('../models/Video');
const { processVideo } = require('../services/sensitivityService');

// Reference to socket.io instance (set by server)
let ioInstance = null;
const setIO = (io) => { ioInstance = io; };

/**
 * @desc  Upload a new video
 * @route POST /api/videos/upload
 * @access Private (editor, admin)
 */
const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }

    const { title, description, tags, category } = req.body;

    if (!title) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Video title is required' });
    }

    const video = await Video.create({
      title,
      description: description || '',
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      category: category || 'Uncategorized',
      owner: req.user.id,
      organisation: req.user.organisation,
      status: 'pending',
    });

    // Start async processing (do not await - runs in background)
    processVideo(video._id.toString(), req.file.path, ioInstance)
      .catch(err => console.error(`Processing error for video ${video._id}:`, err.message));

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully. Processing has started.',
      video,
    });
  } catch (error) {
    // Clean up file if DB save failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * @desc  Get all videos (with filtering, pagination)
 * @route GET /api/videos
 * @access Private
 */
const getVideos = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      status,
      sensitivityResult,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      tags,
    } = req.query;

    // Build query - multi-tenant isolation
    const query = {};

    if (req.user.role === 'admin') {
      // Admin sees all videos in their organisation
      query.organisation = req.user.organisation;
    } else {
      // Regular users see only their own videos
      query.owner = req.user.id;
    }

    // Filters
    if (status) query.status = status;
    if (sensitivityResult) query.sensitivityResult = sensitivityResult;
    if (category) query.category = { $regex: category, $options: 'i' };
    if (tags) query.tags = { $in: tags.split(',').map(t => t.trim()) };

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('owner', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Video.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: videos,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get single video by ID
 * @route GET /api/videos/:id
 * @access Private
 */
const getVideoById = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).populate('owner', 'name email');

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Check access permission
    if (!canAccessVideo(req.user, video)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: video });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Stream video with HTTP range request support
 * @route GET /api/videos/:id/stream
 * @access Private
 */
const streamVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (!canAccessVideo(req.user, video)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (video.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Video is not ready for streaming. Current status: ${video.status}`,
      });
    }

    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const filePath = path.join(uploadDir, getOwnerId(video.owner), video.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Video file not found on server' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // ✅ Normalize MIME type — force browser-compatible types
    const ext = path.extname(video.filename).toLowerCase();
    const mimeMap = {
      '.mp4':  'video/mp4',
      '.webm': 'video/webm',
      '.ogg':  'video/ogg',
      '.ogv':  'video/ogg',
      '.mov':  'video/mp4',   // serve .mov as mp4 — Chrome won't play QuickTime
      '.avi':  'video/x-msvideo',
      '.mkv':  'video/x-matroska',
      '.m4v':  'video/mp4',
    };
    const contentType = mimeMap[ext] || video.mimetype || 'video/mp4';

    // Increment view count
    Video.findByIdAndUpdate(video._id, { $inc: { viewCount: 1 } }).exec();

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
        'Content-Type':   contentType,
        'Cache-Control':  'no-cache',
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type':   contentType,
        'Accept-Ranges':  'bytes',
        'Cache-Control':  'no-cache',
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Update video metadata
 * @route PUT /api/videos/:id
 * @access Private (owner or admin)
 */
const updateVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (!canModifyVideo(req.user, video)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { title, description, tags, category, isPublic } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (category !== undefined) updates.category = category;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    const updated = await Video.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('owner', 'name email');

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Delete video
 * @route DELETE /api/videos/:id
 * @access Private (owner or admin)
 */
const deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (!canModifyVideo(req.user, video)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Remove file from disk
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    const filePath = path.join(uploadDir, video.owner.toString(), video.filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Video.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get video processing status
 * @route GET /api/videos/:id/status
 * @access Private
 */
const getVideoStatus = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).select(
      'status processingProgress sensitivityResult sensitivityScore processingError'
    );

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    res.json({ success: true, data: video });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get video statistics for dashboard
 * @route GET /api/videos/stats
 * @access Private
 */
const getVideoStats = async (req, res, next) => {
  try {
    const matchStage = req.user.role === 'admin'
      ? { organisation: req.user.organisation }
      : { owner: req.user._id };

    const [stats] = await Video.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalSize: { $sum: '$size' },
          totalViews: { $sum: '$viewCount' },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          safe: { $sum: { $cond: [{ $eq: ['$sensitivityResult', 'safe'] }, 1, 0] } },
          flagged: { $sum: { $cond: [{ $eq: ['$sensitivityResult', 'flagged'] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats || {
        total: 0, totalSize: 0, totalViews: 0,
        pending: 0, processing: 0, completed: 0, failed: 0,
        safe: 0, flagged: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Access Control Helpers ──────────────────────────────────────────────────

const canAccessVideo = (user, video) => {
  if (user.role === 'admin' && user.organisation === video.organisation) return true;
  if (video.owner.toString() === user.id.toString()) return true;
  if (video.isPublic) return true;
  if (video.sharedWith?.some(s => s.user.toString() === user.id.toString())) return true;
  return false;
};

const getOwnerId = (owner) => owner && owner.toString ? owner.toString() : String(owner);

const canModifyVideo = (user, video) => {
  if (user.role === 'admin' && user.organisation === video.organisation) return true;
  if (video.owner.toString() === user.id.toString() && user.role !== 'viewer') return true;
  return false;
};

module.exports = {  uploadVideo,
  getVideos,
  getVideoById,
  streamVideo,
  updateVideo,
  deleteVideo,
  getVideoStatus,
  getVideoStats,
  setIO,
};
