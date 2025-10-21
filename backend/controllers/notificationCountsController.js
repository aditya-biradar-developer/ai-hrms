const { supabase } = require('../config/db');

/**
 * Get notification counts for all sections
 * Returns count of pending/action-required items per module
 */
const getNotificationCounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
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
    
    // PAYROLL: Count draft/pending payroll records (Admin/HR only)
    if (['admin', 'hr'].includes(userRole)) {
      const { data: payrollData } = await supabase
        .from('payroll')
        .select('id')
        .in('status', ['draft', 'pending']);
      
      counts.payroll = payrollData?.length || 0;
    }
    
    // PERFORMANCE: Count pending reviews
    if (['admin', 'hr', 'manager'].includes(userRole)) {
      // Reviews pending completion
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
    
    // ATTENDANCE: Count today's unmarked attendance (for all employees)
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
    
    // INTERVIEWS: Count upcoming interviews (Admin/HR/Manager)
    if (['admin', 'hr', 'manager'].includes(userRole)) {
      const today = new Date().toISOString().split('T')[0];
      
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
    console.error('❌ Error fetching notification counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification counts',
      error: error.message
    });
  }
};

module.exports = {
  getNotificationCounts
};
