const express = require('express');
const router = express.Router();
const newCategoryController = require('../controllers/newCategoryController');

router.post('/', newCategoryController.createNewCategory);
router.get('/', newCategoryController.getAllNewCategories);
router.get('/:id', newCategoryController.getNewCategoryById);
router.put('/:id', newCategoryController.updateNewCategory);
router.delete('/:id', newCategoryController.deleteNewCategory);
router.put('/:id/toggle-status', newCategoryController.toggleNewCategoryStatus);

module.exports = router;