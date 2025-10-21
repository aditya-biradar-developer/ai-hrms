const Notification = require('../models/Notification');

// Get user notifications
exports.getUserNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const notifications = await Notification.findByUserId(req.user.id, limit, offset);
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Check if notification belongs to user
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedNotification = await Notification.markAsRead(id);
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: updatedNotification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Check if notification belongs to user
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Notification.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// Get notification counts by category
exports.getNotificationCounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { supabase } = require('../config/db');
    
    console.log('🔔 Fetching notification counts for:', { userId, userRole });
    
    const counts = {
      payroll: 0,
      performance: 0,
      leaves: 0,
      attendance: 0,
      applications: 0,
      users: 0,
      interviews: 0
    };
    
    // PAYROLL: Count draft/pending/processed payroll records (Admin/HR only)
    // Include 'processed' because they still need to be marked as paid
    if (['admin', 'hr'].includes(userRole)) {
      const { data: payrollData } = await supabase
        .from('payroll')
        .select('id')
        .in('status', ['draft', 'pending', 'processed']);
      
      counts.payroll = payrollData?.length || 0;
    }
    
    // PERFORMANCE: Count pending reviews
    if (['admin', 'hr', 'manager'].includes(userRole)) {
      const { data: reviewsData } = await supabase
        .from('performance_reviews')
        .select('id')
        .eq('status', 'pending');
      
      counts.performance = reviewsData?.length || 0;
    }
    
    // LEAVES: Count pending leave requests
    if (['admin', 'hr', 'manager'].includes(userRole)) {
      const { data: leavesData } = await supabase
        .from('leaves')
        .select('id')
        .eq('status', 'pending');
      
      counts.leaves = leavesData?.length || 0;
    } else {
      // For employees: show their pending leaves
      const { data: myLeaves } = await supabase
        .from('leaves')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending');
      
      counts.leaves = myLeaves?.length || 0;
    }
    
    // ATTENDANCE: Count today's unmarked attendance
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();
    
    // Only check attendance on weekdays (Monday-Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      if (['admin', 'hr', 'manager'].includes(userRole)) {
        // Count all employees without today's attendance
        const { data: allUsers } = await supabase
          .from('users')
          .select('id')
          .in('role', ['employee', 'manager', 'hr']);
        
        const { data: todayAttendance } = await supabase
          .from('attendance')
          .select('user_id')
          .eq('date', today);
        
        const markedUsers = new Set(todayAttendance?.map(a => a.user_id) || []);
        counts.attendance = (allUsers?.length || 0) - markedUsers.size;
      } else {
        // Check if employee has marked today's attendance
        const { data: myAttendance } = await supabase
          .from('attendance')
          .select('id')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle();
        
        counts.attendance = myAttendance ? 0 : 1;
      }
    }
    
    // APPLICATIONS: Count pending applications (Admin/HR only)
    if (['admin', 'hr'].includes(userRole)) {
      const { data: applicationsData } = await supabase
        .from('applications')
        .select('id')
        .eq('status', 'pending');
      
      counts.applications = applicationsData?.length || 0;
    }
    
    // INTERVIEWS: Count upcoming interviews (Admin/HR only)
    if (['admin', 'hr'].includes(userRole)) {
      const { data: interviewsData } = await supabase
        .from('applications')
        .select('id')
        .not('interview_date', 'is', null)
        .gte('interview_date', today);
      
      counts.interviews = interviewsData?.length || 0;
    }
    
    // USERS: Count inactive users needing attention (Admin only)
    if (userRole === 'admin') {
      const { data: usersData } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', false);
      
      counts.users = usersData?.length || 0;
    }
    
    console.log('✅ Notification counts:', counts);
    
    res.status(200).json({
      success: true,
      data: counts
    });
  } catch (error) {
    console.error('❌ Get notification counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification counts',
      error: error.message
    });
  }
};
