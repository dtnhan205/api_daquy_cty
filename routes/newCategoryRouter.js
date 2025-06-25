const express = require('express');
const router = express.Router();
const newCategoryController = require('../controllers/newCategoryController');
const authAdmin = require('../middlewares/authMiddleware');


router.post('/',authAdmin, newCategoryController.createNewCategory);
router.get('/', newCategoryController.getAllNewCategories);
router.get('/:id', newCategoryController.getNewCategoryById);
router.put('/:id',authAdmin, newCategoryController.updateNewCategory);
router.delete('/:id',authAdmin, newCategoryController.deleteNewCategory);
router.put('/:id/toggle-status',authAdmin, newCategoryController.toggleNewCategoryStatus);

module.exports = router;