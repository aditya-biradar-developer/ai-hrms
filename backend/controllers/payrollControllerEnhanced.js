const PayrollEnhanced = require('../models/PayrollEnhanced');
const NotificationHelper = require('../utils/notificationHelper');
const User = require('../models/User');

// ============================================================================
// PAYROLL CRUD OPERATIONS
// ============================================================================

// Create payroll record
const createPayroll = async (req, res) => {
  try {
    // Only admins and HR can create payroll
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and HR can create payroll records.'
      });
    }
    
    console.log('💰 Creating payroll record...');
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
    
    const { user_id, month, year, salary, bonus = 0 } = req.body;
    const { supabase } = require('../config/db');
    
    // Get attendance data for deduction calculation
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user_id)
      .gte('date', startDate)
      .lte('date', endDate);
    
    console.log('📅 Attendance query:', { user_id, startDate, endDate });
    console.log('📅 Attendance data fetched:', attendanceData?.length || 0, 'records');
    if (attendanceData && attendanceData.length > 0) {
      console.log('📝 Attendance details:', attendanceData.map(a => ({ date: a.date, status: a.status })));
    }
    
    // Calculate attendance-based deductions
    let attendanceDeductions = 0;
    if (attendanceData && attendanceData.length > 0) {
      const lateDays = attendanceData.filter(a => a.status === 'late').length;
      const absentDays = attendanceData.filter(a => a.status === 'absent').length;
      
      const workingDaysInMonth = 26;
      const perDaySalary = salary / workingDaysInMonth;
      
      attendanceDeductions = (lateDays * perDaySalary * 0.5) + (absentDays * perDaySalary);
      
      console.log('📊 Attendance deductions:', { lateDays, absentDays, deductions: attendanceDeductions.toFixed(2) });
    }
    
    // Get manual deductions from request body
    const taxDeduction = parseFloat(req.body.tax_deduction) || 0;
    const providentFund = parseFloat(req.body.provident_fund) || 0;
    const professionalTax = parseFloat(req.body.professional_tax) || 0;
    const insurance = parseFloat(req.body.insurance) || 0;
    const loanRepayment = parseFloat(req.body.loan_repayment) || 0;
    const advanceDeduction = parseFloat(req.body.advance_deduction) || 0;
    const otherDeductions = parseFloat(req.body.other_deductions) || 0;
    
    // Calculate total deductions (attendance + manual)
    const manualDeductions = taxDeduction + providentFund + professionalTax + insurance + 
                            loanRepayment + advanceDeduction + otherDeductions;
    const totalDeductions = attendanceDeductions + manualDeductions;
    
    console.log('💰 Deductions breakdown:', {
      attendance: attendanceDeductions.toFixed(2),
      manual: manualDeductions.toFixed(2),
      total: totalDeductions.toFixed(2)
    });
    
    // Calculate payroll values
    const grossSalary = salary + bonus;
    const finalTotalDeductions = Math.round(totalDeductions * 100) / 100;
    const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;
    
    // Prepare payroll data with calculated fields
    // DO NOT spread req.body to avoid overwriting calculated values
    const payrollData = {
      user_id,
      month,
      year,
      salary, // Total CTC
      bonus,
      // Manual deductions
      tax_deduction: taxDeduction,
      provident_fund: providentFund,
      professional_tax: professionalTax,
      insurance,
      loan_repayment: loanRepayment,
      advance_deduction: advanceDeduction,
      other_deductions: otherDeductions,
      // Calculated fields
      gross_salary: grossSalary,
      deductions: finalTotalDeductions,
      total_deductions: finalTotalDeductions,
      net_salary: netSalary,
      status: req.body.status || 'draft'
    };
    
    console.log('📤 Final payroll data:', {
      salary,
      bonus,
      grossSalary,
      attendanceDeductions,
      manualDeductions,
      finalTotalDeductions,
      netSalary
    });
    
    const payroll = await PayrollEnhanced.create(payrollData);
    
    console.log('✅ Payroll created:', payroll.id);
    
    // Verify what was actually saved in database
    const { data: verifyData } = await supabase
      .from('payroll')
      .select('*')
      .eq('id', payroll.id)
      .single();
    
    console.log('🔍 Verification - Database record:', {
      id: verifyData.id,
      salary: verifyData.salary,
      bonus: verifyData.bonus,
      gross_salary: verifyData.gross_salary,
      deductions: verifyData.deductions,
      total_deductions: verifyData.total_deductions,
      net_salary: verifyData.net_salary
    });
    
    // Get employee name and send notification
    const employee = await User.findById(payroll.user_id);
    if (employee) {
      await NotificationHelper.notifyNewPayroll(payroll, employee.name);
    }
    
    res.status(201).json({
      success: true,
      message: 'Payroll record created successfully',
      data: { payroll }
    });
  } catch (error) {
    console.error('❌ Payroll creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payroll record',
      error: error.message
    });
  }
};

// Get payroll by ID
const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    const payroll = await PayrollEnhanced.findById(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    // Users can only view their own payroll unless they're admin/HR
    if (!['admin', 'hr'].includes(req.user.role) && payroll.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { payroll }
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

// Get payroll by user ID
const getPayrollByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only view their own payroll unless they're admin/HR
    if (!['admin', 'hr'].includes(req.user.role) && userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const filters = {
      month: req.query.month ? parseInt(req.query.month) : null,
      year: req.query.year ? parseInt(req.query.year) : null,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };
    
    const payroll = await PayrollEnhanced.findByUserId(userId, filters);
    
    res.status(200).json({
      success: true,
      data: { payroll }
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

// Get all payroll (admin/HR/manager can view)
const getAllPayroll = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    
    console.log('📊 Getting payroll:', { role: userRole, userId });
    
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const filters = {
      month: req.query.month ? parseInt(req.query.month) : null,
      year: req.query.year ? parseInt(req.query.year) : null,
      status: req.query.status,
      department: req.query.department,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    };
    
    let payroll = await PayrollEnhanced.getAll(filters);
    
    // If manager, filter to only show payroll for their department
    if (userRole === 'manager') {
      const { supabase } = require('../config/db');
      const { data: manager } = await supabase
        .from('users')
        .select('department')
        .eq('id', userId)
        .single();
      
      const managerDept = manager?.department;
      
      console.log('👔 Manager filtering payroll:', {
        managerDept,
        totalRecords: payroll.length
      });
      
      // Filter payroll to only include employees from manager's department
      const { data: deptUsers } = await supabase
        .from('users')
        .select('id')
        .eq('department', managerDept);
      
      const deptUserIds = deptUsers?.map(u => u.id) || [];
      payroll = payroll.filter(p => deptUserIds.includes(p.user_id));
      
      console.log('✅ Filtered payroll records:', payroll.length);
    }
    
    res.status(200).json({
      success: true,
      data: { payroll }
    });
  } catch (error) {
    console.error('❌ Get payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update payroll
const updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only admins and HR can update payroll
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const payroll = await PayrollEnhanced.findById(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    const updatedPayroll = await PayrollEnhanced.update(id, req.body);
    
    // Log the change
    await PayrollEnhanced.logHistory(id, 'updated', req.user.id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Payroll updated successfully',
      data: { payroll: updatedPayroll }
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

// Recalculate payroll deductions based on current attendance
const recalculatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only admins and HR can recalculate
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const payroll = await PayrollEnhanced.findById(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    // Get attendance data for the payroll period
    const startDate = `${payroll.year}-${String(payroll.month).padStart(2, '0')}-01`;
    const endDate = new Date(payroll.year, payroll.month, 0).toISOString().split('T')[0];
    
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', payroll.user_id)
      .gte('date', startDate)
      .lte('date', endDate);
    
    // Recalculate deductions
    let deductions = 0;
    if (attendanceData && attendanceData.length > 0) {
      const lateDays = attendanceData.filter(a => a.status === 'late').length;
      const absentDays = attendanceData.filter(a => a.status === 'absent').length;
      
      const workingDaysInMonth = 26;
      const perDaySalary = payroll.salary / workingDaysInMonth;
      
      deductions = (lateDays * perDaySalary * 0.5) + (absentDays * perDaySalary);
    }
    
    // Update payroll with new deductions
    const grossSalary = payroll.salary + (payroll.bonus || 0);
    const netSalary = grossSalary - deductions;
    
    const updatedPayroll = await PayrollEnhanced.update(id, {
      deductions: Math.round(deductions * 100) / 100,
      gross_salary: grossSalary,
      total_deductions: Math.round(deductions * 100) / 100,
      net_salary: Math.round(netSalary * 100) / 100
    });
    
    console.log('🔄 Payroll recalculated:', { id, deductions, netSalary });
    
    res.status(200).json({
      success: true,
      message: 'Payroll deductions recalculated successfully',
      data: { payroll: updatedPayroll }
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

// Delete payroll
const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only admins can delete payroll
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can delete payroll records.'
      });
    }
    
    const payroll = await PayrollEnhanced.findById(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    await PayrollEnhanced.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Payroll deleted successfully'
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

// ============================================================================
// PAYROLL GENERATION & PROCESSING
// ============================================================================

// Generate payroll for a user
const generatePayroll = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const { userId, month, year, attendanceData } = req.body;
    
    console.log(`💰 Generating payroll for user ${userId}, ${month}/${year}`);
    
    const payroll = await PayrollEnhanced.generatePayroll(userId, month, year, attendanceData);
    
    console.log('✅ Payroll generated:', payroll.id);
    
    res.status(201).json({
      success: true,
      message: 'Payroll generated successfully',
      data: { payroll }
    });
  } catch (error) {
    console.error('❌ Payroll generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payroll',
      error: error.message
    });
  }
};

// Process payroll (mark as processed)
const processPayroll = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const { id } = req.params;
    
    const payroll = await PayrollEnhanced.processPayroll(id, req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Payroll processed successfully',
      data: { payroll }
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

// Mark payroll as paid
const markAsPaid = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const { id } = req.params;
    const { payment_date } = req.body;
    
    const payroll = await PayrollEnhanced.markAsPaid(id, payment_date, req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Payroll marked as paid',
      data: { payroll }
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

// ============================================================================
// SALARY STRUCTURE
// ============================================================================

// Get salary structure for user
const getSalaryStructure = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only view their own structure unless they're admin/HR
    if (!['admin', 'hr'].includes(req.user.role) && userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const structure = await PayrollEnhanced.getSalaryStructure(userId);
    
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: 'No active salary structure found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { structure }
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

// Create/Update salary structure
const upsertSalaryStructure = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const structure = await PayrollEnhanced.upsertSalaryStructure(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Salary structure saved successfully',
      data: { structure }
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

// ============================================================================
// STATISTICS & REPORTS
// ============================================================================

// Get payroll statistics
const getPayrollStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    
    console.log('📈 Getting payroll stats:', { role: userRole, userId, query: req.query });
    
    const filters = {
      // For admin/HR: don't filter by userId unless explicitly provided
      // For others: always filter by their own userId
      userId: ['admin', 'hr'].includes(userRole) ? req.query.userId : userId,
      month: req.query.month ? parseInt(req.query.month) : null,
      year: req.query.year ? parseInt(req.query.year) : null,
      status: req.query.status
    };
    
    console.log('🔍 Stats filters:', filters);
    
    let stats;
    
    if (['admin', 'hr'].includes(userRole)) {
      // Admin/HR can see all stats (userId will be null/undefined if not provided)
      stats = await PayrollEnhanced.getStats(filters);
      console.log('✅ Admin/HR stats calculated:', stats);
    } else if (userRole === 'manager') {
      // Manager sees team stats (department-based)
      const { supabase } = require('../config/db');
      const { data: manager } = await supabase
        .from('users')
        .select('department')
        .eq('id', userId)
        .single();
      
      const managerDept = manager?.department;
      
      console.log('👔 Manager getting team stats:', { managerDept });
      
      // Get all payroll for manager's department
      const { data: deptUsers } = await supabase
        .from('users')
        .select('id')
        .eq('department', managerDept);
      
      const deptUserIds = deptUsers?.map(u => u.id) || [];
      
      // Get stats for all team members
      const allPayroll = await PayrollEnhanced.getAll({
        month: filters.month,
        year: filters.year,
        status: filters.status,
        limit: 1000
      });
      
      // Filter to team members only
      const teamPayroll = allPayroll.filter(p => deptUserIds.includes(p.user_id));
      
      // Calculate stats from team payroll
      stats = {
        totalRecords: teamPayroll.length,
        totalGrossSalary: teamPayroll.reduce((sum, p) => sum + (p.gross_salary || 0), 0),
        totalDeductions: teamPayroll.reduce((sum, p) => sum + (p.total_deductions || 0), 0),
        totalNetSalary: teamPayroll.reduce((sum, p) => sum + (p.net_salary || 0), 0),
        totalBonus: teamPayroll.reduce((sum, p) => sum + (p.bonus || 0), 0),
        totalOvertime: teamPayroll.reduce((sum, p) => sum + (p.overtime_pay || 0), 0),
        statusBreakdown: {
          draft: teamPayroll.filter(p => p.status === 'draft').length,
          processed: teamPayroll.filter(p => p.status === 'processed').length,
          paid: teamPayroll.filter(p => p.status === 'paid').length,
          cancelled: teamPayroll.filter(p => p.status === 'cancelled').length
        }
      };
      
      console.log('✅ Manager team stats:', stats);
    } else {
      // Regular employees see only their own stats
      filters.userId = userId;
      stats = await PayrollEnhanced.getStats(filters);
    }
    
    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('❌ Get payroll stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get department-wise summary
const getDepartmentSummary = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }
    
    const summary = await PayrollEnhanced.getDepartmentSummary(parseInt(month), parseInt(year));
    
    res.status(200).json({
      success: true,
      data: { summary }
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

// Get payroll history
const getPayrollHistory = async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const { id } = req.params;
    const history = await PayrollEnhanced.getHistory(id);
    
    res.status(200).json({
      success: true,
      data: { history }
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

module.exports = {
  createPayroll,
  getPayrollById,
  getPayrollByUserId,
  getAllPayroll,
  updatePayroll,
  deletePayroll,
  recalculatePayroll,
  generatePayroll,
  processPayroll,
  markAsPaid,
  getSalaryStructure,
  upsertSalaryStructure,
  getPayrollStats,
  getDepartmentSummary,
  getPayrollHistory
};
