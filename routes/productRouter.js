const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const jwt = require('jsonwebtoken');
const { upload, handleMulterError } = require('../middlewares/upload');
const authAdmin = require('../middlewares/authMiddleware');


router.get('/featured', productController.getFeaturedProducts);
router.get('/sale', productController.getSaleProducts); 
router.get('/', productController.getAllProducts);

router.get('/slug/:slug', productController.findBySlug);

router.post(
  '/',
  authAdmin,
  upload.array('images', 10),
  handleMulterError,
  productController.createProduct
);

router.put(
  '/:slug',
  authAdmin,
  upload.array('images', 10),
  handleMulterError,
  productController.updateProduct
);

router.delete('/:slug', authAdmin, productController.deleteProduct);

router.put('/:slug/toggle-status', authAdmin, productController.toggleProductStatus);

module.exports = router;