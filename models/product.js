const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  category: {
    id: { type: String, required: true },
    name_categories: { type: String, required: true }
  },
  level: { type: String, trim: true, default: '' },
  stock: { type: Number, default: 0, min: 0 },
  purchases: { type: Number, default: 0 },
  Collection: { type: String, trim: true, default: '' },
  element: { type: String, trim: true, default: '' },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  images: [{ type: String, trim: true }],
  price: { type: Number, required: true },
  status: { type: String, enum: ['hidden', 'show', 'sale'], default: 'show' }, 
  tag: { type: String, enum: ['new', 'often', 'sale'], default: 'new' }, 
  short_description: { type: String, trim: true, default: '' },
  weight: { type: String, trim: true, default: '' },
  size: [{
    stock: { type: Number, required: true, min: 0 },
    size_name: { type: String, required: true }
  }],
  material: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  origin: { type: String, trim: true, default: '' },
  hardness: { type: String, trim: true, default: '' },
  spiritual_benefits: [{ type: String, trim: true }],
  health_benefits: [{ type: String, trim: true }],
  care_instructions: [{ type: String, trim: true }],
  views: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now }
});

productSchema.index({ views: -1 });

module.exports = mongoose.model('Product', productSchema);