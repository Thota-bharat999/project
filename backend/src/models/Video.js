const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    resolution: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    // Processing status: pending | processing | completed | failed
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    // Sensitivity result: safe | flagged | unknown
    sensitivityResult: {
      type: String,
      enum: ['safe', 'flagged', 'unknown'],
      default: 'unknown',
    },
    sensitivityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    sensitivityDetails: {
      violence: { type: Number, default: 0 },
      explicitContent: { type: Number, default: 0 },
      hateSpeech: { type: Number, default: 0 },
      spam: { type: Number, default: 0 },
    },
    processingProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    processingError: {
      type: String,
      default: null,
    },
    // Tags / categories
    tags: [{ type: String, trim: true }],
    category: {
      type: String,
      trim: true,
      default: 'Uncategorized',
    },
    // Multi-tenant: owner and organisation
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organisation: {
      type: String,
      required: true,
    },
    // Viewers with explicit access (for shared content)
    sharedWith: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        permission: { type: String, enum: ['view', 'edit'], default: 'view' },
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    thumbnailPath: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
videoSchema.index({ owner: 1, status: 1 });
videoSchema.index({ organisation: 1 });
videoSchema.index({ sensitivityResult: 1 });
videoSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Video', videoSchema);
