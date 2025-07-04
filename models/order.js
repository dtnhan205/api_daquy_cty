const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date }, 
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  ward: { type: String, required: true },
  address: { type: String, required: true },
  orderNote: { type: String },
  products: [{
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    size_name: { type: String, required: true }, 
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  discountCode: { type: String },
  status: { type: String, enum: ['Chờ xử lý', 'Đang giao', 'Đã giao', 'Đã hủy', 'Đang hoàn', 'Đã hoàn'], default: 'Chờ xử lý' },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);