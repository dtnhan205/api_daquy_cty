const mongoose = require('mongoose');

// Hàm tạo slug từ tên sản phẩm
const generateSlug = async function (name, doc) {
  let baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Xóa ký tự đặc biệt
    .trim()
    .replace(/\s+/g, '-') // Thay khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, '-'); // Thay nhiều dấu gạch ngang bằng một dấu

  let slug = baseSlug;
  let counter = 1;

  // Kiểm tra slug đã tồn tại, ngoại trừ chính document hiện tại
  while (await this.constructor.findOne({ slug, _id: { $ne: doc._id } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

const productSchema = new mongoose.Schema({
  category: {
    id: { type: String, required: true, trim: true },
    name_categories: { type: String, required: true, trim: true }
  },
  level: { type: String, trim: true, default: '' },
  stock: { type: Number, default: 0, min: 0 },
  purchases: { type: Number, default: 0, min: 0 },
  element: { type: String, trim: true, default: '' },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  images: [{ type: String, trim: true }],
  price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['hidden', 'show', 'sale'], default: 'show' },
  tag: { type: String, enum: ['new', 'often', 'sale'], default: 'new' },
  short_description: { type: String, trim: true, default: '' },
  weight: { type: String, trim: true, default: '' },
  size: [{
    stock: { type: Number, required: true, min: 0 },
    size_name: { type: String, required: true, trim: true },
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }
  }],
  description: { type: String, trim: true, default: '' },
  views: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Middleware tự động tạo slug trước khi lưu
productSchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = await generateSlug.call(this, this.name, this);
  }
  next();
});

// Index cho views để tối ưu tìm kiếm sản phẩm nổi bật
productSchema.index({ views: -1 });

module.exports = mongoose.model('Product', productSchema);