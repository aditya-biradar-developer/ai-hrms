const express = require('express');
const { authenticate } = require('../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get dashboard data based on user role
router.get('/', dashboardController.getDashboard);

// Legacy route - keeping for backwards compatibility
router.get('/legacy', async (req, res) => {
  const { supabase } = require('../config/db');
  try {
    const { role, id, department } = req.user;
    let dashboardData = {};

    switch (role) {
      case 'admin':
        // Admin Dashboard: Company metrics
        const { data: totalEmployees } = await supabase
          .from('users')
          .select('id', { count: 'exact' })
          .neq('role', 'candidate');
        
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('status')
          .eq('date', new Date().toISOString().split('T')[0]);
        
        const presentToday = attendanceData?.filter(a => a.status === 'present').length || 0;
        const attendancePercentage = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0;
        
        const { data: payrollData } = await supabase
          .from('payroll')
          .select('salary, bonus, deductions')
          .eq('month', new Date().getMonth() + 1)
          .eq('year', new Date().getFullYear());
        
        const totalPayroll = payrollData?.reduce((sum, p) => sum + p.salary + (p.bonus || 0) - (p.deductions || 0), 0) || 0;
        
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id', { count: 'exact' });
        
        const { data: applicationsData } = await supabase
          .from('applications')
          .select('id', { count: 'exact' });
        
        dashboardData = {
          totalEmployees: totalEmployees || 0,
          attendancePercentage: attendancePercentage.toFixed(2),
          totalPayroll,
          totalJobs: jobsData || 0,
          totalApplications: applicationsData || 0
        };
        break;
        
      case 'manager':
        // Manager Dashboard: Team metrics
        const { data: teamMembers } = await supabase
          .from('users')
          .select('id')
          .eq('department', department)
          .neq('role', 'candidate');
        
        const teamMemberIds = teamMembers?.map(m => m.id) || [];
        
        const { data: teamAttendance } = await supabase
          .from('attendance')
          .select('status, user_id')
          .eq('date', new Date().toISOString().split('T')[0])
          .in('user_id', teamMemberIds);
        
        const teamPresentToday = teamAttendance?.filter(a => a.status === 'present').length || 0;
        const teamAttendancePercentage = teamMembers.length > 0 ? (teamPresentToday / teamMembers.length) * 100 : 0;
        
        const { data: teamPerformance } = await supabase
          .from('performance')
          .select('rating, user_id')
          .in('user_id', teamMemberIds)
          .order('review_date', { ascending: false });
        
        const latestPerformance = {};
        teamPerformance?.forEach(p => {
          if (!latestPerformance[p.user_id]) {
            latestPerformance[p.user_id] = p.rating;
          }
        });
        
        const performanceRatings = Object.values(latestPerformance);
        const avgPerformance = performanceRatings.length > 0 
          ? performanceRatings.reduce((sum, r) => sum + r, 0) / performanceRatings.length 
          : 0;
        
        dashboardData = {
          teamSize: teamMembers.length,
          attendancePercentage: teamAttendancePercentage.toFixed(2),
          averagePerformance: avgPerformance.toFixed(2)
        };
        break;
        
      case 'hr':
        // HR Dashboard: Recruitment metrics
        const { data: hrJobsData } = await supabase
          .from('jobs')
          .select('id', { count: 'exact' });
        
        const { data: hrApplicationsData } = await supabase
          .from('applications')
          .select('status');
        
        const applicationStats = {
          pending: hrApplicationsData?.filter(a => a.status === 'pending').length || 0,
          reviewed: hrApplicationsData?.filter(a => a.status === 'reviewed').length || 0,
          shortlisted: hrApplicationsData?.filter(a => a.status === 'shortlisted').length || 0,
          rejected: hrApplicationsData?.filter(a => a.status === 'rejected').length || 0,
          hired: hrApplicationsData?.filter(a => a.status === 'hired').length || 0
        };
        
        dashboardData = {
          totalJobs: hrJobsData || 0,
          totalApplications: hrApplicationsData?.length || 0,
          applicationStats
        };
        break;
        
      case 'employee':
        // Employee Dashboard: Personal metrics
        const { data: empAttendance } = await supabase
          .from('attendance')
          .select('status, date')
          .eq('user_id', id)
          .order('date', { ascending: false })
          .limit(30);
        
        const presentDays = empAttendance?.filter(a => a.status === 'present').length || 0;
        const totalDays = empAttendance?.length || 1;
        const empAttendancePercentage = (presentDays / totalDays) * 100;
        
        const { data: empPayroll } = await supabase
          .from('payroll')
          .select('salary, bonus, deductions, month, year')
          .eq('user_id', id)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1);
        
        const { data: empPerformance } = await supabase
          .from('performance')
          .select('rating, feedback, review_date')
          .eq('user_id', id)
          .order('review_date', { ascending: false })
          .limit(1);
        
        dashboardData = {
          attendancePercentage: empAttendancePercentage.toFixed(2),
          latestPayroll: empPayroll?.[0] || null,
          latestPerformance: empPerformance?.[0] || null
        };
        break;
        
      case 'candidate':
        // Candidate Dashboard: Application metrics
        const { data: candidateApplications } = await supabase
          .from('applications')
          .select('status, job_id, created_at')
          .eq('candidate_id', id)
          .order('created_at', { ascending: false });
        
        const applicationStatusCount = {
          pending: candidateApplications?.filter(a => a.status === 'pending').length || 0,
          reviewed: candidateApplications?.filter(a => a.status === 'reviewed').length || 0,
          shortlisted: candidateApplications?.filter(a => a.status === 'shortlisted').length || 0,
          rejected: candidateApplications?.filter(a => a.status === 'rejected').length || 0,
          hired: candidateApplications?.filter(a => a.status === 'hired').length || 0
        };
        
        const { data: availableJobs } = await supabase
          .from('jobs')
          .select('id', { count: 'exact' });
        
        dashboardData = {
          totalApplications: candidateApplications?.length || 0,
          applicationStatusCount,
          availableJobs: availableJobs || 0
        };
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user role'
        });
    }
    
    res.status(200).json({
      success: true,
      data: {
        dashboardData
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
});

module.exports = router;