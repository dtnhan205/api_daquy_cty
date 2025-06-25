const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newController');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const { upload, handleMulterError } = require('../middlewares/upload');
const authAdmin = require('../middlewares/authMiddleware');

// Lấy tất cả tin tức
router.get('/', newsController.getAllNews);

// Lấy tin tức theo slug
router.get('/:slug', newsController.getNewsBySlug);

// Tạo tin tức mới (yêu cầu authAdmin và upload file)
router.post(
  '/',
  authAdmin,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'contentImages' },
  ]),
  handleMulterError,
  newsController.createNews
);

// Cập nhật tin tức theo slug
router.put(
  '/:slug',
  authAdmin,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'contentImages' },
  ]),
  handleMulterError,
  newsController.updateNews
);

// Xóa tin tức theo slug
router.delete('/:slug', authAdmin, newsController.deleteNews);

// Chuyển đổi trạng thái hiển thị của tin tức theo slug
router.put('/:slug/toggle-visibility', authAdmin, newsController.toggleNewsVisibility);

module.exports = router;