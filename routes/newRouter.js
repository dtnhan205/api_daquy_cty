const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newController');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const authAdmin = require('../middlewares/authMiddleware');

router.get('/', newsController.getAllNews);
router.get('/:slug', newsController.getNewsById);
router.get('/hottest', newsController.getHottestNews);
router.post('/', authAdmin, newsController.uploadMiddleware, newsController.createNews);
router.put('/:slug', authAdmin, newsController.uploadMiddleware, newsController.updateNews);
router.delete('/:slug', authAdmin, newsController.deleteNews);
router.put('/:slug/toggle-visibility', authAdmin, newsController.toggleNewsVisibility);

module.exports = router;