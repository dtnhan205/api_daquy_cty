const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, 
  discountPercentage: { type: Number, required: true, min: 0, max: 100 }, 
  expirationDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  usageLimit: { type: Number, default: 1 }, 
  usedCount: { type: Number, default: 0 }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Discount', discountSchema);