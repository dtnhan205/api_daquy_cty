const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authAdmin = require('../middlewares/authMiddleware');

router.post('/', authAdmin, categoryController.createCategory);
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', authAdmin, categoryController.updateCategory);
router.delete('/:id', authAdmin, categoryController.deleteCategory);
router.put('/:id/toggle-status', authAdmin, categoryController.toggleCategoryStatus);

module.exports = router;