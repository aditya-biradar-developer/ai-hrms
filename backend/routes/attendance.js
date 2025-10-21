const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { validate, schemas } = require('../middlewares/validation');
const {
  createAttendance,
  getAttendanceById,
  getAttendanceByUserId,
  getAllAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  checkIn,
  checkOut,
  getTodayStatus
} = require('../controllers/attendanceController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Check-in/Check-out routes (Industry standard)
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today-status', getTodayStatus);

// Create attendance record
router.post('/', validate(schemas.attendance), createAttendance);

// Get attendance statistics
router.get('/stats', getAttendanceStats);

// Get all attendance (admin/HR/manager can view)
router.get('/', authorize('admin', 'hr', 'manager'), getAllAttendance);

// Get attendance by user ID (HR/Admin/Manager can view any user, employees can only view their own)
router.get('/user/:userId', authorize('admin', 'hr', 'manager', 'employee'), getAttendanceByUserId);

// Get attendance by ID
router.get('/:id', getAttendanceById);

// Update attendance (admin/HR can edit)
router.put('/:id', authorize('admin', 'hr'), updateAttendance);

// Delete attendance (admin only)
router.delete('/:id', authorize('admin'), deleteAttendance);

module.exports = router;