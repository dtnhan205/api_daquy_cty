const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề là bắt buộc'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Slug là bắt buộc'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug chỉ được chứa chữ cái, số và dấu gạch ngang'],
  },
  category: {
    type: String,
    trim: true,
    default: '',
  },
  thumbnailUrl: {
    type: String,
    required: [true, 'Thumbnail URL là bắt buộc'],
    trim: true,
  },
  thumbnailCaption: {
    type: String,
    default: '',
    trim: true,
  },
  publishedAt: {
    type: Date,
    required: [true, 'Ngày xuất bản là bắt buộc'],
    default: Date.now,
  },
  views: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['hidden', 'show'],
    default: 'show',
  },
  content: {
    type: String,
    default: '',
    trim: true,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

newsSchema.index({ views: -1, publishedAt: -1 });

module.exports = mongoose.model('News', newsSchema);