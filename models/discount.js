const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountPercentage: { type: Number, required: true, min: 0, max: 100 },
  isActive: { type: Boolean, default: true },
  expirationDate: { type: Date, required: true },
  usageLimit: { type: Number, required: true, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Discount', discountSchema);