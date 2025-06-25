const Order = require('../models/order');
const axios = require('axios');

exports.createOrder = async (req, res) => {
  try {
    const {
      fullName,
      dateOfBirth,
      phoneNumber,
      email,
      country,
      city,
      district,
      ward,
      address,
      orderNote,
      products,
      totalAmount,
      grandTotal,
      status
    } = req.body;

    const order = new Order({
      fullName,
      dateOfBirth,
      phoneNumber,
      email,
      country,
      city,
      district,
      ward,
      address,
      orderNote,
      products,
      totalAmount,
      grandTotal,
      status: status || 'Chờ xử lý',
      createdAt: new Date()
    });

    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Order create error:', error); // Thêm dòng này để log lỗi chi tiết
    res.status(400).json({ message: 'Có lỗi xảy ra khi tạo đơn hàng', error: error.message, detail: error.errors });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi cập nhật đơn hàng' });
  }
};

exports.softDeleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await Order.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.status(200).json({ message: 'Đơn hàng đã được xóa mềm thành công' });
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi xóa mềm đơn hàng' });
  }
};

exports.restoreOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await Order.findByIdAndUpdate(id, { isDeleted: false }, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.status(200).json({ message: 'Đơn hàng đã được khôi phục thành công' });
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi khôi phục đơn hàng' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).where('isDeleted').equals(false);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi tìm kiếm đơn hàng' });
  }
};

exports.getFeaturedOrders = async (req, res) => {
  try {
    const featuredOrders = await Order.find({ isDeleted: false, status: 'Đã giao' }).limit(5);
    res.status(200).json(featuredOrders);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi lấy đơn hàng nổi bật' });
  }
};

exports.getPendingOrders = async (req, res) => {
  try {
    const pendingOrders = await Order.find({ isDeleted: false, status: 'Chờ xử lý' });
    res.status(200).json(pendingOrders);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi lấy đơn hàng đang chờ' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({ isDeleted: false });
    res.status(200).json(orders);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi lấy tất cả đơn hàng' });
  }
};

exports.toggleOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Chờ xử lý', 'Đang giao', 'Đã giao'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi thay đổi trạng thái đơn hàng' });
  }
};