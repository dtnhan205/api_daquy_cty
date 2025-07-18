const mongoose = require('mongoose');
const Product = require('../models/product');
const upload = require('../middlewares/multerConfig');

// Middleware xử lý lỗi upload
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Lỗi upload: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Kiểm tra slug hợp lệ
const isValidSlug = (slug) => {
  return /^[a-z0-9-]+$/i.test(slug);
};

// Hàm tạo slug từ tên sản phẩm
const generateSlug = async (name, attempt = 0) => {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const finalSlug = attempt > 0 ? `${slug}-${attempt}` : slug;
  const existingProduct = await Product.findOne({ slug: finalSlug });
  if (existingProduct) {
    return generateSlug(name, attempt + 1);
  }
  return finalSlug;
};

// Lấy tất cả sản phẩm
exports.getAllProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    if (limit < 0) {
      return res.status(400).json({ error: 'Giá trị limit phải là số nguyên không âm' });
    }
    const productList = await Product.find().sort({ createdAt: -1 }).limit(limit);
    if (!productList.length) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm nào' });
    }
    res.json(productList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm', error: error.message });
  }
};

// Lấy tất cả sản phẩm có trạng thái show
exports.getAllShowProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50; // Mặc định là 50, có thể điều chỉnh
    if (limit < 0) {
      return res.status(400).json({ error: 'Giá trị limit phải là số nguyên không âm' });
    }
    if (limit > 100) { // Giới hạn tối đa là 100 để tránh tải quá nhiều
      return res.status(400).json({ error: 'Giá trị limit không được vượt quá 100' });
    }
    const productList = await Product.find({ status: 'show' }).sort({ createdAt: -1 }).limit(limit);
    if (!productList.length) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm nào có trạng thái show' });
    }
    res.json(productList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm có trạng thái show', error: error.message });
  }
};

// Lấy sản phẩm theo slug
exports.findBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return res.status(400).json({ message: 'Slug sản phẩm không hợp lệ' });
    }

    const isAdmin = !!req.headers.authorization;
    let product;
    if (isAdmin) {
      product = await Product.findOne({ slug });
    } else {
      product = await Product.findOneAndUpdate(
        { slug },
        { $inc: { views: 1 } },
        { new: true, runValidators: true }
      );
    }

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm', error: error.message });
  }
};

// Lấy sản phẩm theo slug chỉ khi có trạng thái show
exports.getShowProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return res.status(400).json({ message: 'Slug sản phẩm không hợp lệ' });
    }

    const isAdmin = !!req.headers.authorization;
    let product;
    if (isAdmin) {
      product = await Product.findOne({ slug, status: 'show' });
    } else {
      product = await Product.findOneAndUpdate(
        { slug, status: 'show' },
        { $inc: { views: 1 } },
        { new: true, runValidators: true }
      );
    }

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm có trạng thái show với slug này' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm có trạng thái show', error: error.message });
  }
};

// Lấy sản phẩm nổi bật (dựa trên views, chỉ lấy status: show)
exports.getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    if (limit < 0) {
      return res.status(400).json({ error: 'Giá trị limit phải là số nguyên không âm' });
    }
    const featuredProducts = await Product.find({ status: 'show' }).sort({ views: -1 }).limit(limit);
    if (!featuredProducts.length) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm nổi bật nào có trạng thái show' });
    }
    res.json({ message: 'Lấy danh sách sản phẩm nổi bật thành công', products: featuredProducts });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm nổi bật', error: error.message });
  }
};

// Lấy sản phẩm đang sale (chỉ lấy status: show)
exports.getSaleProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    if (limit < 0) {
      return res.status(400).json({ error: 'Giá trị limit phải là số nguyên không âm' });
    }
    const saleProducts = await Product.find({ tag: 'sale', status: 'show' }).sort({ createdAt: -1 }).limit(limit);
    if (!saleProducts.length) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm sale nào có trạng thái show' });
    }
    res.json({ message: 'Lấy danh sách sản phẩm sale thành công', products: saleProducts });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm sale', error: error.message });
  }
};

// Tạo sản phẩm mới
exports.createProduct = async (req, res) => {
  try {
    const {
      category,
      level,
      element,
      name,
      price,
      status,
      tag,
      short_description,
      description,
      purchases,
      option
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tên sản phẩm là bắt buộc' });
    }

    const slug = await generateSlug(name);

    const images = req.files && req.files.length > 0
      ? req.files.map(file => `images/${file.filename}`)
      : [];
    if (!images.length) {
      return res.status(400).json({ error: 'Cần ít nhất một hình ảnh sản phẩm' });
    }

    let parsedCategory;
    try {
      parsedCategory = typeof category === 'string' ? JSON.parse(category) : category;
      if (!parsedCategory?.id || !parsedCategory?.name_categories) {
        return res.status(400).json({ error: 'Category phải có id và name_categories' });
      }
    } catch (e) {
      return res.status(400).json({ error: `Lỗi phân tích category: ${e.message}` });
    }

    let parsedOption = [];
    if (option) {
      try {
        parsedOption = typeof option === 'string' ? JSON.parse(option) : option;
        if (!Array.isArray(parsedOption) || !parsedOption.every(item => item.stock >= 0 && item.size_name && item.price >= 0)) {
          return res.status(400).json({ error: 'Option phải là mảng các object với stock, size_name và price' });
        }
      } catch (e) {
        return res.status(400).json({ error: `Lỗi phân tích option: ${e.message}` });
      }
    }

    const newProduct = new Product({
      category: parsedCategory,
      level: level || '',
      element: element || '',
      name,
      slug,
      images,
      price: parseInt(price, 10) || 0,
      status: status || 'show',
      tag: tag || 'new',
      short_description: short_description || '',
      option: parsedOption,
      description: description || '',
      purchases: parseInt(purchases, 10) || 0,
      views: 0,
    });

    await newProduct.save();
    res.status(201).json({ message: 'Tạo sản phẩm thành công', product: newProduct });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Slug đã tồn tại' });
    }
    res.status(400).json({ error: err.message });
  }
};

// Cập nhật sản phẩm theo slug
exports.updateProduct = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return res.status(400).json({ message: 'Slug sản phẩm không hợp lệ' });
    }

    const {
      category,
      level,
      element,
      name,
      price,
      status,
      tag,
      short_description,
      description,
      purchases,
      option
    } = req.body;

    const product = await Product.findOne({ slug });
    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    let newSlug = product.slug;
    if (name && name !== product.name) {
      newSlug = await generateSlug(name);
    }

    let images = product.images;
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `images/${file.filename}`);
    } else if (req.body.images) {
      images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    let parsedCategory = product.category;
    if (category) {
      try {
        parsedCategory = typeof category === 'string' ? JSON.parse(category) : category;
        if (!parsedCategory?.id || !parsedCategory?.name_categories) {
          return res.status(400).json({ error: 'Category phải có id và name_categories' });
        }
      } catch (e) {
        return res.status(400).json({ error: `Lỗi phân tích category: ${e.message}` });
      }
    }

    let parsedOption = product.option;
    if (option) {
      try {
        parsedOption = typeof option === 'string' ? JSON.parse(option) : option;
        if (!Array.isArray(parsedOption) || !parsedOption.every(item => item.stock >= 0 && item.size_name && item.price >= 0)) {
          return res.status(400).json({ error: 'Option phải là mảng các object với stock, size_name và price' });
        }
      } catch (e) {
        return res.status(400).json({ error: `Lỗi phân tích option: ${e.message}` });
      }
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { slug },
      {
        category: parsedCategory,
        level: level || product.level,
        element: element || product.element,
        name: name || product.name,
        slug: newSlug,
        images,
        price: parseInt(price, 10) || product.price,
        status: status || product.status,
        tag: tag || product.tag,
        short_description: short_description || product.short_description,
        option: parsedOption,
        description: description || product.description,
        purchases: parseInt(purchases, 10) || product.purchases,
      },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Cập nhật sản phẩm thành công', product: updatedProduct });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Slug đã tồn tại' });
    }
    res.status(400).json({ error: err.message });
  }
};

// Xóa sản phẩm theo slug
exports.deleteProduct = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return res.status(400).json({ message: 'Slug sản phẩm không hợp lệ' });
    }
    const deletedProduct = await Product.findOneAndDelete({ slug });
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xóa' });
    }
    res.json({ message: 'Xóa sản phẩm thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// Chuyển đổi trạng thái hiển thị của sản phẩm theo slug
exports.toggleProductStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    console.log('Request params:', req.params); // Debug: kiểm tra slug
    console.log('Request body:', req.body);    // Debug: kiểm tra status
    console.log('Query to find product:', { slug }); // Debug: truy vấn trước khi thực hiện

    if (!isValidSlug(slug)) {
      return res.status(400).json({ message: 'Slug sản phẩm không hợp lệ' });
    }

    if (!status) {
      return res.status(400).json({ message: 'Trạng thái (status) là bắt buộc' });
    }

    // Tìm sản phẩm theo slug và log trạng thái hiện tại
    const query = { slug };
    console.log('Actual query sent to MongoDB:', query); // Log truy vấn thực tế
    const product = await Product.findOne(query);
    console.log('Product found:', product ? product : 'Not found'); // Debug: kết quả tìm kiếm
    if (!product) {
      return res.status(404).json({ message: `Không tìm thấy sản phẩm với slug: ${slug}` });
    }
    console.log('Product _id:', product._id); // Debug: kiểm tra _id của sản phẩm
    console.log('Current product status:', product.status); // Debug: trạng thái hiện tại

    const validStatuses = ['hidden', 'show', 'sale'];
    const newStatus = status.toLowerCase();
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: hidden, show, sale' });
    }

    // Sử dụng findOneAndUpdate để tránh hook
    const updatedProduct = await Product.findOneAndUpdate(
      { slug },
      { status: newStatus },
      { new: true, runValidators: true }
    );
    if (!updatedProduct) throw new Error('Cập nhật thất bại');
    console.log('Updated product status:', updatedProduct.status); // Debug: trạng thái sau khi cập nhật
    res.json({ message: `Trạng thái sản phẩm đã được cập nhật thành ${newStatus}`, product: updatedProduct });
  } catch (err) {
    console.error('Lỗi khi cập nhật trạng thái:', err); // Log chi tiết lỗi
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: `Lỗi validation: ${err.message}` });
    } else if (err.name === 'MongoError' && err.code === 11000) {
      return res.status(400).json({ error: 'Lỗi trùng lặp dữ liệu' });
    } else if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    } else if (err.name === 'DocumentNotFoundError') {
      return res.status(404).json({ error: 'Không tìm thấy tài liệu trong database', details: err.message });
    }
    res.status(500).json({ error: 'Lỗi máy chủ', details: err.message });
  }
};

exports.uploadMiddleware = [upload.array('images', 10), handleMulterError];