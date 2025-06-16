const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authAdmin = require('../middlewares/authMiddleware');
const { login, getAdmin, createAdmin } = require('../controllers/adminController');

router.post('/login', login);
router.get('/me', authAdmin, getAdmin);
router.post('/create', authAdmin, createAdmin);

module.exports = router;