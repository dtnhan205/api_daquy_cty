const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const newsRouter = require('./routes/newRouter');
const adminRouter = require('./routes/adminRouter');
const productRouter = require('./routes/productRouter');
const orderRouter = require('./routes/orderRouter');
const categoryRouter = require('./routes/categoryRouter');
const discountRouter = require('./routes/discountRouter');
require('dotenv').config();

const app = express();

// Cấu hình CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];
for (const env of requiredEnv) {
  if (!process.env[env]) {
    console.error(`Lỗi: Biến môi trường ${env} không được định nghĩa trong .env`);
    process.exit(1);
  }
}

const mongooseOptions = {
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10, 
  minPoolSize: 2,  
};

mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
  .then(() => console.log('Kết nối MongoDB thành công'))
  .catch((err) => {
    console.error('Lỗi kết nối MongoDB:', err.message, err.stack);
    process.exit(1);
  });

mongoose.connection.on('connected', () => console.log('Mongoose đã kết nối với DB'));
mongoose.connection.on('error', (err) => console.error('Lỗi kết nối Mongoose:', err.message, err.stack));
mongoose.connection.on('disconnected', () => console.log('Mongoose đã ngắt kết nối'));

app.use('/api/new', newsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/product', productRouter);
app.use('/api/order', orderRouter);
app.use('/api/category', categoryRouter)
app.use('/api/discount', discountRouter);
app.use(express.static('public'));

app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'OK',
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV || 'development',
  };
  res.status(200).json(healthStatus);
});

app.use((req, res, next) => {
  res.status(404).json({ message: 'Tuyến đường không tồn tại' });
});

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Lỗi server:`, err.message, err.stack);
  const errorResponse = process.env.NODE_ENV === 'development'
    ? { message: 'Lỗi server', error: err.message, stack: err.stack }
    : { message: 'Lỗi server' };
  res.status(500).json(errorResponse);
});

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server đang chạy tại http://${HOST}:${PORT}`);
  console.log(`Môi trường: ${process.env.NODE_ENV || 'development'}`);
});

const gracefulShutdown = async (signal) => {
  console.log(`Nhận ${signal}, đang tắt server...`);
  try {
    await mongoose.connection.close();
    console.log('Đã đóng kết nối Mongoose');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi đóng kết nối:', err.message, err.stack);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err.message, err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
});