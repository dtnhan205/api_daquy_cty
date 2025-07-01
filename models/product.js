const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  category: {
    id: { type: String, required: true },
    name_categories: { type: String, required: true },
  },
  level: { type: String, default: '' },
  element: { type: String, default: '' },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  images: [{ type: String }],
  status: { type: String, enum: ['hidden', 'show', 'sale'], default: 'show', required: true },
  tag: { type: String, default: 'new' },
  short_description: { type: String, default: '' },
  option: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    size_name: { type: String, required: true },
    stock: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true }
  }],
  description: { type: String, default: '' },
  purchases: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);


