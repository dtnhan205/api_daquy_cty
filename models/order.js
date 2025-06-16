const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  ward: { type: String, required: true },
  address: { type: String, required: true },
  orderNote: { type: String },
  products: [{
    productName: String,
    size: String,
    subTotal: Number
  }],
  totalAmount: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  status: { type: String, enum: ['Chờ xử lý', 'Đang giao', 'Đã giao'], default: 'Chờ xử lý' },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);