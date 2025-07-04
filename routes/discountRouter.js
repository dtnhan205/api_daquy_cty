const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const authAdmin = require('../middlewares/authMiddleware');


router.post('/', authAdmin, discountController.createDiscount);
router.get('/',authAdmin, discountController.getAllDiscounts);
router.get('/with-orders', authAdmin, discountController.getDiscountsWithOrders);
router.get('/:id',authAdmin, discountController.getDiscountById);
router.put('/:id', authAdmin, discountController.updateDiscount);
router.delete('/:id', authAdmin, discountController.deleteDiscount);
router.post('/apply', discountController.applyDiscount);
router.post('/preview', discountController.previewDiscount);

module.exports = router;