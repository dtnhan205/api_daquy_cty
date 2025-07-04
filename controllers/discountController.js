const Discount = require('../models/discount');
const Order = require('../models/order');

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
    const discount = await Discount.findById(id)
      .populate('orderIds', 'fullName email phoneNumber totalAmount grandTotal discountCode status createdAt');
    if (!discount) return res.status(404).json({ message: 'Không tìm thấy mã giảm giá' });
    res.status(200).json(discount);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi tìm kiếm mã giảm giá', error: error.message });
  }
};


exports.getDiscountsWithOrders = async (req, res) => {
  try {
    const discounts = await Discount.find()
      .populate('orderIds', 'fullName email phoneNumber totalAmount grandTotal discountCode status createdAt');
    res.status(200).json(discounts);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi lấy danh sách mã giảm giá', error: error.message });
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { code, orderId } = req.body; 
    const discount = await Discount.findOne({ code, isActive: true }).session(session);
    if (!discount) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Mã giảm giá không tồn tại hoặc không hoạt động' });
    }

    const currentDate = new Date();
    if (currentDate > discount.expirationDate) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Mã giảm giá đã hết hạn' });
    }

    if (discount.usageLimit <= discount.usedCount) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Mã giảm giá đã đạt giới hạn sử dụng' });
    }

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    // Áp dụng mã giảm giá vào đơn hàng
    order.discountCode = code;
    order.grandTotal = order.totalAmount * (1 - discount.discountPercentage / 100); 
    await order.save({ session });

    // Thêm orderId vào discount
    discount.usedCount += 1;
    discount.orderIds.push(orderId);
    await discount.save({ session });

    await session.commitTransaction();
    res.status(200).json({
      message: 'Áp dụng mã giảm giá thành công',
      discountPercentage: discount.discountPercentage,
      updatedOrder: order
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: 'Có lỗi xảy ra khi áp dụng mã giảm giá', error: error.message });
  } finally {
    session.endSession();
  }
};
exports.previewDiscount = async (req, res) => {
  try {
    const { code, totalAmount } = req.body;

    if (!code || typeof totalAmount !== 'number' || totalAmount < 0) {
      return res.status(400).json({ message: 'Mã giảm giá và totalAmount là bắt buộc, totalAmount phải là số không âm' });
    }

    const discount = await Discount.findOne({ code, isActive: true });
    if (!discount) {
      return res.status(404).json({ message: 'Mã giảm giá không tồn tại hoặc không hoạt động' });
    }

    const currentDate = new Date();
    if (currentDate > discount.expirationDate) {
      return res.status(400).json({ message: 'Mã giảm giá đã hết hạn' });
    }

    if (discount.usedCount >= discount.usageLimit) {
      return res.status(400).json({ message: 'Mã giảm giá đã hết lượt sử dụng' });
    }

    const grandTotal = Math.round(totalAmount * (1 - discount.discountPercentage / 100));

    res.status(200).json({
      message: 'Mã giảm giá hợp lệ',
      discountCode: code,
      discountPercentage: discount.discountPercentage,
      totalAmount,
      grandTotal
    });
  } catch (error) {
    console.error('Lỗi khi kiểm tra mã giảm giá:', error);
    res.status(400).json({ message: 'Có lỗi xảy ra khi kiểm tra mã giảm giá', error: error.message });
  }
};