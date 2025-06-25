const Category = require('../models/category');
const Product = require('../models/product'); 

exports.createCategory = async (req, res) => {
  try {
    const { category, status } = req.body;
    const newCategory = new Category({ category, status: status || 'show' });
    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi tạo danh mục' });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi lấy danh mục' });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    res.status(200).json(category);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi tìm kiếm danh mục' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category: newCategoryName, status } = req.body;

    if (!newCategoryName) {
      return res.status(400).json({ message: 'Tên danh mục không được để trống' });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { category: newCategoryName, status },
      { new: true, runValidators: true }
    );
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    try {
      const updateResult = await Product.updateMany(
        { 'category.id': id },
        { 'category.name_categories': newCategoryName }
      );
      console.log('Số sản phẩm được cập nhật:', updateResult.modifiedCount);
    } catch (productError) {
      console.warn('Không thể cập nhật sản phẩm:', productError.message);
    }

    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Lỗi khi cập nhật danh mục:', error.message);
    res.status(400).json({ message: 'Có lỗi xảy ra khi cập nhật danh mục', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    res.status(200).json({ message: 'Danh mục đã được xóa thành công' });
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi xóa danh mục' });
  }
};

exports.toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });

    const newStatus = category.status === 'show' ? 'hidden' : 'show';
    const updatedCategory = await Category.findByIdAndUpdate(id, { status: newStatus }, { new: true, runValidators: true });
    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi thay đổi trạng thái danh mục' });
  }
};