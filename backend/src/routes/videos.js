const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');
const {
  uploadVideo,
  getVideos,
  getVideoById,
  streamVideo,
  updateVideo,
  deleteVideo,
  getVideoStatus,
  getVideoStats,
} = require('../controllers/videoController');

// All routes require authentication
router.use(protect);

// Statistics
router.get('/stats', getVideoStats);

// Video CRUD
router.get('/', getVideos);
router.post('/upload', restrictTo('editor', 'admin'), handleUpload, uploadVideo);
router.get('/:id', getVideoById);
router.put('/:id', restrictTo('editor', 'admin'), updateVideo);
router.delete('/:id', restrictTo('editor', 'admin'), deleteVideo);

// Streaming
router.get('/:id/stream', streamVideo);

// Status polling
router.get('/:id/status', getVideoStatus);

module.exports = router;
