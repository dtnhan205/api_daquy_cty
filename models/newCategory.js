const mongoose = require('mongoose');

const newCategorySchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['show', 'hidden'],
    default: 'show',
  },
  slug: {
    type: String,
    unique: true,
    sparse: true, 
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('NewCategory', newCategorySchema);