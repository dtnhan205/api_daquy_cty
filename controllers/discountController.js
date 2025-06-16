const Discount = require('../models/discount');

exports.createDiscount = async (req, res) => {
  try {
    const { code, discountPercentage, expirationDate, usageLimit } = req.body;
    const newDiscount = new Discount({ code, discountPercentage, expirationDate, usageLimit });
    const savedDiscount = await newDiscount.save();
    res.status(201).json(savedDiscount);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi tạo mã giảm giá' });
  }
};

exports.getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find();
    res.status(200).json(discounts);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi lấy mã giảm giá' });
  }
};

exports.getDiscountById = async (req, res) => {
  try {
    const { id } = req.params;
    const discount = await Discount.findById(id);
    if (!discount) return res.status(404).json({ message: 'Không tìm thấy mã giảm giá' });
    res.status(200).json(discount);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi tìm kiếm mã giảm giá' });
  }
};

exports.updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discountPercentage, expirationDate, usageLimit, isActive } = req.body;
    const updatedDiscount = await Discount.findByIdAndUpdate(id, { code, discountPercentage, expirationDate, usageLimit, isActive }, { new: true, runValidators: true });
    if (!updatedDiscount) return res.status(404).json({ message: 'Không tìm thấy mã giảm giá' });
    res.status(200).json(updatedDiscount);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi cập nhật mã giảm giá' });
  }
};

exports.deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedDiscount = await Discount.findByIdAndDelete(id);
    if (!deletedDiscount) return res.status(404).json({ message: 'Không tìm thấy mã giảm giá' });
    res.status(200).json({ message: 'Mã giảm giá đã được xóa thành công' });
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi xóa mã giảm giá' });
  }
};

exports.applyDiscount = async (req, res) => {
  try {
    const { code } = req.body;
    const discount = await Discount.findOne({ code, isActive: true });
    if (!discount) return res.status(404).json({ message: 'Mã giảm giá không tồn tại hoặc không hoạt động' });

    const currentDate = new Date();
    if (currentDate > discount.expirationDate) {
      return res.status(400).json({ message: 'Mã giảm giá đã hết hạn' });
    }

    if (discount.usageLimit <= discount.usedCount) {
      return res.status(400).json({ message: 'Mã giảm giá đã đạt giới hạn sử dụng' });
    }

    discount.usedCount += 1;
    await discount.save();

    res.status(200).json({ message: 'Áp dụng mã giảm giá thành công', discountPercentage: discount.discountPercentage });
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi áp dụng mã giảm giá' });
  }
};