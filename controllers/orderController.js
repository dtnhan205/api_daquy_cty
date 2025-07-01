const Order = require('../models/order');
const Product = require('../models/product'); 
const axios = require('axios');

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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

    // Kiểm tra dữ liệu đầu vào cơ bản
    if (!fullName || !phoneNumber || !email || !country || !city || !district || !ward || !address) {
      return res.status(400).json({ message: 'Các trường bắt buộc (fullName, phoneNumber, email, country, city, district, ward, address) không được để trống' });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Danh sách sản phẩm (products) phải là mảng và không được rỗng' });
    }

    if (typeof totalAmount !== 'number' || typeof grandTotal !== 'number' || totalAmount < 0 || grandTotal < 0) {
      return res.status(400).json({ message: 'totalAmount và grandTotal phải là số không âm' });
    }

    // Kiểm tra tính hợp lệ của products
    for (const product of products) {
      if (!product.productId || !product.productName || !product.size_name || !product.quantity || !product.price) {
        return res.status(400).json({ message: 'Mỗi sản phẩm phải có productId, productName, size_name, quantity và price' });
      }

      const existingProduct = await Product.findById(product.productId).session(session);
      if (!existingProduct) {
        return res.status(400).json({ message: `Sản phẩm với ID ${product.productId} không tồn tại` });
      }

      const option = existingProduct.option.find(opt => opt.size_name === product.size_name);
      if (!option) {
        return res.status(400).json({ message: `Kích thước ${product.size_name} không tồn tại cho sản phẩm ${product.productName}` });
      }

      if (option.stock < product.quantity || product.quantity <= 0) {
        return res.status(400).json({ message: `Kích thước ${product.size_name} của sản phẩm ${product.productName} không đủ tồn kho hoặc số lượng không hợp lệ` });
      }
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
      status: status || 'Chờ xử lý'
    });

    const savedOrder = await order.save({ session });
    await session.commitTransaction();

    res.status(201).json(savedOrder);
  } catch (error) {
    await session.abortTransaction();
    console.error('Order create error:', error);
    res.status(400).json({
      message: 'Có lỗi xảy ra khi tạo đơn hàng',
      error: error.message,
      details: error.errors ? error.errors : 'Không có chi tiết lỗi'
    });
  } finally {
    session.endSession();
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
    const validStatuses = ['Chờ xử lý', 'Đang giao', 'Đã giao', 'Đã hủy', 'Đang hoàn', 'Đã hoàn'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const order = await Order.findById(id).where('isDeleted').equals(false);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    const currentStatus = order.status;

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    for (const product of order.products) {
      const productDoc = await Product.findById(product.productId);
      if (!productDoc) {
        return res.status(400).json({ message: `Sản phẩm với ID ${product.productId} không tồn tại` });
      }

      const option = productDoc.option.find(opt => opt.size_name === product.size_name);
      if (!option) {
        return res.status(400).json({ message: `Kích thước ${product.size_name} không tồn tại cho sản phẩm ${product.productName}` });
      }

      // Giảm stock khi chuyển sang "Đang giao" từ trạng thái không phải "Đang giao" hoặc "Đã giao"
      if (status === 'Đang giao' && currentStatus !== 'Đang giao' && currentStatus !== 'Đã giao') {
        if (option.stock < product.quantity) {
          return res.status(400).json({ 
            message: `Kích thước ${product.size_name} của sản phẩm ${product.productName} không đủ tồn kho` 
          });
        }
        option.stock -= product.quantity;
      }
      // Không giảm stock khi chuyển từ "Đang giao" sang "Đã giao"
      else if (status === 'Đã giao' && currentStatus === 'Đang giao') {
        // Không làm gì, giữ nguyên stock
      }
      // Giảm stock khi chuyển sang "Đã giao" từ trạng thái khác (không phải "Đang giao")
      else if (status === 'Đã giao' && currentStatus !== 'Đang giao' && currentStatus !== 'Đã giao') {
        if (option.stock < product.quantity) {
          return res.status(400).json({ 
            message: `Kích thước ${product.size_name} của sản phẩm ${product.productName} không đủ tồn kho` 
          });
        }
        option.stock -= product.quantity;
      }
      // Tăng stock khi chuyển sang "Đã hủy" hoặc "Đã hoàn" từ trạng thái không phải "Đã hủy" hoặc "Đã hoàn"
      else if ((status === 'Đã hủy' || status === 'Đã hoàn') && 
               currentStatus !== 'Đã hủy' && currentStatus !== 'Đã hoàn') {
        option.stock += product.quantity;
      }

      await productDoc.save();
    }

    res.status(200).json({
      message: `Trạng thái đơn hàng đã được cập nhật thành ${status}`,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
    res.status(400).json({ message: 'Có lỗi xảy ra khi thay đổi trạng thái đơn hàng', error: error.message });
  }
};