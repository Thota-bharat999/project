/**
 * Video Sensitivity Analysis Service
 *
 * This simulates an ML-based content moderation pipeline.
 * In production, integrate with services like:
 * - AWS Rekognition Video
 * - Google Video Intelligence API
 * - Azure Video Indexer
 * - OpenAI / Custom ML model
 */

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const Video = require('../models/Video');

/**
 * Simulate content analysis categories with random scores
 * In production, replace with real ML inference
 */
const analyseContentCategories = (filePath) => {
  return new Promise((resolve) => {
    // Simulate processing time for a real ML pipeline
    setTimeout(() => {
      resolve({
        violence: Math.random() * 0.5,
        explicitContent: Math.random() * 0.3,
        hateSpeech: Math.random() * 0.2,
        spam: Math.random() * 0.15,
      });
    }, 500);
  });
};

/**
 * Calculate overall sensitivity score from category scores
 */
const calculateOverallScore = (categories) => {
  const weights = {
    violence: 0.35,
    explicitContent: 0.35,
    hateSpeech: 0.2,
    spam: 0.1,
  };

  const weightedScore = Object.keys(weights).reduce((acc, key) => {
    return acc + (categories[key] || 0) * weights[key];
  }, 0);

  return Math.min(1, weightedScore);
};

/**
 * Determine sensitivity result based on score
 */
const classifyContent = (score) => {
  if (score >= 0.4) return 'flagged';
  return 'safe';
};

/**
 * Emit progress updates via Socket.io
 */
const emitProgress = (io, videoId, progress, message, status = 'processing') => {
  if (io) {
    io.emit(`video:progress:${videoId}`, {
      videoId,
      progress,
      message,
      status,
    });
    // Also emit to a general channel for dashboards
    io.emit('video:update', { videoId, progress, status });
  }
};

/**
 * Main video processing pipeline
 * @param {string} videoId - MongoDB video document ID
 * @param {string} filePath - Path to the video file
 * @param {Object} io - Socket.io server instance
 */
const processVideo = async (videoId, filePath, io) => {
  try {
    // Ensure browser-friendly format when needed by transcoding non-playable uploads.
    const ext = path.extname(filePath).toLowerCase();
    const playableExts = ['.mp4', '.webm', '.ogg'];
    if (!playableExts.includes(ext)) {
      const convertedPath = path.join(
        path.dirname(filePath),
        `${path.basename(filePath, ext)}.mp4`
      );

      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .output(convertedPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .format('mp4')
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      const convertedStats = fs.statSync(convertedPath);
      // Update video document to point to the converted MP4 asset.
      await Video.findByIdAndUpdate(videoId, {
        filename: path.basename(convertedPath),
        mimetype: 'video/mp4',
        size: convertedStats.size,
      });

      // Remove original unsupported file.
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      filePath = convertedPath;
    }

    // Step 1: Mark as processing
    await Video.findByIdAndUpdate(videoId, {
      status: 'processing',
      processingProgress: 0,
    });
    emitProgress(io, videoId, 0, 'Starting sensitivity analysis...', 'processing');
    await delay(600);

    // Step 2: File validation
    await Video.findByIdAndUpdate(videoId, { processingProgress: 10 });
    emitProgress(io, videoId, 10, 'Validating video format...', 'processing');
    await delay(800);

    // Step 3: Extract metadata (simulated)
    await Video.findByIdAndUpdate(videoId, { processingProgress: 25 });
    emitProgress(io, videoId, 25, 'Extracting video metadata...', 'processing');
    await delay(700);

    // Step 4: Frame sampling
    await Video.findByIdAndUpdate(videoId, { processingProgress: 40 });
    emitProgress(io, videoId, 40, 'Sampling key frames for analysis...', 'processing');
    await delay(1000);

    // Step 5: Content analysis
    await Video.findByIdAndUpdate(videoId, { processingProgress: 60 });
    emitProgress(io, videoId, 60, 'Running content sensitivity models...', 'processing');

    const categories = await analyseContentCategories(filePath);
    await delay(500);

    // Step 6: Score aggregation
    await Video.findByIdAndUpdate(videoId, { processingProgress: 80 });
    emitProgress(io, videoId, 80, 'Aggregating sensitivity scores...', 'processing');
    await delay(600);

    const overallScore = calculateOverallScore(categories);
    const result = classifyContent(overallScore);

    // Step 7: Finalise
    await Video.findByIdAndUpdate(videoId, { processingProgress: 95 });
    emitProgress(io, videoId, 95, 'Finalising analysis results...', 'processing');
    await delay(500);

    // Step 8: Update database with results
    await Video.findByIdAndUpdate(videoId, {
      status: 'completed',
      processingProgress: 100,
      sensitivityResult: result,
      sensitivityScore: parseFloat(overallScore.toFixed(4)),
      sensitivityDetails: {
        violence: parseFloat(categories.violence.toFixed(4)),
        explicitContent: parseFloat(categories.explicitContent.toFixed(4)),
        hateSpeech: parseFloat(categories.hateSpeech.toFixed(4)),
        spam: parseFloat(categories.spam.toFixed(4)),
      },
    });

    emitProgress(io, videoId, 100, 'Analysis complete!', 'completed');

    // Emit final result
    if (io) {
      io.emit(`video:result:${videoId}`, {
        videoId,
        status: 'completed',
        sensitivityResult: result,
        sensitivityScore: overallScore,
        sensitivityDetails: categories,
      });
    }

    console.log(`✅ Video ${videoId} processed: ${result} (score: ${overallScore.toFixed(4)})`);
    return { result, score: overallScore, categories };

  } catch (error) {
    console.error(`❌ Error processing video ${videoId}:`, error.message);

    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      processingError: error.message,
    });

    emitProgress(io, videoId, 0, `Processing failed: ${error.message}`, 'failed');

    if (io) {
      io.emit(`video:result:${videoId}`, {
        videoId,
        status: 'failed',
        error: error.message,
      });
    }

    throw error;
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { processVideo };
