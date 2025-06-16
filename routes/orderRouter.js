const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const jwt = require('jsonwebtoken');
const authAdmin = require('../middlewares/authMiddleware');


router.post('/', orderController.createOrder);

router.get('/', authAdmin, orderController.getAllOrders);

router.get('/:id', authAdmin, orderController.getOrderById);

router.put('/:id', authAdmin, orderController.updateOrder);

router.put('/:id/toggle-status', authAdmin, orderController.toggleOrderStatus);

module.exports = router;