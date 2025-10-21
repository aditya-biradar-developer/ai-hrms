const Performance = require('../models/Performance');
const NotificationHelper = require('../utils/notificationHelper');
const User = require('../models/User');

// Create performance record
const createPerformance = async (req, res) => {
  try {
    // Only admins, HR, and managers can create performance records
    if (!['admin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and managers can create performance reviews.'
      });
    }
    
    console.log('📝 Creating performance review...');
    console.log('User:', req.user.email, '(', req.user.role, ')');
    console.log('Data received:', JSON.stringify(req.body, null, 2));
    
    // Add reviewer_id automatically
    const performanceData = {
      ...req.body,
      reviewer_id: req.user.id
    };
    
    // Remove old fields if they exist (to avoid conflicts)
    delete performanceData.rating;
    delete performanceData.review_date;
    delete performanceData.feedback;
    
    console.log('Final data to insert:', JSON.stringify(performanceData, null, 2));
    
    const performance = await Performance.create(performanceData);
    
    console.log('✅ Performance review created successfully:', performance.id);
    
    // Get employee and reviewer names and send notification
    const employee = await User.findById(performance.user_id);
    const reviewer = await User.findById(req.user.id);
    if (employee && reviewer) {
      await NotificationHelper.notifyNewPerformance(performance, employee.name, reviewer.name);
    }
    
    res.status(201).json({
      success: true,
      message: 'Performance review created successfully',
      data: {
        performance
      }
    });
  } catch (error) {
    console.error('❌ Performance creation error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create performance review',
      error: error.message,
      details: error.detail
    });
  }
};

// Get performance by ID
const getPerformanceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const performance = await Performance.findById(id);
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
    }
    
    // Users can only view their own performance unless they're admin, HR, or manager
    if (!['admin', 'hr', 'manager'].includes(req.user.role) && req.user.id !== performance.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        performance
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get performance by user ID
const getPerformanceByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Users can only view their own performance unless they're admin, HR, or manager
    if (!['admin', 'hr', 'manager'].includes(req.user.role) && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const performance = await Performance.findByUserId(userId, limit, offset);
    
    res.status(200).json({
      success: true,
      data: {
        performance
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all performance (for admin, HR, and manager)
const getAllPerformance = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    // Only admins, HR, and managers can view all performance
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    let performance = await Performance.getAll(limit, offset);
    
    // SECURITY: Managers can only see performance reviews for their department
    if (userRole === 'manager') {
      const User = require('../models/User');
      const manager = await User.findById(userId);
      const managerDept = manager?.department;
      
      console.log('👔 Manager filtering performance reviews:', {
        managerDept,
        totalReviews: performance.length
      });
      
      // Filter to only show reviews for employees in manager's department
      performance = performance.filter(review => 
        review.employee_department === managerDept
      );
      
      console.log('✅ Filtered department reviews:', performance.length);
    }
    
    res.status(200).json({
      success: true,
      data: {
        performance
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update performance
const updatePerformance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const performance = await Performance.findById(id);
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
    }
    
    // Only admins, HR, and managers can update performance
    if (!['admin', 'hr', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedPerformance = await Performance.update(id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Performance updated successfully',
      data: {
        performance: updatedPerformance
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete performance
const deletePerformance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const performance = await Performance.findById(id);
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance record not found'
      });
    }
    
    // Only admins can delete performance
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Performance.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Performance deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get performance statistics
const getPerformanceStats = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    console.log('📊 Fetching performance stats...');
    console.log('User role:', req.user.role);
    console.log('Requested userId:', userId);
    console.log('Date range:', startDate, 'to', endDate);
    
    // Users can only view their own stats unless they're admin, HR, or manager
    if (!['admin', 'hr', 'manager'].includes(req.user.role) && userId && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // If admin/HR/manager and no userId specified, get stats for all users (pass null)
    // If regular user or userId specified, use that userId
    let targetUserId = null;
    if (['admin', 'hr', 'manager'].includes(req.user.role) && !userId) {
      targetUserId = null; // Get all stats
    } else {
      targetUserId = userId || req.user.id;
    }
    
    console.log('Target userId for stats:', targetUserId || 'ALL USERS');
    
    const stats = await Performance.getStats(targetUserId, startDate, endDate);
    
    console.log('✅ Stats calculated:', stats);
    
    res.status(200).json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
  createPerformance,
  getPerformanceById,
  getPerformanceByUserId,
  getAllPerformance,
  updatePerformance,
  deletePerformance,
  getPerformanceStats
};