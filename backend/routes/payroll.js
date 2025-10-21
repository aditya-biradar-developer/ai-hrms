const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

// Try to use enhanced controller, fallback to regular if not available
let payrollController;
try {
  payrollController = require('../controllers/payrollControllerEnhanced');
} catch (error) {
  payrollController = require('../controllers/payrollController');
}

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create payroll record (admin and HR)
router.post('/', authorize(['admin', 'hr']), payrollController.createPayroll);

// IMPORTANT: Specific routes must come BEFORE generic /:id routes
// Get payroll statistics (both /stats and /stats/summary work)
router.get('/stats', payrollController.getPayrollStats || payrollController.getPayrollStats);
router.get('/stats/summary', payrollController.getPayrollStats || payrollController.getPayrollStats);

// Department summary (if available)
if (payrollController.getDepartmentSummary) {
  router.get('/stats/department', authorize(['admin', 'hr']), payrollController.getDepartmentSummary);
}

// Process payroll (if available)
if (payrollController.processPayroll) {
  router.put('/:id/process', authorize(['admin', 'hr']), payrollController.processPayroll);
}

// Mark as paid (if available)
if (payrollController.markAsPaid) {
  router.put('/:id/mark-paid', authorize(['admin', 'hr']), payrollController.markAsPaid);
}

// Recalculate payroll deductions (if available)
if (payrollController.recalculatePayroll) {
  router.put('/:id/recalculate', authorize(['admin', 'hr']), payrollController.recalculatePayroll);
}

// Salary structure routes (if available)
if (payrollController.getSalaryStructure) {
  router.get('/structure/:userId', payrollController.getSalaryStructure);
}
if (payrollController.upsertSalaryStructure) {
  router.post('/structure', authorize(['admin', 'hr']), payrollController.upsertSalaryStructure);
}

// Get all payroll (admin, HR, and manager can view)
router.get('/', authorize(['admin', 'hr', 'manager']), payrollController.getAllPayroll);

// Get payroll by user ID
router.get('/user/:userId', payrollController.getPayrollByUserId);

// Get payroll by ID
router.get('/:id', payrollController.getPayrollById);

// Update payroll (admin and HR)
router.put('/:id', authorize(['admin', 'hr']), payrollController.updatePayroll);

// Delete payroll (admin only)
router.delete('/:id', authorize('admin'), payrollController.deletePayroll);

module.exports = router;