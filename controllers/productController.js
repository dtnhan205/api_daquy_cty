const mongoose = require('mongoose');
const Product = require('../models/product');
const validator = require('validator');
const multer = require('multer');
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

// Lấy tất cả sản phẩm
exports.getAllProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Mặc định 10 nếu không có
    if (limit < 0) {
      return res.status(400).json({ error: 'Giá trị limit không hợp lệ, phải là số nguyên không âm' });
    }
    const productList = await Product.find().sort({ createdAt: -1 }).limit(limit);
    if (productList.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm nào" });
    }
    res.json(productList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm', error: error.message });
  }
};

// Lấy sản phẩm theo _id
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID sản phẩm không hợp lệ' });
    }

    const isAdmin = !!req.headers.authorization;
    let product;
    if (isAdmin) {
      product = await Product.findById(id);
    } else {
      product = await Product.findById(id);
      // Có thể thêm logic tăng views nếu cần
    }

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm', error: error.message });
  }
};

// Lấy sản phẩm nổi bật (dựa trên views)
exports.getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Mặc định 10 nếu không có
    if (limit < 0) {
      return res.status(400).json({ error: 'Giá trị limit không hợp lệ, phải là số nguyên không âm' });
    }

    const featuredProducts = await Product.find()
      .sort({ views: -1 })
      .limit(limit);

    if (featuredProducts.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm nổi bật nào' });
    }

    res.json({
      message: 'Lấy danh sách sản phẩm nổi bật thành công',
      products: featuredProducts,
    });
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm nổi bật:', error.message);
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm nổi bật', error: error.message });
  }
};

// Lấy sản phẩm đang sale (dựa trên status 'sale')
exports.getSaleProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Mặc định 10 nếu không có
    if (limit < 0) {
      return res.status(400).json({ error: 'Giá trị limit không hợp lệ, phải là số nguyên không âm' });
    }

    const saleProducts = await Product.find({ status: { $in: ['sale', 'Sale'] } })
      .sort({ createdAt: -1 })
      .limit(limit);

    if (saleProducts.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm sale nào' });
    }

    res.json({
      message: 'Lấy danh sách sản phẩm sale thành công',
      products: saleProducts,
    });
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm sale:', error.message);
    res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm sale', error: error.message });
  }
};

// Tạo sản phẩm mới
exports.createProduct = async (req, res) => {
  try {
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);

    const {
      category,
      level,
      stock,
      Collection,
      element,
      name,
      slug,
      price,
      status,
      short_description,
      weight,
      size,
      material,
      description,
      origin,
      hardness,
      spiritual_benefits,
      health_benefits,
      care_instructions,
      purchases = 0,
    } = req.body;

    // Xử lý images
    const images = req.files && req.files.length > 0
      ? req.files.map(file => `images/${file.filename}`)
      : [];

    if (!images.length) {
      return res.status(400).json({ error: 'Cần ít nhất một hình ảnh sản phẩm' });
    }

    // Xử lý các trường khác
    let parsedSpiritualBenefits = [];
    let parsedHealthBenefits = [];
    let parsedCareInstructions = [];
    let parsedSize = [];

    if (spiritual_benefits) {
      parsedSpiritualBenefits = typeof spiritual_benefits === 'string' ? JSON.parse(spiritual_benefits) : spiritual_benefits;
    }
    if (health_benefits) {
      parsedHealthBenefits = typeof health_benefits === 'string' ? JSON.parse(health_benefits) : health_benefits;
    }
    if (care_instructions) {
      parsedCareInstructions = typeof care_instructions === 'string' ? JSON.parse(care_instructions) : care_instructions;
    }
    if (size) {
      parsedSize = typeof size === 'string' ? JSON.parse(size) : size;
      if (!Array.isArray(parsedSize) || parsedSize.length !== 2 || !parsedSize.every(num => Number.isInteger(num))) {
        return res.status(400).json({ error: 'Kích thước phải là mảng [min, max] với số nguyên' });
      }
    }

    const newProduct = new Product({
      category: category || '',
      level: level || '',
      stock: parseInt(stock, 10) || 0,
      Collection: Collection || '',
      element: element || '',
      name,
      slug,
      images,
      price: parseInt(price, 10) || 0,
      status: status || 'show',
      short_description: short_description || '',
      weight: weight || '',
      size: parsedSize,
      material: material || '',
      description: description || '',
      origin: origin || '',
      hardness: hardness || '',
      spiritual_benefits: parsedSpiritualBenefits,
      health_benefits: parsedHealthBenefits,
      care_instructions: parsedCareInstructions,
      views: 0,
      purchases: parseInt(purchases, 10) || 0,
    });

    await newProduct.save();
    res.status(201).json({
      message: 'Tạo sản phẩm thành công',
      product: newProduct,
    });
  } catch (err) {
    console.error('POST /api/products error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: `Slug đã tồn tại` });
    }
    res.status(400).json({ error: err.message });
  }
};

// Cập nhật sản phẩm theo _id
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    category,
    level,
    stock,
    Collection,
    element,
    name,
    slug,
    price,
    status,
    short_description,
    weight,
    size,
    material,
    description,
    origin,
    hardness,
    spiritual_benefits,
    health_benefits,
    care_instructions,
    purchases,
  } = req.body;

  try {
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID sản phẩm không hợp lệ' });
    }

    // Debug dữ liệu đầu vào
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);

    // Lấy sản phẩm hiện tại để giữ nguyên images nếu không upload mới
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm để cập nhật' });
    }

    // Xử lý images: giữ nguyên nếu không upload mới
    let images = existingProduct.images || [];
    if (req.files && req.files['images'] && req.files['images'].length > 0) {
      images = req.files['images'].map(file => `images/${file.filename}`);
    } else if (req.body.images) {
      images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    // Xử lý các trường mảng với JSON.parse
    let parsedSpiritualBenefits = [];
    let parsedHealthBenefits = [];
    let parsedCareInstructions = [];
    let parsedSize = [];

    if (spiritual_benefits) {
      try {
        parsedSpiritualBenefits = typeof spiritual_benefits === 'string' ? JSON.parse(spiritual_benefits) : spiritual_benefits;
      } catch (e) {
        return res.status(400).json({ error: `Lỗi phân tích spiritual_benefits: ${e.message}` });
      }
    }
    if (health_benefits) {
      try {
        parsedHealthBenefits = typeof health_benefits === 'string' ? JSON.parse(health_benefits) : health_benefits;
      } catch (e) {
        return res.status(400).json({ error: `Lỗi phân tích health_benefits: ${e.message}` });
      }
    }
    if (care_instructions) {
      try {
        parsedCareInstructions = typeof care_instructions === 'string' ? JSON.parse(care_instructions) : care_instructions;
      } catch (e) {
        return res.status(400).json({ error: `Lỗi phân tích care_instructions: ${e.message}` });
      }
    }
    if (size) {
      try {
        parsedSize = typeof size === 'string' ? JSON.parse(size) : size;
        if (!Array.isArray(parsedSize) || parsedSize.length !== 2 || !parsedSize.every(num => Number.isInteger(num))) {
          return res.status(400).json({ error: 'Kích thước phải là mảng [min, max] với số nguyên' });
        }
      } catch (e) {
        return res.status(400).json({ error: `Lỗi phân tích size: ${e.message}` });
      }
    }

    // Đảm bảo các mảng là hợp lệ
    if (!Array.isArray(parsedSpiritualBenefits)) parsedSpiritualBenefits = [];
    if (!Array.isArray(parsedHealthBenefits)) parsedHealthBenefits = [];
    if (!Array.isArray(parsedCareInstructions)) parsedCareInstructions = [];

    // Cập nhật sản phẩm
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        category: category || '',
        level: level || '',
        stock: parseInt(stock, 10) || 0,
        Collection: Collection || '',
        element: element || '',
        name: name || '',
        slug: slug || '',
        images,
        price: parseInt(price, 10) || 0,
        status: status || 'show',
        short_description: short_description || '',
        weight: weight || '',
        size: parsedSize.length > 0 ? parsedSize : undefined,
        material: material || '',
        description: description || '',
        origin: origin || '',
        hardness: hardness || '',
        spiritual_benefits: parsedSpiritualBenefits,
        health_benefits: parsedHealthBenefits,
        care_instructions: parsedCareInstructions,
        purchases: parseInt(purchases, 10) || 0,
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm để cập nhật' });
    }

    res.json({
      message: 'Cập nhật sản phẩm thành công',
      product: updatedProduct,
    });
  } catch (err) {
    console.error(`PUT /api/products/${id} error:`, err);
    res.status(400).json({ error: err.message });
  }
};

// Xóa sản phẩm theo _id
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID sản phẩm không hợp lệ' });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xóa' });
    }
    res.json({ message: 'Xóa sản phẩm thành công' });
  } catch (err) {
    console.error(`DELETE /api/products/${id} error:`, err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

// Chuyển đổi trạng thái hiển thị của sản phẩm
exports.toggleProductStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID sản phẩm không hợp lệ' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    // Kiểm tra trạng thái hợp lệ
    const validStatuses = ['hidden', 'show', 'sale'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    product.status = status.toLowerCase();

    await product.save();

    const updatedProduct = await Product.findById(id);

    res.json({
      message: `Trạng thái sản phẩm đã được cập nhật thành ${updatedProduct.status}`,
      product: updatedProduct,
    });
  } catch (err) {
    console.error(`PUT /api/products/${id}/toggle-status error:`, err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

exports.uploadMiddleware = [upload.array('images', 10), handleMulterError];