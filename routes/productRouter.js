const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const jwt = require('jsonwebtoken');
const { upload, handleMulterError } = require('../middlewares/upload');
const authAdmin = require('../middlewares/authMiddleware');

router.get('/featured', productController.getFeaturedProducts);
router.get('/sale', productController.getSaleProducts); 
router.get('/', authAdmin, productController.getAllProducts);
router.get('/show', productController.getAllShowProducts);
router.get('/slug/:slug',authAdmin, productController.findBySlug);
router.get('/show/slug/:slug', productController.getShowProductBySlug);

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

router.patch(
  '/:slug/status',
  authAdmin,
  productController.toggleProductStatus
);

module.exports = router;