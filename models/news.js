const mongoose = require('mongoose');
const News = require('./newCategory'); 

const newsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, trim: true },
  thumbnailUrl: { type: String, required: true, trim: true },
  thumbnailCaption: { type: String, default: '', trim: true },
  publishedAt: { type: Date, required: true },
  views: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['hidden', 'show'], default: 'show' },
  createdAt: { type: Date, default: Date.now },
  contentBlocks: [{
    type: { type: String, enum: ['text', 'image', 'list'], required: true }, 
    content: { type: String, default: '', trim: true },
    url: { type: String, default: '', trim: true },
    caption: { type: String, default: '', trim: true },
  }],
  newCategory: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'NewCategory', 
    required: true 
  },
});

newsSchema.index({ views: -1 });

module.exports = mongoose.model('News', newsSchema);