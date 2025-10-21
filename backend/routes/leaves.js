const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const leaveController = require('../controllers/leaveController');

// All routes require authentication
router.use(authenticate);

// Create leave request
router.post('/', leaveController.createLeave);

// Get leave statistics
router.get('/stats', leaveController.getLeaveStats);

// Get pending leaves for approval
router.get('/pending', authorize('admin', 'manager', 'hr'), leaveController.getPendingLeaves);

// Get user's leaves
router.get('/user/:userId?', leaveController.getUserLeaves);

// Get all leaves (admin/manager/hr only)
router.get('/', authorize('admin', 'manager', 'hr'), leaveController.getAllLeaves);

// Get leave by ID
router.get('/:id', leaveController.getLeaveById);

// Update leave (approve/reject)
router.put('/:id', authorize('admin', 'manager', 'hr'), leaveController.updateLeave);

// Delete leave
router.delete('/:id', leaveController.deleteLeave);

module.exports = router;
