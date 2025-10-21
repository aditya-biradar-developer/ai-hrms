const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { parseISTDate, compareDates } = require('../utils/dateHelper');

// Create attendance record
const createAttendance = async (req, res) => {
  try {
    const attendanceData = {
      ...req.body,
      // If user is not admin, they can only mark their own attendance
      user_id: req.user.role === 'admin' ? req.body.user_id : req.user.id
    };
    
    // Check if employee has started working (check start_date)
    const userData = await User.findById(attendanceData.user_id);
    if (userData && userData.start_date) {
      const comparison = compareDates(attendanceData.date, userData.start_date);
      if (comparison < 0) {
        // Attendance date is before start date
        const startDate = new Date(userData.start_date);
        const formattedStartDate = startDate.toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        });
        return res.status(403).json({
          success: false,
          message: 'Not Yet Joined',
          error: `You cannot mark attendance before your joining date. Your employment starts on ${formattedStartDate}. Please wait until your start date to mark attendance.`
        });
      }
    }
    
    // Check if the date is a weekend (Saturday or Sunday)
    const selectedDate = parseISTDate(attendanceData.date);
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
      return res.status(400).json({
        success: false,
        message: 'Weekend - Holiday',
        error: `Today is ${dayName}. Attendance cannot be marked on weekends. Enjoy your day off! 🎉`
      });
    }
    
    // SECURITY: Employees can only mark attendance for today
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const selectedDateStr = attendanceData.date;
      
      if (selectedDateStr !== todayStr) {
        return res.status(403).json({
          success: false,
          message: 'Invalid date',
          error: 'You can only mark attendance for today. Past and future dates are not allowed.'
        });
      }
    }
    
    // Check if attendance already exists for this user and date
    const existingAttendance = await Attendance.findByUserId(
      attendanceData.user_id, 
      1000, 
      0, 
      attendanceData.date, 
      attendanceData.date
    );
    
    if (existingAttendance && existingAttendance.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked',
        error: `You have already marked attendance for ${new Date(attendanceData.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}. You cannot mark attendance twice for the same day.`
      });
    }
    
    const attendance = await Attendance.create(attendanceData);
    
    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: {
        attendance
      }
    });
  } catch (error) {
    console.error(error);
    
    // Check for duplicate key error from database
    if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked',
        error: 'You have already marked attendance for this date. Please choose a different date.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get attendance by ID
const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findById(id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    // Users can only view their own attendance unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== attendance.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        attendance
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

// Get attendance by user ID
const getAttendanceByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, offset = 0, startDate, endDate } = req.query;
    
    // Users can only view their own attendance unless they're admin, HR, or manager
    const canViewAnyUser = ['admin', 'hr', 'manager'].includes(req.user.role);
    if (!canViewAnyUser && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const attendance = await Attendance.findByUserId(userId, limit, offset, startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: {
        attendance
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

// Get all attendance (for admin, hr, manager)
const getAllAttendance = async (req, res) => {
  try {
    const { limit = 100, offset = 0, startDate, endDate } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    // SECURITY: Only Admin, HR, and Manager can view all attendance
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employees can only view their own attendance.'
      });
    }
    
    let attendance = await Attendance.getAll(limit, offset, startDate, endDate);
    
    // SECURITY: Managers can only see attendance for their department
    if (userRole === 'manager') {
      const User = require('../models/User');
      const manager = await User.findById(userId);
      const managerDept = manager?.department;
      
      console.log('👔 Manager filtering attendance:', {
        managerDept,
        totalRecords: attendance.length
      });
      
      // Get all users in manager's department
      const deptUsers = await User.getAll();
      const deptUserIds = deptUsers
        .filter(u => u.department === managerDept && u.role === 'employee')
        .map(u => u.id);
      
      // Filter attendance to only show department employees
      attendance = attendance.filter(record => 
        deptUserIds.includes(record.user_id)
      );
      
      console.log('✅ Filtered department attendance:', attendance.length);
    }
    
    res.status(200).json({
      success: true,
      data: {
        attendance
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

// Update attendance
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findById(id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    // Only admins can update attendance
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedAttendance = await Attendance.update(id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: {
        attendance: updatedAttendance
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

// Delete attendance
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findById(id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    // Only admins can delete attendance
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Attendance.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Attendance deleted successfully'
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

// Get attendance statistics
const getAttendanceStats = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const userRole = req.user.role;
    const currentUserId = req.user.id;
    
    console.log('\n📊 ===== GETTING ATTENDANCE STATS =====');
    console.log('🔍 Request details:', {
      role: userRole,
      requestedUserId: userId,
      requestedUserIdType: typeof userId,
      currentUserId: currentUserId,
      startDate,
      endDate
    });
    
    // Determine target user ID based on role
    let targetUserId;
    
    if (['admin', 'hr', 'manager'].includes(userRole)) {
      console.log(`✅ User is ${userRole} - can view all stats`);
      // Admin/HR/Manager: If userId is explicitly 'null' or not provided, get all stats
      targetUserId = (userId === 'null' || !userId || userId === 'undefined') ? null : userId;
      console.log(`📌 Target userId set to: ${targetUserId || 'NULL (all users)'}`);
    } else {
      console.log(`👤 User is ${userRole} - can only view own stats`);
      // Regular users: Only their own stats
      if (userId && userId !== currentUserId) {
        console.log(`❌ Access denied - ${userRole} trying to view userId: ${userId}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      targetUserId = currentUserId;
      console.log(`📌 Target userId set to: ${targetUserId} (own stats)`);
    }
    
    console.log(`🔄 Calling Attendance.getStats with:`, { 
      targetUserId: targetUserId || 'NULL', 
      startDate, 
      endDate 
    });
    
    const stats = await Attendance.getStats(targetUserId, startDate, endDate);
    
    console.log('✅ Stats calculated successfully:', stats);
    console.log('📊 ===== END ATTENDANCE STATS =====\n');
    
    res.status(200).json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('❌ ===== GET ATTENDANCE STATS ERROR =====');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('❌ ===== END ERROR =====\n');
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Check-in (Clock In)
const checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
    
    // Check if today is a weekend
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
      return res.status(400).json({
        success: false,
        message: 'Weekend - Holiday',
        error: `Today is ${dayName}. No need to check in on weekends. Enjoy your day off! 🎉`
      });
    }
    
    // Check if already checked in today
    const existingAttendance = await Attendance.findByUserId(userId, 1, 0, todayStr, todayStr);
    
    if (existingAttendance && existingAttendance.length > 0) {
      const record = existingAttendance[0];
      if (record.check_in_time) {
        return res.status(400).json({
          success: false,
          message: 'Already checked in',
          error: `You already checked in today at ${record.check_in_time}`
        });
      }
    }
    
    // Create attendance record with check-in time
    const attendanceData = {
      user_id: userId,
      date: today,
      check_in_time: currentTime,
      status: 'present' // Will be auto-updated by trigger if late
    };
    
    const attendance = await Attendance.create(attendanceData);
    
    res.status(201).json({
      success: true,
      message: attendance.is_late 
        ? `Checked in successfully (Late by ${attendance.late_by_minutes} minutes)`
        : 'Checked in successfully',
      data: { attendance }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Check-out (Clock Out)
const checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    
    // Find today's attendance record
    const existingAttendance = await Attendance.findByUserId(userId, 1, 0, today, today);
    
    if (!existingAttendance || existingAttendance.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No check-in found',
        error: 'You must check in before checking out'
      });
    }
    
    const record = existingAttendance[0];
    
    if (!record.check_in_time) {
      return res.status(400).json({
        success: false,
        message: 'No check-in found',
        error: 'You must check in before checking out'
      });
    }
    
    if (record.check_out_time) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out',
        error: `You already checked out today at ${record.check_out_time}`
      });
    }
    
    // Update with check-out time
    const updated = await Attendance.update(record.id, {
      check_out_time: currentTime
    });
    
    res.status(200).json({
      success: true,
      message: updated.overtime_minutes > 0
        ? `Checked out successfully (${updated.overtime_minutes} minutes overtime)`
        : 'Checked out successfully',
      data: { attendance: updated }
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get today's attendance status
const getTodayStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await Attendance.findByUserId(userId, 1, 0, today, today);
    
    if (!attendance || attendance.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          hasCheckedIn: false,
          hasCheckedOut: false,
          attendance: null
        }
      });
    }
    
    const record = attendance[0];
    
    res.status(200).json({
      success: true,
      data: {
        hasCheckedIn: !!record.check_in_time,
        hasCheckedOut: !!record.check_out_time,
        attendance: record
      }
    });
  } catch (error) {
    console.error('Get today status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
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
};