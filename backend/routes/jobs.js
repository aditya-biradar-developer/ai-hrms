const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { validate, schemas } = require('../middlewares/validation');
const {
  createJob,
  getJobById,
  getAllJobs,
  getJobsByDepartment,
  updateJob,
  deleteJob,
  getJobStats
} = require('../controllers/jobController');

const router = express.Router();

// Get all jobs (public)
router.get('/', getAllJobs);

// Get job statistics (admin and HR only)
router.get('/stats', authenticate, authorize('admin', 'hr'), getJobStats);

// Get jobs by department (public)
router.get('/department/:department', getJobsByDepartment);

// Get job by ID (public)
router.get('/:id', getJobById);

// All routes below require authentication
router.use(authenticate);

// Create job (admin and HR only)
router.post('/', authorize('admin', 'hr'), validate(schemas.job), createJob);

// Update job (admin and HR only)
router.put('/:id', authorize('admin', 'hr'), updateJob);

// Delete job (admin and HR only)
router.delete('/:id', authorize('admin', 'hr'), deleteJob);

module.exports = router;