const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const authAdmin = require('../middlewares/authMiddleware');


router.post('/', authAdmin, discountController.createDiscount);
router.get('/', discountController.getAllDiscounts);
router.get('/:id', discountController.getDiscountById);
router.put('/:id', authAdmin, discountController.updateDiscount);
router.delete('/:id', authAdmin, discountController.deleteDiscount);
router.post('/apply', discountController.applyDiscount);

module.exports = router;