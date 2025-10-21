const Payroll = require('../models/Payroll');
const { supabase } = require('../config/db');

// Create payroll record with automatic deductions
const createPayroll = async (req, res) => {
  try {
    // Admin and HR can create payroll records
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin and HR can create payroll.'
      });
    }
    
    const { 
      user_id, 
      month, 
      year, 
      salary, 
      bonus = 0,
      tax_deduction = 0,
      provident_fund = 0,
      professional_tax = 0,
      insurance = 0,
      loan_repayment = 0,
      advance_deduction = 0,
      other_deductions = 0
    } = req.body;
    
    console.log('💰 Creating payroll:', { user_id, month, year, salary, bonus });
    
    // Get the target user's role
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('role, name, email')
      .eq('id', user_id)
      .single();
    
    if (userError || !targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // INDUSTRY STANDARD: Segregation of Duties
    // HR cannot create payroll for themselves or other HR/Admin (conflict of interest)
    // Only Admin can create payroll for HR/Admin roles
    if (req.user.role === 'hr') {
      if (user_id === req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'HR cannot create their own payroll. Please contact Admin.'
        });
      }
      
      if (['hr', 'admin'].includes(targetUser.role)) {
        return res.status(403).json({
          success: false,
          message: 'HR cannot create payroll for HR or Admin roles. Only Admin can do this.'
        });
      }
    }
    
    console.log('✅ Authorization passed. Creating payroll for:', targetUser.name);
    
    // Get user's attendance data for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
    
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user_id)
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (attendanceError) {
      console.error(' Error fetching attendance:', attendanceError);
    }
    
    // Calculate deductions based on industry standards
    let attendanceDeductions = 0;
    let deductionDetails = [];
    
    if (attendanceData && attendanceData.length > 0) {
      // Count late days and absent days
      const lateDays = attendanceData.filter(a => a.status === 'late').length;
      const absentDays = attendanceData.filter(a => a.status === 'absent').length;
      
      // Industry Standard Deductions:
      // 1. Late: Deduct 0.5 day salary per late day (half day)
      // 2. Absent: Deduct 1 day salary per absent day (full day)
      // 3. Leave (unpaid): Already handled separately
      
      const workingDaysInMonth = 26; // Standard working days
      const perDaySalary = salary / workingDaysInMonth; // Use salary from request
      
      // Late deduction (0.5 day per late)
      const lateDeduction = lateDays * (perDaySalary * 0.5);
      if (lateDays > 0) {
        deductionDetails.push(`Late (${lateDays} days): ${lateDeduction.toFixed(2)}`);
        attendanceDeductions += lateDeduction;
      }
      
      // Absent deduction (1 day per absent)
      const absentDeduction = absentDays * perDaySalary;
      if (absentDays > 0) {
        deductionDetails.push(`Absent (${absentDays} days): ${absentDeduction.toFixed(2)}`);
        attendanceDeductions += absentDeduction;
      }
      
      console.log('📅 Attendance summary:', {
        lateDays,
        absentDays,
        perDaySalary: perDaySalary.toFixed(2),
        attendanceDeductions: attendanceDeductions.toFixed(2)
      });
    }
    
    // Calculate total deductions (attendance + statutory + others)
    const totalDeductions = attendanceDeductions + 
                           (tax_deduction || 0) +
                           (provident_fund || 0) +
                           (professional_tax || 0) +
                           (insurance || 0) +
                           (loan_repayment || 0) +
                           (advance_deduction || 0) +
                           (other_deductions || 0);
    
    // Calculate net salary
    // Note: Allowances (HRA, Transport, Medical) are typically part of salary in CTC
    const grossSalary = salary + bonus;
    const netSalary = grossSalary - totalDeductions;
    
    console.log('💰 Calculated values:', {
      grossSalary,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100
    });
    
    // Save to all relevant fields for compatibility
    const payrollData = {
      user_id,
      month,
      year,
      salary, // Total CTC including all allowances
      bonus: bonus || 0,
      deductions: Math.round(totalDeductions * 100) / 100, // Legacy field
      gross_salary: grossSalary, // For stats calculation
      total_deductions: Math.round(totalDeductions * 100) / 100, // For stats calculation
      net_salary: Math.round(netSalary * 100) / 100, // For stats calculation
      // Include individual deduction fields for detailed breakdown
      tax_deduction: tax_deduction || 0,
      provident_fund: provident_fund || 0,
      professional_tax: professional_tax || 0,
      insurance: insurance || 0,
      loan_repayment: loan_repayment || 0,
      advance_deduction: advance_deduction || 0,
      other_deductions: other_deductions || 0,
      status: 'pending'
    };
    
    const payroll = await Payroll.create(payrollData);
    
    res.status(201).json({
      success: true,
      message: 'Payroll record created successfully',
      data: {
        payroll
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

// Get payroll by ID
const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findById(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    // Users can only view their own payroll unless they're admin/HR
    if (!['admin', 'hr'].includes(req.user.role) && req.user.id !== payroll.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        payroll
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

// Get payroll by user ID
const getPayrollByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Users can only view their own payroll unless they're admin/HR
    if (!['admin', 'hr'].includes(req.user.role) && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const payroll = await Payroll.findByUserId(userId, limit, offset);
    
    res.status(200).json({
      success: true,
      data: {
        payroll
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

// Get all payroll (for admin)
const getAllPayroll = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    // Only admins and HR can view all payroll
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const payroll = await Payroll.getAll(limit, offset);
    
    res.status(200).json({
      success: true,
      data: {
        payroll
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

// Update payroll
const updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findById(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    // Only admins can update payroll
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedPayroll = await Payroll.update(id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Payroll updated successfully',
      data: {
        payroll: updatedPayroll
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

// Delete payroll
const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findById(id);
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    // Only admins can delete payroll
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Payroll.delete(id);
    
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

// Get payroll statistics
const getPayrollStats = async (req, res) => {
  try {
    console.log('=== PAYROLL STATS FUNCTION CALLED ===');
    const { userId, month, year } = req.query;
    
    console.log('Stats request params:', { userId, month, year, role: req.user.role });
    
    // Admin and HR can view all stats (no userId filter)
    // Others can only view their own stats
    let targetUserId = null;
    
    if (req.user.role === 'admin' || req.user.role === 'hr') {
      // Admin/HR: if userId provided, filter by it; otherwise show all
      targetUserId = userId || null;
    } else {
      // Employee/Manager: can only view their own
      targetUserId = req.user.id;
    }
    
    console.log('📊 Fetching stats for userId:', targetUserId || 'ALL');
    
    const stats = await Payroll.getStats(targetUserId, month, year);
    
    console.log('📊 Calculated stats:', stats);
    
    res.status(200).json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
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
  getPayrollStats
};