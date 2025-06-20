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
      status,
      paymentMethod
    } = req.body;

    let paymentReference;
    let isUnique = false;

    while (!isUnique) {
      const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      paymentReference = `ThanhToan${randomNumber}`;
      const existingOrder = await Order.findOne({ paymentReference });
      if (!existingOrder) isUnique = true;
    }

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
      createdAt: new Date(),
      paymentReference,
      paymentStatus: paymentMethod === 'cod' ? 'pending_delivery' : 'pending',
      paymentMethod: paymentMethod || 'bank_transfer'
    });

    const savedOrder = await order.save();
    const message = paymentMethod === 'cod'
      ? 'Đơn hàng đã được tạo. Vui lòng thanh toán khi nhận hàng.'
      : 'Đơn hàng đã được tạo. Vui lòng quét mã QR để thanh toán.';
    res.status(201).json({ ...savedOrder.toObject(), message });
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi tạo đơn hàng' });
  }
};

exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'Thiếu orderId' });

    const order = await Order.findOne({ paymentReference: orderId, isDeleted: false, paymentMethod: 'bank_transfer' });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const response = await axios.get('https://apicanhan.com/api/mbbankv3?key=7d09d39d42c8f1e3515f11a2be92cb4a&username=0342031354&password=Dtn280705&accountNo=0342031354&ac=1');
    const transactions = response.data.transactions;

    const transaction = transactions.find(t => t.description.includes(order.paymentReference) && t.amount === order.grandTotal.toString() && t.type === 'IN');
    if (transaction) {
      await Order.findByIdAndUpdate(order._id, { paymentStatus: 'paid', status: 'Đang giao' }, { new: true });
      return res.status(200).json({ message: 'Thanh toán thành công', order });
    } else if (new Date() - new Date(order.createdAt) > 24 * 60 * 60 * 1000) {
      await Order.findByIdAndUpdate(order._id, { paymentStatus: 'failed', status: 'Đã hủy' }, { new: true });
      return res.status(200).json({ message: 'Đơn hàng đã bị hủy do quá thời gian', order });
    } else {
      return res.status(200).json({ message: 'Chưa thanh toán', order });
    }
  } catch (error) {
    res.status(400).json({ message: 'Có lỗi xảy ra khi kiểm tra thanh toán' });
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