const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { validate, schemas } = require('../middlewares/validation');
const {
  createPerformance,
  getPerformanceById,
  getPerformanceByUserId,
  getAllPerformance,
  updatePerformance,
  deletePerformance,
  getPerformanceStats
} = require('../controllers/performanceController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create performance record (admin, HR, and manager)
router.post('/', authorize('admin', 'hr', 'manager'), validate(schemas.performance), createPerformance);

// Get performance statistics
router.get('/stats', getPerformanceStats);

// Get all performance (admin, HR, and manager)
router.get('/', authorize('admin', 'hr', 'manager'), getAllPerformance);

// Get performance by user ID
router.get('/user/:userId', getPerformanceByUserId);

// Get performance by ID
router.get('/:id', getPerformanceById);

// Update performance (admin, HR, and manager)
router.put('/:id', authorize('admin', 'hr', 'manager'), updatePerformance);

// Delete performance (admin only)
router.delete('/:id', authorize('admin'), deletePerformance);

module.exports = router;