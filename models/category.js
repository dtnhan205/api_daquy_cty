const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['show', 'hidden'], default: 'show' }
});

module.exports = mongoose.model('Category', categorySchema);