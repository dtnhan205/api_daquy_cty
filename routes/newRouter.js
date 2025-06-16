const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newController');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const { upload, handleMulterError } = require('../middlewares/upload');
const authAdmin = require('../middlewares/authMiddleware');


router.get('/', newsController.getAllNews);

router.get('/:id', newsController.getNewsById);

router.get('/hottest', newsController.getHottestNews); 
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

router.put(
  '/:id',
  authAdmin,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'contentImages' },
  ]),
  handleMulterError,
  newsController.updateNews
);

router.delete('/:id', authAdmin, newsController.deleteNews);

router.put('/:id/toggle-visibility', authAdmin, newsController.toggleNewsVisibility);

module.exports = router;