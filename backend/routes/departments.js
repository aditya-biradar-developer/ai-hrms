const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const departmentController = require('../controllers/departmentController');

// All routes require authentication
router.use(authenticate);

// Create department (admin only)
router.post('/', authorize('admin'), departmentController.createDepartment);

// Get department statistics
router.get('/stats', authorize('admin', 'manager', 'hr'), departmentController.getDepartmentStats);

// Get all departments
router.get('/', departmentController.getAllDepartments);

// Get department by ID
router.get('/:id', departmentController.getDepartmentById);

// Update department (admin only)
router.put('/:id', authorize('admin'), departmentController.updateDepartment);

// Delete department (admin only)
router.delete('/:id', authorize('admin'), departmentController.deleteDepartment);

module.exports = router;
