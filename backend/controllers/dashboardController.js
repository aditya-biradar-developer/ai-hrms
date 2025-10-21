const { supabase } = require('../config/db');

// Get admin dashboard data
exports.getAdminDashboard = async (req, res) => {
  try {
    console.log('📊 Fetching admin dashboard data...');

    // Get total employees
    const { count: totalEmployees } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'candidate');

    // Get attendance stats for current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('status')
      .gte('date', firstDay.toISOString().split('T')[0])
      .lte('date', lastDay.toISOString().split('T')[0]);

    const totalAttendance = attendanceData?.length || 0;
    const presentCount = attendanceData?.filter(a => a.status === 'present').length || 0;
    const attendancePercentage = totalAttendance > 0 
      ? ((presentCount / totalAttendance) * 100).toFixed(1) 
      : 0;

    // Get payroll stats for current month
    const { data: payrollData } = await supabase
      .from('payroll')
      .select('net_salary')
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .eq('status', 'paid');

    const totalPayroll = payrollData?.reduce((sum, p) => sum + (p.net_salary || 0), 0) || 0;

    // Get open jobs count
    const { count: totalJobs } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    // Get total applications
    const { count: totalApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true });

    // Get department distribution
    const { data: users } = await supabase
      .from('users')
      .select('department')
      .neq('role', 'candidate');

    const departmentCounts = {};
    users?.forEach(user => {
      const dept = user.department || 'Unassigned';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    const departmentDistribution = Object.entries(departmentCounts).map(([name, value]) => ({
      name,
      value
    }));

    // Get application status breakdown
    const { data: applications } = await supabase
      .from('applications')
      .select('status');

    const statusCounts = {};
    applications?.forEach(app => {
      const status = app.status || 'pending';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const applicationStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));

    // Get weekly attendance (last 7 days)
    const weeklyAttendance = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const { data: dayAttendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', dateStr);

      const present = dayAttendance?.filter(a => a.status === 'present').length || 0;
      const absent = dayAttendance?.filter(a => a.status === 'absent').length || 0;
      const late = dayAttendance?.filter(a => a.status === 'late').length || 0;
      const on_leave = dayAttendance?.filter(a => a.status === 'on_leave').length || 0;

      weeklyAttendance.push({
        name: days[date.getDay()],
        present,
        absent,
        late,
        on_leave
      });
    }

    // Get TODAY's attendance
    const today = new Date().toISOString().split('T')[0];
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('date', today);

    const todayPresent = todayAttendance?.filter(a => a.status === 'present').length || 0;
    const todayLate = todayAttendance?.filter(a => a.status === 'late').length || 0;
    const todayAbsent = todayAttendance?.filter(a => a.status === 'absent').length || 0;

    // Get active employees (not candidates)
    const { count: activeEmployees } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'candidate')
      .eq('is_active', true);

    // Get average salary and pending payrolls
    const { data: allPayroll } = await supabase
      .from('payroll')
      .select('net_salary, status, salary')
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear());

    const avgSalary = allPayroll && allPayroll.length > 0
      ? allPayroll.reduce((sum, p) => sum + (p.salary || 0), 0) / allPayroll.length
      : 0;

    const pendingPayrolls = allPayroll?.filter(p => p.status === 'draft').length || 0;

    // Get performance data
    const { data: performanceData } = await supabase
      .from('performance')
      .select('overall_rating, user_id, created_at')
      .order('created_at', { ascending: false });

    const avgPerformance = performanceData && performanceData.length > 0
      ? performanceData.reduce((sum, p) => sum + (p.overall_rating || 0), 0) / performanceData.length
      : 0;

    const topPerformers = performanceData?.filter(p => p.overall_rating >= 4.5).slice(0, 5) || [];

    // Get pending reviews count (assuming reviews are pending if not completed)
    const { count: pendingReviews } = await supabase
      .from('performance')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    // Get new hires this month
    const { count: newHires } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('role', 'candidate')
      .gte('created_at', firstDay.toISOString())
      .lte('created_at', lastDay.toISOString());

    // Build action alerts
    const alerts = [];
    if (pendingPayrolls > 0) {
      alerts.push({ message: `${pendingPayrolls} payroll records need processing`, count: pendingPayrolls });
    }
    if (pendingReviews > 0) {
      alerts.push({ message: `${pendingReviews} performance reviews are overdue`, count: pendingReviews });
    }
    if (todayAbsent > 3) {
      alerts.push({ message: `${todayAbsent} employees absent today - check attendance`, count: todayAbsent });
    }
    if (attendancePercentage < 85) {
      alerts.push({ message: `Monthly attendance is low (${attendancePercentage}%) - action needed` });
    }

    const dashboardData = {
      totalEmployees: totalEmployees || 0,
      activeEmployees: activeEmployees || totalEmployees || 0,
      attendancePercentage: parseFloat(attendancePercentage),
      todayPresent,
      todayLate,
      todayAbsent,
      totalPayroll: totalPayroll,
      avgSalary: Math.round(avgSalary),
      pendingPayrolls,
      totalJobs: totalJobs || 0,
      totalApplications: totalApplications || 0,
      avgPerformance: parseFloat(avgPerformance.toFixed(1)),
      topPerformers,
      pendingReviews: pendingReviews || 0,
      newHires: newHires || 0,
      departmentDistribution,
      applicationStatus,
      weeklyAttendance,
      alerts
    };

    console.log('✅ Dashboard data fetched:', dashboardData);

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

// Get manager dashboard data
exports.getManagerDashboard = async (req, res) => {
  try {
    console.log('📊 Fetching manager dashboard data for user:', req.user.id);
    const managerId = req.user.id;

    // Get team members (users in the same department as manager)
    const { data: manager } = await supabase
      .from('users')
      .select('department')
      .eq('id', managerId)
      .single();

    const managerDept = manager?.department;

    // Get team size (employees in same department, excluding manager)
    const { data: teamMembers, count: teamSize } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('department', managerDept)
      .eq('role', 'employee');

    // Get team attendance for current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const teamUserIds = teamMembers?.map(m => m.id) || [];

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .in('user_id', teamUserIds)
      .gte('date', firstDay.toISOString().split('T')[0])
      .lte('date', lastDay.toISOString().split('T')[0]);

    const totalAttendance = attendanceData?.length || 0;
    const presentCount = attendanceData?.filter(a => a.status === 'present').length || 0;
    const attendancePercentage = totalAttendance > 0 
      ? ((presentCount / totalAttendance) * 100).toFixed(1) 
      : 0;

    // Get average performance (from performance table)
    console.log('📊 Fetching performance for team:', { teamUserIds, count: teamUserIds.length });
    
    const { data: performanceData, error: perfError } = await supabase
      .from('performance')
      .select('overall_rating')
      .in('user_id', teamUserIds);

    console.log('📈 Performance data:', {
      found: performanceData?.length || 0,
      data: performanceData,
      error: perfError
    });

    const avgPerformance = performanceData?.length > 0
      ? (performanceData.reduce((sum, p) => sum + (p.overall_rating || 0), 0) / performanceData.length).toFixed(1)
      : 0;
    
    console.log('✅ Average performance calculated:', avgPerformance);

    // Get weekly attendance (last 7 days) for team
    const weeklyAttendance = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const { data: dayAttendance } = await supabase
        .from('attendance')
        .select('status')
        .in('user_id', teamUserIds)
        .eq('date', dateStr);

      const present = dayAttendance?.filter(a => a.status === 'present').length || 0;
      const absent = dayAttendance?.filter(a => a.status === 'absent').length || 0;
      const late = dayAttendance?.filter(a => a.status === 'late').length || 0;
      const on_leave = dayAttendance?.filter(a => a.status === 'on_leave').length || 0;

      weeklyAttendance.push({
        name: days[date.getDay()],
        present,
        absent,
        late,
        on_leave
      });
    }

    // Filter out employees who haven't started yet
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startedEmployees = (teamMembers || []).filter(member => {
      if (!member.start_date) return true; // Include if no start date
      const startDate = new Date(member.start_date);
      startDate.setHours(0, 0, 0, 0);
      return startDate <= today; // Only include if started
    });
    
    console.log(`👥 Team members: ${teamMembers?.length || 0}, Started: ${startedEmployees.length}`);

    // Get team members with their stats
    const teamMembersWithStats = await Promise.all(
      startedEmployees.map(async (member) => {
        // Get attendance percentage
        const { data: memberAttendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('user_id', member.id)
          .gte('date', firstDay.toISOString().split('T')[0])
          .lte('date', lastDay.toISOString().split('T')[0]);

        const memberTotal = memberAttendance?.length || 0;
        const memberPresent = memberAttendance?.filter(a => a.status === 'present').length || 0;
        const attendance = memberTotal > 0 ? ((memberPresent / memberTotal) * 100).toFixed(0) : 0;

        // Get latest performance rating
        const { data: memberPerformance, error: memberPerfError } = await supabase
          .from('performance')
          .select('overall_rating')
          .eq('user_id', member.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const performance = memberPerformance?.[0]?.overall_rating || 0;
        
        console.log(`👤 ${member.name} performance:`, {
          found: memberPerformance?.length || 0,
          rating: performance,
          error: memberPerfError
        });

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          department: member.department,
          performance: parseFloat(performance),
          attendance: parseInt(attendance)
        };
      })
    );

    const dashboardData = {
      teamSize: teamSize || 0,
      attendancePercentage: parseFloat(attendancePercentage),
      averagePerformance: parseFloat(avgPerformance),
      weeklyAttendance,
      teamMembers: teamMembersWithStats
    };

    console.log('✅ Manager dashboard data fetched:', dashboardData);

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('❌ Manager dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch manager dashboard data',
      error: error.message
    });
  }
};

// Get HR dashboard data
exports.getHRDashboard = async (req, res) => {
  try {
    const { jobId, department } = req.query;
    console.log('📊 Fetching HR dashboard data with filters:', { jobId, department });

    // Get total jobs - only count positions that are not fully filled
    let jobsQuery = supabase
      .from('jobs')
      .select('*');
    
    // Apply department filter if provided
    if (department && department !== 'all') {
      jobsQuery = jobsQuery.eq('department', department);
    }
    
    const { data: jobs, error: jobsError } = await jobsQuery;
    
    if (jobsError) {
      console.error('❌ Error fetching jobs:', jobsError);
      throw jobsError;
    }
    
    // Count only jobs that are open AND have unfilled positions
    const totalJobs = jobs?.filter(job => 
      job.status === 'open' && 
      job.filled_positions < job.vacancies
    ).length || 0;

    // Get total applications with filters
    let applicationsQuery = supabase
      .from('applications')
      .select('*', { count: 'exact' });
    
    // Apply jobId filter if provided
    if (jobId && jobId !== 'all') {
      applicationsQuery = applicationsQuery.eq('job_id', jobId);
    }
    
    // If department filter is provided, we need to filter by jobs in that department
    if (department && department !== 'all') {
      const jobIdsInDept = jobs?.map(j => j.id) || [];
      if (jobIdsInDept.length > 0) {
        applicationsQuery = applicationsQuery.in('job_id', jobIdsInDept);
      } else {
        // No jobs in department, return empty results
        applicationsQuery = applicationsQuery.eq('job_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    
    const { data: applications, count: totalApplications } = await applicationsQuery;

    // Get application stats by status
    const applicationStats = {
      pending: applications?.filter(a => a.status === 'pending').length || 0,
      reviewed: applications?.filter(a => a.status === 'reviewed').length || 0,
      shortlisted: applications?.filter(a => a.status === 'shortlisted').length || 0,
      rejected: applications?.filter(a => a.status === 'rejected').length || 0,
      hired: applications?.filter(a => a.status === 'hired').length || 0
    };

    // Get recent applications (last 10) with candidate names - apply same filters
    let recentAppsQuery = supabase
      .from('applications')
      .select(`
        *,
        jobs (
          title,
          department
        ),
        candidate:users!applications_candidate_id_fkey (
          id,
          name,
          email
        )
      `);
    
    // Apply jobId filter if provided
    if (jobId && jobId !== 'all') {
      recentAppsQuery = recentAppsQuery.eq('job_id', jobId);
    }
    
    // Apply department filter if provided
    if (department && department !== 'all') {
      const jobIdsInDept = jobs?.map(j => j.id) || [];
      if (jobIdsInDept.length > 0) {
        recentAppsQuery = recentAppsQuery.in('job_id', jobIdsInDept);
      } else {
        recentAppsQuery = recentAppsQuery.eq('job_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    
    const { data: recentApplications } = await recentAppsQuery
      .order('created_at', { ascending: false })
      .limit(10);

    // Get jobs by department
    const jobsByDepartment = {};
    jobs?.forEach(job => {
      const dept = job.department || 'Other';
      if (!jobsByDepartment[dept]) {
        jobsByDepartment[dept] = { open: 0, filled: 0 };
      }
      if (job.status === 'open') {
        jobsByDepartment[dept].open++;
      } else if (job.status === 'closed') {
        jobsByDepartment[dept].filled++;
      }
    });

    const jobsByDepartmentData = Object.keys(jobsByDepartment).map(dept => ({
      name: dept,
      open: jobsByDepartment[dept].open,
      filled: jobsByDepartment[dept].filled
    }));

    // Get application funnel data
    const applicationFunnelData = [
      { name: 'Applied', value: totalApplications || 0, color: '#8884d8' },
      { name: 'Reviewed', value: applicationStats.reviewed + applicationStats.shortlisted + applicationStats.hired, color: '#82ca9d' },
      { name: 'Shortlisted', value: applicationStats.shortlisted + applicationStats.hired, color: '#ffc658' },
      { name: 'Hired', value: applicationStats.hired, color: '#0088fe' },
      { name: 'Rejected', value: applicationStats.rejected || 0, color: '#ef4444' }
    ];

    const dashboardData = {
      totalJobs: totalJobs || 0,
      totalApplications: totalApplications || 0,
      applicationStats,
      recentApplications: recentApplications || [],
      jobsByDepartmentData,
      applicationFunnelData
    };

    console.log('✅ HR dashboard data fetched:', dashboardData);

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('❌ HR dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch HR dashboard data',
      error: error.message
    });
  }
};

// Get candidate dashboard data
exports.getCandidateDashboard = async (req, res) => {
  try {
    console.log('📊 Fetching candidate dashboard data for user:', req.user.id);
    const candidateId = req.user.id;

    // Get candidate's applications
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select('*')
      .eq('candidate_id', candidateId);

    if (appsError) {
      console.error('❌ Error fetching applications:', appsError);
      throw appsError;
    }

    console.log('📋 Found applications:', applications?.length || 0);
    console.log('Applications data:', applications);

    // Count applications by status
    const applicationStatusCount = {
      pending: applications?.filter(a => a.status === 'pending').length || 0,
      reviewed: applications?.filter(a => a.status === 'reviewed').length || 0,
      shortlisted: applications?.filter(a => a.status === 'shortlisted').length || 0,
      rejected: applications?.filter(a => a.status === 'rejected').length || 0,
      hired: applications?.filter(a => a.status === 'hired').length || 0
    };

    console.log('📊 Status breakdown:', applicationStatusCount);

    // Get total available jobs
    const { count: availableJobs } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    // Get my recent applications with interview details
    const { data: myApplications, error: myAppsError } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        interview_date,
        interview_time,
        interview_location,
        interview_notes,
        jobs (
          title,
          department,
          location
        )
      `)
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (myAppsError) throw myAppsError;

    // Get recommended jobs (open jobs with full details)
    const { data: recommendedJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .limit(5);

    if (jobsError) throw jobsError;

    console.log('✅ Candidate dashboard data fetched successfully');

    res.status(200).json({
      success: true,
      data: {
        totalApplications: applications?.length || 0,
        applicationStatusCount,
        availableJobs: availableJobs || 0,
        myApplications: myApplications || [],
        recommendedJobs: recommendedJobs || []
      }
    });
  } catch (error) {
    console.error('❌ Candidate dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get employee dashboard data
exports.getEmployeeDashboard = async (req, res) => {
  try {
    console.log('📊 Fetching employee dashboard data for user:', req.user.id);
    const employeeId = req.user.id;

    // Get employee's own attendance
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('status')
      .eq('user_id', employeeId)
      .gte('date', firstDay.toISOString().split('T')[0])
      .lte('date', lastDay.toISOString().split('T')[0]);

    const totalDays = attendanceData?.length || 0;
    const presentDays = attendanceData?.filter(a => a.status === 'present').length || 0;
    const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

    // Get employee's leaves
    const { data: leaves } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', employeeId);

    const pendingLeaves = leaves?.filter(l => l.status === 'pending').length || 0;
    const approvedLeaves = leaves?.filter(l => l.status === 'approved').length || 0;

    // Get latest leave request
    const { data: latestLeave } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(1);

    // Get employee's latest performance review
    const { data: performance } = await supabase
      .from('performance')
      .select('overall_rating, review_period_start, review_period_end, achievements, areas_of_improvement, manager_comments')
      .eq('user_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(1);

    // Get all performance reviews to calculate average rating
    const { data: allPerformance } = await supabase
      .from('performance')
      .select('overall_rating')
      .eq('user_id', employeeId)
      .not('overall_rating', 'is', null);

    const averageRating = allPerformance && allPerformance.length > 0
      ? (allPerformance.reduce((sum, p) => sum + (p.overall_rating || 0), 0) / allPerformance.length).toFixed(1)
      : 0;
    
    const totalReviews = allPerformance?.length || 0;

    // Get employee's latest payslip
    const { data: payslip } = await supabase
      .from('payroll')
      .select('net_salary, month, year')
      .eq('user_id', employeeId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1);

    const dashboardData = {
      attendancePercentage: parseFloat(attendancePercentage),
      totalDays,
      presentDays,
      pendingLeaves,
      approvedLeaves,
      latestLeave: latestLeave?.[0] || null,
      latestPerformance: performance?.[0] || null,
      averagePerformanceRating: parseFloat(averageRating),
      totalPerformanceReviews: totalReviews,
      latestPayslip: payslip?.[0] || null
    };

    console.log('✅ Employee dashboard data fetched:', dashboardData);

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('❌ Employee dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee dashboard data',
      error: error.message
    });
  }
};

// Get dashboard data based on role
exports.getDashboard = async (req, res) => {
  try {
    console.log('📊 Dashboard request from user:', req.user.role);
    const userRole = req.user.role;

    if (userRole === 'admin') {
      return exports.getAdminDashboard(req, res);
    } else if (userRole === 'hr') {
      return exports.getHRDashboard(req, res);
    } else if (userRole === 'manager') {
      return exports.getManagerDashboard(req, res);
    } else if (userRole === 'candidate') {
      return exports.getCandidateDashboard(req, res);
    } else if (userRole === 'employee') {
      return exports.getEmployeeDashboard(req, res);
    }
    
    // SECURITY: No default fallback - deny access
    return res.status(403).json({
      success: false,
      message: 'Access denied. Invalid role.'
    });
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};
