const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  category: {
    id: { type: String, required: true },
    name_categories: { type: String, required: true },
  },
  level: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  element: { type: String, default: '' },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  images: [{ type: String }],
  price: { type: Number, default: 0 },
  status: { type: String, default: 'show' },
  tag: { type: String, default: 'new' },
  short_description: { type: String, default: '' },
  weight: { type: String, default: '' },
  size: [{
    size_name: { type: String },
    stock: { type: Number, default: 0 },
  }],
  description: { type: String, default: '' },
  purchases: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', productSchema);