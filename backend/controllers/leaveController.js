const Leave = require('../models/Leave');
const NotificationHelper = require('../utils/notificationHelper');
const User = require('../models/User');

// Create leave request
exports.createLeave = async (req, res) => {
  try {
    const { start_date, end_date, leave_type, reason } = req.body;
    
    const leaveData = {
      user_id: req.user.id,
      start_date,
      end_date,
      leave_type,
      reason,
      status: 'pending'
    };
    
    const leave = await Leave.create(leaveData);
    
    // Send notification to managers/HR about new leave request
    await NotificationHelper.notifyLeaveRequest(leave, req.user.name);
    
    res.status(201).json({
      success: true,
      message: 'Leave request created successfully',
      data: leave
    });
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create leave request',
      error: error.message
    });
  }
};

// Get leave by ID
exports.getLeaveById = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findById(id);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave not found'
      });
    }
    
    // Check if user has permission to view this leave
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        req.user.role !== 'hr' && 
        leave.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: leave
    });
  } catch (error) {
    console.error('Get leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leave',
      error: error.message
    });
  }
};

// Get user's leaves
exports.getUserLeaves = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Check if user has permission
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        req.user.role !== 'hr' && 
        userId !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const leaves = await Leave.findByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Get user leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaves',
      error: error.message
    });
  }
};

// Get all leaves (admin/manager/hr)
exports.getAllLeaves = async (req, res) => {
  try {
    const { status, department, startDate, endDate } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (department) filters.department = department;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    let leaves = await Leave.getAll(filters);
    
    // INDUSTRY STANDARD: Managers only see their team's leaves (not HR/Admin)
    if (req.user.role === 'manager') {
      leaves = leaves.filter(leave => {
        const requesterRole = leave.users?.role;
        // Only show employee and manager leaves, hide HR and Admin
        return requesterRole === 'employee' || requesterRole === 'manager';
      });
    }
    
    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaves',
      error: error.message
    });
  }
};

// Update leave (approve/reject)
exports.updateLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    
    const leave = await Leave.findById(id);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave not found'
      });
    }
    
    // INDUSTRY STANDARD: Prevent self-approval (HR/Manager cannot approve their own leaves)
    if (leave.user_id === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Self-approval not allowed',
        error: 'You cannot approve or reject your own leave request. Please contact your manager or admin.'
      });
    }
    
    // Get the leave requester's details to check their role
    const User = require('../models/User');
    const requester = await User.findById(leave.user_id);
    
    // INDUSTRY STANDARD: Manager cannot approve HR or Admin leaves (hierarchy)
    if (req.user.role === 'manager' && (requester.role === 'hr' || requester.role === 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'Managers cannot approve HR or Admin leave requests. Only Admin can approve these requests.'
      });
    }
    
    const updateData = {
      status,
      approved_by: req.user.id,
      approved_at: new Date().toISOString()
    };
    
    if (status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }
    
    const updatedLeave = await Leave.update(id, updateData);
    
    // Send notification to employee about leave status update
    const employee = await User.findById(leave.user_id);
    if (employee) {
      await NotificationHelper.notifyLeaveStatusUpdate(updatedLeave, employee.name, status);
    }
    
    res.status(200).json({
      success: true,
      message: 'Leave updated successfully',
      data: updatedLeave
    });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave',
      error: error.message
    });
  }
};

// Delete leave
exports.deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;
    
    const leave = await Leave.findById(id);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave not found'
      });
    }
    
    // Only allow deletion by the user who created it or admin
    if (req.user.role !== 'admin' && leave.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Leave.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Leave deleted successfully'
    });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave',
      error: error.message
    });
  }
};

// Get leave statistics
exports.getLeaveStats = async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    
    // Admin/HR/Manager get organization-wide stats, others get their own
    const isManagement = ['admin', 'hr', 'manager'].includes(req.user.role);
    const userId = isManagement ? null : req.user.id;
    
    console.log('📊 Getting leave stats:', {
      role: req.user.role,
      isManagement,
      userId: userId || 'ALL',
      year
    });
    
    const stats = await Leave.getStats(userId, year, req.user.role);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get leave stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leave statistics',
      error: error.message
    });
  }
};

// Get pending leaves for approval
exports.getPendingLeaves = async (req, res) => {
  try {
    const leaves = await Leave.getPendingForApprover(req.user.id);
    
    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Get pending leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending leaves',
      error: error.message
    });
  }
};
