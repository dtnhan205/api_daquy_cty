const NewCategory = require('../models/newCategory'); // Giả định model mới
const mongoose = require('mongoose');

exports.createNewCategory = async (req, res) => {
  try {
    const { category, status, slug } = req.body; 
    if (!category) {
      return res.status(400).json({ message: 'Tên danh mục mới không được để trống' });
    }

    const newCategory = new NewCategory({
      category,
      status: status || 'show',
      slug: slug || category.toLowerCase().replace(/\s+/g, '-'), 
    });
    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    console.error('Lỗi khi tạo danh mục mới:', error.message);
    res.status(400).json({ message: 'Có lỗi xảy ra khi tạo danh mục mới', error: error.message });
  }
};

exports.getAllNewCategories = async (req, res) => {
  try {
    const categories = await NewCategory.find().sort({ createdAt: -1 });
    if (categories.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục mới nào' });
    }
    res.status(200).json(categories);
  } catch (error) {
    console.error('Lỗi khi lấy danh mục mới:', error.message);
    res.status(400).json({ message: 'Có lỗi xảy ra khi lấy danh mục mới', error: error.message });
  }
};

exports.getNewCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID danh mục mới không hợp lệ' });
    }
    const category = await NewCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục mới' });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error('Lỗi khi tìm kiếm danh mục mới:', error.message);
    res.status(400).json({ message: 'Có lỗi xảy ra khi tìm kiếm danh mục mới', error: error.message });
  }
};

exports.updateNewCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID danh mục mới không hợp lệ' });
    }
    const { category: newCategoryName, status, slug } = req.body;

    if (!newCategoryName) {
      return res.status(400).json({ message: 'Tên danh mục mới không được để trống' });
    }

    const updatedCategory = await NewCategory.findByIdAndUpdate(
      id,
      {
        category: newCategoryName,
        status: status || 'show',
        slug: slug || newCategoryName.toLowerCase().replace(/\s+/g, '-'),
      },
      { new: true, runValidators: true }
    );
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục mới để cập nhật' });
    }

    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Lỗi khi cập nhật danh mục mới:', error.message);
    res.status(400).json({ message: 'Có lỗi xảy ra khi cập nhật danh mục mới', error: error.message });
  }
};

exports.deleteNewCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID danh mục mới không hợp lệ' });
    }
    const deletedCategory = await NewCategory.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục mới để xóa' });
    }
    res.status(200).json({ message: `Danh mục ${deletedCategory.category} đã được xóa thành công` });
  } catch (error) {
    console.error('Lỗi khi xóa danh mục mới:', error.message);
    res.status(400).json({ message: 'Có lỗi xảy ra khi xóa danh mục mới', error: error.message });
  }
};

exports.toggleNewCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID danh mục mới không hợp lệ' });
    }
    const category = await NewCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục mới' });
    }

    const newStatus = category.status === 'show' ? 'hidden' : 'show';
    const updatedCategory = await NewCategory.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true, runValidators: true }
    );
    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Lỗi khi thay đổi trạng thái danh mục mới:', error.message);
    res.status(400).json({ message: 'Có lỗi xảy ra khi thay đổi trạng thái danh mục mới', error: error.message });
  }
};