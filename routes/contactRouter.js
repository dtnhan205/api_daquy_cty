const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');

const authAdmin = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findOne({ _id: decoded.id, role: 'admin' });
    if (!admin) {
      return res.status(401).json({ message: 'Không có quyền admin' });
    }
    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token không hợp lệ', error: error.message });
  }
};

router.post('/', contactController.createContact);

router.get('/', authAdmin, contactController.getAllContacts);
router.get('/:id', authAdmin, contactController.getContactById);
router.put('/:id', authAdmin, contactController.updateContact);
router.delete('/:id', authAdmin, contactController.deleteContact);


module.exports = router;