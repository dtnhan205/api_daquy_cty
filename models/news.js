const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  category: { type: String, trim: true, default: '' }, // Thêm trường category
  thumbnailUrl: { type: String, required: true, trim: true },
  thumbnailCaption: { type: String, default: '', trim: true },
  publishedAt: { type: Date, required: true },
  views: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['hidden', 'show'], default: 'show' },
  createdAt: { type: Date, default: Date.now },
  contentBlocks: [{
    id: { type: String, trim: true }, // Thêm trường id cho contentBlocks
    type: { type: String, enum: ['text', 'image', 'heading', 'sub_heading', 'list'], required: true },
    content: { type: mongoose.Schema.Types.Mixed, default: '' }, // Hỗ trợ chuỗi hoặc mảng
    url: { type: String, default: '', trim: true },
    caption: { type: String, default: '', trim: true },
  }],
});

newsSchema.index({ views: -1 });

module.exports = mongoose.model('News', newsSchema);