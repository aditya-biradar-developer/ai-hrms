import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { DollarSign, Download, Calendar, TrendingUp, Plus, Edit, Users, CheckCircle, Wallet, FileText, Eye, X, Filter, Search } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
import { payrollService } from '../services/payrollService';
import { formatCurrency, formatDate } from '../utils/helpers';
import { MONTHS } from '../utils/constants';

const Payroll = () => {
  const { user } = useAuth();
  const { isAdmin, isHR, isManager } = useRole();
  const { refreshNotifications } = useNotifications();
  const canManage = isAdmin || isHR;
  const canView = isAdmin || isHR || isManager; // Manager can view (read-only)
  
  // Debug logging
  console.log('🔍 Payroll Debug:', {
    user: user,
    userRole: user?.role,
    isAdmin: isAdmin,
    isHR: isHR,
    isManager: isManager,
    canManage: canManage,
    canView: canView
  });
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [totalStats, setTotalStats] = useState({
    totalRecords: 0,
    totalGrossSalary: 0,
    totalDeductions: 0,
    totalNetSalary: 0,
    totalBonus: 0,
    totalOvertime: 0,
    statusBreakdown: { draft: 0, processed: 0, paid: 0, cancelled: 0 }
  });
  const [viewingPayroll, setViewingPayroll] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSalaryStructureModal, setShowSalaryStructureModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [attendancePreview, setAttendancePreview] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [editData, setEditData] = useState({
    salary: 0,
    bonus: 0,
    provident_fund: 0,
    professional_tax: 0,
    other_deductions: 0
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Company Standard Defaults (Industry Standard)
  const COMPANY_DEFAULTS = {
    working_days: 26, // Standard working days per month
    provident_fund_percent: 12, // 12% of basic salary (EPF standard)
    professional_tax: 200, // Standard professional tax
    hra_percent: 40, // 40% of basic salary (standard HRA)
    transport_allowance: 1600, // Standard transport allowance
    medical_allowance: 1250, // Standard medical allowance
  };

  const [formData, setFormData] = useState({
    user_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    base_salary: 0, // This is what backend expects
    bonus: 0,
    allowances: 0,
    // These are for display/calculation only
    basic_salary: 0,
    hra: 0,
    transport_allowance: COMPANY_DEFAULTS.transport_allowance,
    medical_allowance: COMPANY_DEFAULTS.medical_allowance,
    special_allowance: 0,
    overtime_pay: 0,
    commission: 0,
    incentives: 0,
    tax_deduction: 0,
    provident_fund: 0,
    professional_tax: COMPANY_DEFAULTS.professional_tax,
    insurance: 0,
    loan_repayment: 0,
    advance_deduction: 0,
    other_deductions: 0,
    working_days: COMPANY_DEFAULTS.working_days,
    present_days: COMPANY_DEFAULTS.working_days,
    absent_days: 0,
    paid_leaves: 0,
    unpaid_leaves: 0,
    overtime_hours: 0,
    status: 'draft',
    notes: ''
  });
  
  const [salaryStructureForm, setSalaryStructureForm] = useState({
    user_id: '',
    effective_from: new Date().toISOString().split('T')[0],
    basic_salary: 0,
    hra: 0,
    transport_allowance: 0,
    medical_allowance: 0,
    special_allowance: 0,
    provident_fund_percent: 12,
    professional_tax: 0,
    insurance: 0,
    annual_ctc: 0,
    monthly_ctc: 0,
    notes: ''
  });

  useEffect(() => {
    fetchPayroll();
    fetchStats();
    fetchUsers(); // Always fetch users to display names in table
  }, [selectedMonth, selectedYear]);

  // Initialize editData when viewingPayroll changes
  useEffect(() => {
    if (viewingPayroll && editingPayroll) {
      setEditData({
        salary: viewingPayroll.salary || 0,
        bonus: viewingPayroll.bonus || 0,
        provident_fund: viewingPayroll.provident_fund || 0,
        professional_tax: viewingPayroll.professional_tax || 0,
        other_deductions: (viewingPayroll.tax_deduction || 0) + (viewingPayroll.insurance || 0) + (viewingPayroll.other_deductions || 0)
      });
    }
  }, [viewingPayroll, editingPayroll]);

  // Monitor users state
  useEffect(() => {
    console.log('👥 Users state updated:', users.length, 'users loaded');
  }, [users]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('👥 Fetching users...', { userRole: user?.role });
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const usersList = response.data.data.users || [];
      console.log('👥 Fetched users:', usersList.length, 'users');
      if (usersList.length > 0) {
        console.log('👥 All users:', usersList.map(u => ({ id: u.id, name: u.name, role: u.role })));
      }
      setUsers(usersList);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      // Admin/HR can see all, Manager/Employee see their own
      const userId = canView && !canManage ? user.id : (canManage ? null : user.id);
      const response = canView
        ? await payrollService.getAllPayroll({ month: selectedMonth, year: selectedYear, limit: 100 })
        : await payrollService.getPayrollByUserId(user.id, { month: selectedMonth, year: selectedYear, limit: 100 });
      
      console.log('📊 Full response:', response.data);
      console.log('📊 Fetched payroll:', response.data.payroll?.length, 'records');
      const payrollRecords = response.data.payroll || [];
      if (payrollRecords.length > 0) {
        console.log('📊 Payroll user_ids:', payrollRecords.map(p => p.user_id));
        console.log('📊 Current users in state:', users.map(u => u.id));
        console.log('📊 Sample payroll record:', payrollRecords[0]);
      } else {
        console.log('⚠️ No payroll records found');
      }
      setPayrollData(payrollRecords);
    } catch (error) {
      console.error('❌ Error fetching payroll:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Admin/HR: get all stats (no userId filter)
      // Employee/Manager: get their own stats
      const params = {
        month: selectedMonth,
        year: selectedYear
      };
      
      // Only add userId for non-admin/non-HR users
      if (!canManage) {
        params.userId = user.id;
      }
      
      console.log('📈 Fetching stats with params:', params);
      const response = await payrollService.getPayrollStats(params);
      console.log('📈 Fetched stats response:', response.data);
      const stats = response.data.data?.stats || response.data.stats || {};
      console.log('📈 Using stats:', stats);
      setTotalStats(stats);
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  // Fetch attendance data for deduction preview
  const fetchAttendancePreview = async (userId, month, year, salary) => {
    if (!userId || !month || !year || !salary) {
      setAttendancePreview(null);
      return;
    }

    try {
      setLoadingAttendance(true);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/attendance/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate }
      });

      const attendanceData = response.data.data?.attendance || [];
      
      // Calculate deductions
      const lateDays = attendanceData.filter(a => a.status === 'late').length;
      const absentDays = attendanceData.filter(a => a.status === 'absent').length;
      const presentDays = attendanceData.filter(a => a.status === 'present').length;
      
      const workingDaysInMonth = 26;
      const perDaySalary = salary / workingDaysInMonth;
      
      const lateDeduction = lateDays * (perDaySalary * 0.5);
      const absentDeduction = absentDays * perDaySalary;
      const totalDeduction = lateDeduction + absentDeduction;

      setAttendancePreview({
        presentDays,
        lateDays,
        absentDays,
        workingDays: workingDaysInMonth,
        perDaySalary,
        lateDeduction,
        absentDeduction,
        totalDeduction
      });
    } catch (error) {
      console.error('❌ Error fetching attendance:', error);
      setAttendancePreview(null);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Watch for changes in user_id, month, year, or salary to update attendance preview
  useEffect(() => {
    if (showAddModal && formData.user_id && formData.month && formData.year) {
      const totalSalary = (parseFloat(formData.basic_salary) || 0) +
                         (parseFloat(formData.hra) || 0) +
                         (parseFloat(formData.transport_allowance) || 0) +
                         (parseFloat(formData.medical_allowance) || 0) +
                         (parseFloat(formData.special_allowance) || 0);
      
      if (totalSalary > 0) {
        fetchAttendancePreview(formData.user_id, formData.month, formData.year, totalSalary);
      }
    } else {
      setAttendancePreview(null);
    }
  }, [formData.user_id, formData.month, formData.year, formData.basic_salary, formData.hra, formData.transport_allowance, formData.medical_allowance, formData.special_allowance, showAddModal]);

  const handleDownloadPayslip = (payroll) => {
    const payslipText = `
=====================================
     PAYSLIP FOR ${MONTHS[payroll.month - 1]} ${payroll.year}
=====================================

Employee: ${payroll.employee?.name || user.name || 'N/A'}
Department: ${payroll.employee?.department || 'N/A'}
Employee ID: ${payroll.user_id?.slice(0, 8)}

Pay Period: ${payroll.pay_period_start || 'N/A'} to ${payroll.pay_period_end || 'N/A'}
Payment Date: ${payroll.payment_date || 'Pending'}
Status: ${payroll.status?.toUpperCase() || 'DRAFT'}

-------------------------------------
EARNINGS
-------------------------------------
Basic Salary              ${formatCurrency(payroll.basic_salary || 0)}
House Rent Allowance      ${formatCurrency(payroll.hra || 0)}
Transport Allowance       ${formatCurrency(payroll.transport_allowance || 0)}
Medical Allowance         ${formatCurrency(payroll.medical_allowance || 0)}
Special Allowance         ${formatCurrency(payroll.special_allowance || 0)}
Overtime Pay              ${formatCurrency(payroll.overtime_pay || 0)}
Bonus                     ${formatCurrency(payroll.bonus || 0)}
Commission                ${formatCurrency(payroll.commission || 0)}
Incentives                ${formatCurrency(payroll.incentives || 0)}
-------------------------------------
GROSS SALARY              ${formatCurrency(payroll.gross_salary || 0)}

-------------------------------------
DEDUCTIONS
-------------------------------------
Provident Fund            ${formatCurrency(payroll.provident_fund || 0)}
Professional Tax          ${formatCurrency(payroll.professional_tax || 0)}
Tax Deduction (TDS)       ${formatCurrency(payroll.tax_deduction || 0)}
Insurance                 ${formatCurrency(payroll.insurance || 0)}
Loan Repayment            ${formatCurrency(payroll.loan_repayment || 0)}
Advance Deduction         ${formatCurrency(payroll.advance_deduction || 0)}
Other Deductions          ${formatCurrency(payroll.other_deductions || 0)}
-------------------------------------
TOTAL DEDUCTIONS          ${formatCurrency(payroll.total_deductions || 0)}

-------------------------------------
NET SALARY                ${formatCurrency(payroll.net_salary || 0)}
-------------------------------------

Attendance Summary:
Working Days: ${payroll.working_days || 0}
Present Days: ${payroll.present_days || 0}
Absent Days: ${payroll.absent_days || 0}
Paid Leaves: ${payroll.paid_leaves || 0}
Unpaid Leaves: ${payroll.unpaid_leaves || 0}
Overtime Hours: ${payroll.overtime_hours || 0}

${payroll.notes ? `\nNotes: ${payroll.notes}` : ''}

=====================================
This is a computer-generated payslip
Generated on: ${formatDate(new Date())}
=====================================
    `;
    
    const blob = new Blob([payslipText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip_${MONTHS[payroll.month - 1]}_${payroll.year}_${payroll.user_id?.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Auto-calculate allowances and deductions based on basic salary
  const handleBasicSalaryChange = (basicSalary) => {
    const basic = parseFloat(basicSalary) || 0;
    
    // Auto-calculate based on company standards
    const hra = Math.round(basic * (COMPANY_DEFAULTS.hra_percent / 100));
    const providentFund = Math.round(basic * (COMPANY_DEFAULTS.provident_fund_percent / 100));
    
    setFormData(prev => ({
      ...prev,
      basic_salary: basic,
      hra: hra,
      provident_fund: providentFund,
      base_salary: basic, // For backend
      allowances: hra + COMPANY_DEFAULTS.transport_allowance + COMPANY_DEFAULTS.medical_allowance
    }));
  };

  const handleSubmitPayroll = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Prepare data for backend (simplified)
      // Note: base_salary should include all allowances (HRA, Transport, Medical, etc.)
      // This is the CTC/Gross salary before deductions
      const totalSalary = (formData.basic_salary || 0) + 
                          (formData.hra || 0) + 
                          (formData.transport_allowance || 0) + 
                          (formData.medical_allowance || 0) + 
                          (formData.special_allowance || 0);
      
      const payrollData = {
        user_id: formData.user_id,
        month: formData.month,
        year: formData.year,
        salary: totalSalary, // Total salary including all allowances (using 'salary' column)
        bonus: formData.bonus || 0,
        // Include all deduction fields
        tax_deduction: formData.tax_deduction || 0,
        provident_fund: formData.provident_fund || 0,
        professional_tax: formData.professional_tax || 0,
        insurance: formData.insurance || 0,
        loan_repayment: formData.loan_repayment || 0,
        advance_deduction: formData.advance_deduction || 0,
        other_deductions: formData.other_deductions || 0
      };
      
      console.log('💰 Creating payroll record...');
      console.log('Data:', payrollData);
      
      let response;
      if (editingPayroll) {
        response = await axios.put(`${API_URL}/payroll/${editingPayroll.id}`, payrollData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await axios.post(`${API_URL}/payroll`, payrollData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      console.log('✅ Payroll saved successfully:', response.data);
      
      // Close modal and reset form
      setShowAddModal(false);
      setEditingPayroll(null);
      resetForm();
      
      // Refresh data
      await Promise.all([
        fetchPayroll(),
        fetchStats()
      ]);
      
      // Refresh notification badges immediately
      refreshNotifications();
      
      alert(editingPayroll ? 'Payroll updated successfully!' : 'Payroll created successfully! Deductions have been calculated based on attendance.');
    } catch (error) {
      console.error('Error saving payroll:', error);
      console.error('Error details:', error.response?.data);
      alert(error.response?.data?.message || error.response?.data?.error || 'Failed to save payroll');
    }
  };

  const handleEditPayroll = (payroll) => {
    setEditingPayroll(payroll);
    setFormData({
      user_id: payroll.user_id,
      month: payroll.month,
      year: payroll.year,
      basic_salary: payroll.basic_salary || 0,
      hra: payroll.hra || 0,
      transport_allowance: payroll.transport_allowance || 0,
      medical_allowance: payroll.medical_allowance || 0,
      special_allowance: payroll.special_allowance || 0,
      overtime_pay: payroll.overtime_pay || 0,
      bonus: payroll.bonus || 0,
      commission: payroll.commission || 0,
      incentives: payroll.incentives || 0,
      tax_deduction: payroll.tax_deduction || 0,
      provident_fund: payroll.provident_fund || 0,
      professional_tax: payroll.professional_tax || 0,
      insurance: payroll.insurance || 0,
      loan_repayment: payroll.loan_repayment || 0,
      advance_deduction: payroll.advance_deduction || 0,
      other_deductions: payroll.other_deductions || 0,
      working_days: payroll.working_days || 26,
      present_days: payroll.present_days || 26,
      absent_days: payroll.absent_days || 0,
      paid_leaves: payroll.paid_leaves || 0,
      unpaid_leaves: payroll.unpaid_leaves || 0,
      overtime_hours: payroll.overtime_hours || 0,
      status: payroll.status || 'draft',
      notes: payroll.notes || ''
    });
    setShowAddModal(true);
  };

  const handleProcessPayroll = async (payrollId) => {
    if (!window.confirm('Process this payroll? This will mark it as reviewed and approved.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/payroll/${payrollId}/process`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchPayroll();
      fetchStats();
      refreshNotifications();
      alert('Payroll processed successfully!');
    } catch (error) {
      console.error('Error processing payroll:', error);
      alert(error.response?.data?.message || 'Failed to process payroll');
    }
  };

  const handleRecalculatePayroll = async (payrollId) => {
    if (!confirm('Recalculate deductions based on current attendance data?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/payroll/${payrollId}/recalculate`, 
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      console.log('✅ Payroll recalculated:', response.data);
      
      await Promise.all([
        fetchPayroll(),
        fetchStats()
      ]);
      
      refreshNotifications();
      alert('Deductions recalculated successfully!');
    } catch (error) {
      console.error('Error recalculating:', error);
      alert(error.response?.data?.message || 'Failed to recalculate deductions');
    }
  };

  const handleMarkAsPaid = async (payrollId) => {
    const paymentDate = prompt('Enter payment date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!paymentDate) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/payroll/${payrollId}/mark-paid`, 
        { payment_date: paymentDate },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      fetchPayroll();
      fetchStats();
      refreshNotifications();
      alert('Payroll marked as paid!');
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert(error.response?.data?.message || 'Failed to mark as paid');
    }
  };

  const handleSaveEdit = async () => {
    if (!viewingPayroll) return;

    const grossSalary = editData.salary + editData.bonus;
    const totalDeductions = editData.provident_fund + editData.professional_tax + editData.other_deductions;
    const netSalary = grossSalary - totalDeductions;

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/payroll/${viewingPayroll.id}`, {
        salary: editData.salary,
        bonus: editData.bonus,
        provident_fund: editData.provident_fund,
        professional_tax: editData.professional_tax,
        other_deductions: editData.other_deductions,
        gross_salary: grossSalary,
        total_deductions: totalDeductions,
        net_salary: netSalary
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Payroll updated successfully!');
      setViewingPayroll(null);
      setEditingPayroll(null);
      fetchPayroll();
      fetchStats();
      refreshNotifications();
    } catch (error) {
      console.error('Error updating payroll:', error);
      alert('Failed to update payroll');
    }
  };

  const getFilteredPayroll = () => {
    return payrollData.filter(payroll => {
      // Filter by status
      if (filterStatus !== 'all' && payroll.status !== filterStatus) {
        return false;
      }

      // Filter by employee
      if (filterEmployee !== 'all' && payroll.user_id !== filterEmployee) {
        return false;
      }

      // Search by employee name
      if (searchTerm) {
        const employeeName = users.find(u => u.id === payroll.user_id)?.name || '';
        if (!employeeName.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      basic_salary: 0,
      hra: 0,
      transport_allowance: 0,
      medical_allowance: 0,
      special_allowance: 0,
      overtime_pay: 0,
      bonus: 0,
      commission: 0,
      incentives: 0,
      tax_deduction: 0,
      provident_fund: 0,
      professional_tax: 0,
      insurance: 0,
      loan_repayment: 0,
      advance_deduction: 0,
      other_deductions: 0,
      working_days: 26,
      present_days: 26,
      absent_days: 0,
      paid_leaves: 0,
      unpaid_leaves: 0,
      overtime_hours: 0,
      status: 'draft',
      notes: ''
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse h-96">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Wallet className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
              <p className="text-gray-600">Manage and view payroll information</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          {canManage && (
            <Button onClick={() => { resetForm(); setEditingPayroll(null); setShowAddModal(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payroll
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalGrossSalary || 0)}</div>
            <p className="text-xs text-muted-foreground">{totalStats.totalRecords || 0} records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalStats.totalDeductions || 0)}</div>
            <p className="text-xs text-muted-foreground">Tax, PF, Insurance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalStats.totalNetSalary || 0)}</div>
            <p className="text-xs text-muted-foreground">After deductions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonus & Overtime</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency((totalStats.totalBonus || 0) + (totalStats.totalOvertime || 0))}</div>
            <p className="text-xs text-muted-foreground">Additional earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            {/* Search by name (Admin/HR/Manager) */}
            {(isAdmin || isHR || isManager) && (
              <div className="flex-1 min-w-[200px] max-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search by employee name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            )}

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index + 1}>{month}</option>
              ))}
            </select>

            {/* Year Filter */}
            <Input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-24"
              min="2020"
              max="2030"
            />

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="processed">Processed</option>
              <option value="paid">Paid</option>
            </select>

            {/* Employee Filter (Admin/HR only) */}
            {(isAdmin || isHR) && (
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Employees</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}

            {/* Clear Filters */}
            {(filterStatus !== 'all' || filterEmployee !== 'all' || searchTerm) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus('all');
                  setFilterEmployee('all');
                  setSearchTerm('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
          <CardDescription>
            {(() => {
              const filtered = getFilteredPayroll();
              return `${filtered.length} of ${payrollData.length} records for ${MONTHS[selectedMonth - 1]} ${selectedYear}`;
            })()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Gross Salary</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredPayroll().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No payroll records found matching the filters
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredPayroll().map((payroll) => {
                  const employee = users.find(u => u.id === payroll.user_id);
                  // Debug: Log if employee not found
                  if (!employee && payroll.user_id) {
                    console.warn('⚠️ Employee not found when rendering:', {
                      payroll_id: payroll.id,
                      payroll_user_id: payroll.user_id,
                      total_users_loaded: users.length,
                      all_user_ids: users.map(u => u.id),
                      do_ids_match: users.some(u => u.id === payroll.user_id)
                    });
                  }
                  return (
                <TableRow key={payroll.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {employee?.name || (
                          <span className="text-red-600">
                            Deleted User ({payroll.user_id?.substring(0, 8)})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{employee?.department || 'Unknown'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{MONTHS[payroll.month - 1]} {payroll.year}</div>
                      {payroll.working_days > 0 && (
                        <div className="text-gray-500">{payroll.present_days || 0}/{payroll.working_days} days</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(payroll.gross_salary || ((payroll.salary || 0) + (payroll.bonus || 0)))}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(payroll.total_deductions || payroll.deductions || 0)}</TableCell>
                  <TableCell className="font-bold text-green-600">{formatCurrency(payroll.net_salary || (((payroll.salary || 0) + (payroll.bonus || 0)) - (payroll.total_deductions || payroll.deductions || 0)))}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payroll.status === 'paid' ? 'bg-green-100 text-green-800' :
                      payroll.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                      payroll.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {payroll.status?.toUpperCase() || 'DRAFT'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {/* Show Edit for unpaid, Eye for paid */}
                      {payroll.status === 'paid' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setViewingPayroll(payroll)}
                          title="View Payslip"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingPayroll(payroll);
                            setViewingPayroll(payroll);
                          }}
                          title="Edit Payslip"
                          className="text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadPayslip(payroll)}
                        title="Download Payslip"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canManage && payroll.status === 'draft' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleProcessPayroll(payroll.id)}
                          title="Process"
                          className="text-green-600"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && payroll.status === 'processed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleMarkAsPaid(payroll.id)}
                          title="Mark as Paid"
                          className="text-green-600"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payroll Detail Modal - Professional Payslip */}
      {viewingPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
            {/* Payslip Header */}
            <div className="border-b-4 border-black p-6 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold uppercase tracking-wide">
                    {editingPayroll ? 'EDIT PAYSLIP' : 'PAYSLIP'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">SALARY SLIP FOR THE MONTH OF {MONTHS[viewingPayroll.month - 1].toUpperCase()} {viewingPayroll.year}</p>
                </div>
                <button
                  onClick={() => {
                    setViewingPayroll(null);
                    setEditingPayroll(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Information */}
              <div className="border-2 border-black">
                <div className="bg-black text-white px-4 py-2">
                  <h2 className="font-bold uppercase">Employee Information</h2>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 p-4">
                  <div className="flex">
                    <span className="w-32 text-gray-700 font-medium">Employee:</span>
                    <span className="flex-1 font-bold">{users.find(u => u.id === viewingPayroll.user_id)?.name || 'N/A'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-gray-700 font-medium">Department:</span>
                    <span className="flex-1 font-bold">{users.find(u => u.id === viewingPayroll.user_id)?.department || 'N/A'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-gray-700 font-medium">Employee ID:</span>
                    <span className="flex-1 font-bold">{viewingPayroll.user_id?.slice(0, 8).toUpperCase() || 'N/A'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-gray-700 font-medium">Payment Date:</span>
                    <span className="flex-1 font-bold">{viewingPayroll.payment_date || 'Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Salary Details Table */}
              <div className="border-2 border-black">
                <table className="w-full">
                  <thead>
                    <tr className="bg-black text-white">
                      <th className="px-4 py-2 text-left uppercase font-bold">Earnings</th>
                      <th className="px-4 py-2 text-right uppercase font-bold">Amount</th>
                      <th className="px-4 py-2 text-left uppercase font-bold">Deductions</th>
                      <th className="px-4 py-2 text-right uppercase font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="px-4 py-3 font-medium">Basic Salary</td>
                      <td className="px-4 py-3 text-right">
                        {editingPayroll ? (
                          <input
                            type="number"
                            value={editData.salary}
                            onChange={(e) => setEditData({...editData, salary: parseFloat(e.target.value) || 0})}
                            className="w-full text-right border-2 border-blue-500 px-2 py-1 font-mono rounded"
                          />
                        ) : (
                          <span className="font-mono">{formatCurrency(viewingPayroll.salary || 0)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">Provident Fund</td>
                      <td className="px-4 py-3 text-right">
                        {editingPayroll ? (
                          <input
                            type="number"
                            value={editData.provident_fund}
                            onChange={(e) => setEditData({...editData, provident_fund: parseFloat(e.target.value) || 0})}
                            className="w-full text-right border-2 border-blue-500 px-2 py-1 font-mono rounded"
                          />
                        ) : (
                          <span className="font-mono">{formatCurrency(viewingPayroll.provident_fund || 0)}</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="px-4 py-3 font-medium">Bonus</td>
                      <td className="px-4 py-3 text-right">
                        {editingPayroll ? (
                          <input
                            type="number"
                            value={editData.bonus}
                            onChange={(e) => setEditData({...editData, bonus: parseFloat(e.target.value) || 0})}
                            className="w-full text-right border-2 border-blue-500 px-2 py-1 font-mono rounded"
                          />
                        ) : (
                          <span className="font-mono">{formatCurrency(viewingPayroll.bonus || 0)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">Professional Tax</td>
                      <td className="px-4 py-3 text-right">
                        {editingPayroll ? (
                          <input
                            type="number"
                            value={editData.professional_tax}
                            onChange={(e) => setEditData({...editData, professional_tax: parseFloat(e.target.value) || 0})}
                            className="w-full text-right border-2 border-blue-500 px-2 py-1 font-mono rounded"
                          />
                        ) : (
                          <span className="font-mono">{formatCurrency(viewingPayroll.professional_tax || 0)}</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="px-4 py-3 font-medium"></td>
                      <td className="px-4 py-3 text-right font-mono"></td>
                      <td className="px-4 py-3 font-medium">Other Deductions</td>
                      <td className="px-4 py-3 text-right">
                        {editingPayroll ? (
                          <input
                            type="number"
                            value={editData.other_deductions}
                            onChange={(e) => setEditData({...editData, other_deductions: parseFloat(e.target.value) || 0})}
                            className="w-full text-right border-2 border-blue-500 px-2 py-1 font-mono rounded"
                          />
                        ) : (
                          <span className="font-mono">{formatCurrency((viewingPayroll.tax_deduction || 0) + (viewingPayroll.insurance || 0) + (viewingPayroll.other_deductions || 0))}</span>
                        )}
                      </td>
                    </tr>
                    <tr className="bg-gray-100 border-t-2 border-black">
                      <td className="px-4 py-3 font-bold uppercase">Gross Salary</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {formatCurrency(editingPayroll ? (editData.salary + editData.bonus) : ((viewingPayroll.salary || 0) + (viewingPayroll.bonus || 0)))}
                      </td>
                      <td className="px-4 py-3 font-bold uppercase">Total Deductions</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {formatCurrency(editingPayroll ? (editData.provident_fund + editData.professional_tax + editData.other_deductions) : (viewingPayroll.total_deductions || viewingPayroll.deductions || 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Salary */}
              <div className="border-4 border-black bg-gray-100 p-6">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold uppercase">Net Salary Payable</span>
                  <span className="text-4xl font-bold font-mono">
                    {formatCurrency(editingPayroll 
                      ? ((editData.salary + editData.bonus) - (editData.provident_fund + editData.professional_tax + editData.other_deductions))
                      : (viewingPayroll.net_salary || (((viewingPayroll.salary || 0) + (viewingPayroll.bonus || 0)) - (viewingPayroll.total_deductions || viewingPayroll.deductions || 0)))
                    )}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t-2 border-gray-300">
                <p className="text-sm text-gray-600 italic">This is a computer-generated payslip and does not require a signature.</p>
                <div className="flex gap-2">
                  {editingPayroll ? (
                    <>
                      <Button 
                        onClick={handleSaveEdit}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setViewingPayroll(null);
                          setEditingPayroll(null);
                        }}
                        className="border-black text-black hover:bg-gray-100"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline"
                        onClick={() => handleDownloadPayslip(viewingPayroll)}
                        className="border-black text-black hover:bg-gray-100"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button 
                        onClick={() => {
                          setViewingPayroll(null);
                          setEditingPayroll(null);
                        }}
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        Close
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Payroll Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl my-8 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b-4 border-black p-6 bg-gray-50 sticky top-0 z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold uppercase tracking-wide">
                    {editingPayroll ? 'EDIT PAYROLL' : 'CREATE PAYROLL'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">Enter salary details with automatic deductions based on attendance</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingPayroll(null);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form id="payroll-form" onSubmit={handleSubmitPayroll} className="space-y-6 pb-4">
                {/* Basic Info */}
                <div className="border-2 border-black">
                  <div className="bg-black text-white px-4 py-2">
                    <h3 className="font-bold uppercase flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Basic Information
                    </h3>
                  </div>
                  <div className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_id" className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Employee *
                      </Label>
                    <select
                      id="user_id"
                      value={formData.user_id}
                      onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                      disabled={editingPayroll}
                    >
                      <option value="">Select Employee</option>
                      {users
                        .filter(u => {
                          // Exclude candidates - they don't get payroll
                          if (u.role === 'candidate') return false;
                          // Admin can create payroll for everyone except candidates
                          if (isAdmin) return true;
                          // HR can only create payroll for employees and managers (not HR/Admin)
                          if (isHR) return ['employee', 'manager'].includes(u.role);
                          return false;
                        })
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.name} - {u.department} ({u.role})</option>
                        ))}
                    </select>
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="month" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Month *
                      </Label>
                      <select
                        id="month"
                        value={formData.month}
                        onChange={(e) => setFormData({...formData, month: parseInt(e.target.value)})}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                      >
                        {MONTHS.map((m, i) => (
                          <option key={i} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Year *
                      </Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                        required
                      />
                    </div>
                  </div>
                  </div>
                </div>

                {/* Earnings - Simplified with Auto-calculation */}
                <div className="border-2 border-black">
                  <div className="bg-black text-white px-4 py-2">
                    <h3 className="font-bold uppercase flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Salary & Earnings
                    </h3>
                  </div>
                  <div className="p-4">
                  
                  {/* Primary Input */}
                  <div className="mb-4 p-4 bg-white rounded-lg border-2 border-green-300">
                    <Label htmlFor="basic_salary" className="text-base font-semibold flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Basic Salary (Monthly) *
                    </Label>
                    <Input
                      id="basic_salary"
                      type="number"
                      value={formData.basic_salary}
                      onChange={(e) => handleBasicSalaryChange(e.target.value)}
                      placeholder="Enter basic salary"
                      className="mt-2 text-lg font-semibold"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Other allowances will be auto-calculated based on company standards</p>
                  </div>

                  {/* Auto-calculated Allowances */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">HRA (40% of Basic) - Auto</Label>
                      <Input
                        type="number"
                        value={formData.hra}
                        readOnly
                        className="bg-gray-50 text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Transport Allowance - Standard</Label>
                      <Input
                        type="number"
                        value={formData.transport_allowance}
                        onChange={(e) => setFormData({...formData, transport_allowance: parseFloat(e.target.value) || 0})}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Medical Allowance - Standard</Label>
                      <Input
                        type="number"
                        value={formData.medical_allowance}
                        onChange={(e) => setFormData({...formData, medical_allowance: parseFloat(e.target.value) || 0})}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Special Allowance (Optional)</Label>
                      <Input
                        type="number"
                        value={formData.special_allowance}
                        onChange={(e) => setFormData({...formData, special_allowance: parseFloat(e.target.value) || 0})}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Bonus (Optional)</Label>
                      <Input
                        type="number"
                        value={formData.bonus}
                        onChange={(e) => setFormData({...formData, bonus: parseFloat(e.target.value) || 0})}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  </div>
                </div>

                {/* Deductions - Auto-calculated + Manual */}
                <div className="border-2 border-black">
                  <div className="bg-black text-white px-4 py-2">
                    <h3 className="font-bold uppercase flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Deductions
                    </h3>
                  </div>
                  <div className="p-4">
                  
                  {/* Info Banner */}
                  <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                    <p className="text-sm text-blue-800 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <strong>Automatic:</strong> Late/Absent deductions will be calculated automatically based on attendance records
                    </p>
                  </div>

                  {/* Attendance Preview */}
                  {loadingAttendance && (
                    <div className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                      <p className="text-sm text-gray-600">Loading attendance data...</p>
                    </div>
                  )}
                  
                  {attendancePreview && !loadingAttendance && (
                    <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                      <h4 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Attendance-Based Deduction Preview for {MONTHS[formData.month - 1]} {formData.year}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Present Days:</span>
                          <span className="font-semibold text-green-600">{attendancePreview.presentDays}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Working Days:</span>
                          <span className="font-semibold">{attendancePreview.workingDays}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Late Days:</span>
                          <span className="font-semibold text-yellow-600">{attendancePreview.lateDays}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-white rounded">
                          <span className="text-gray-600">Absent Days:</span>
                          <span className="font-semibold text-red-600">{attendancePreview.absentDays}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Per Day Salary:</span>
                            <span className="font-medium">{formatCurrency(attendancePreview.perDaySalary)}</span>
                          </div>
                          {attendancePreview.lateDays > 0 && (
                            <div className="flex justify-between text-yellow-700">
                              <span>Late Deduction ({attendancePreview.lateDays} × 50%):</span>
                              <span className="font-semibold">-{formatCurrency(attendancePreview.lateDeduction)}</span>
                            </div>
                          )}
                          {attendancePreview.absentDays > 0 && (
                            <div className="flex justify-between text-red-700">
                              <span>Absent Deduction ({attendancePreview.absentDays} days):</span>
                              <span className="font-semibold">-{formatCurrency(attendancePreview.absentDeduction)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-orange-200 font-bold text-orange-800">
                            <span>Total Attendance Deduction:</span>
                            <span>-{formatCurrency(attendancePreview.totalDeduction)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Provident Fund (12% of Basic) - Auto</Label>
                      <Input
                        type="number"
                        value={formData.provident_fund}
                        readOnly
                        className="bg-gray-50 text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Professional Tax - Standard</Label>
                      <Input
                        type="number"
                        value={formData.professional_tax}
                        onChange={(e) => setFormData({...formData, professional_tax: parseFloat(e.target.value) || 0})}
                        className="bg-white"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-3 italic">
                    Note: Attendance-based deductions (late/absent) will be automatically calculated when payroll is created
                  </p>
                </div>

                {/* Summary Info with Breakdown */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border-2 border-blue-200">
                  <h3 className="text-lg font-semibold mb-3 text-blue-700 flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Salary Breakdown
                  </h3>
                  
                  {/* Earnings Breakdown */}
                  <div className="mb-3 p-3 bg-white rounded border">
                    <p className="text-sm font-semibold text-green-700 mb-2">Earnings:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Basic Salary:</span>
                        <span className="font-medium">₹{(formData.basic_salary || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">HRA (40%):</span>
                        <span className="font-medium">₹{(formData.hra || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transport:</span>
                        <span className="font-medium">₹{(formData.transport_allowance || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Medical:</span>
                        <span className="font-medium">₹{(formData.medical_allowance || 0).toLocaleString()}</span>
                      </div>
                      {(formData.special_allowance > 0) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Special:</span>
                          <span className="font-medium">₹{(formData.special_allowance || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {(formData.bonus > 0) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bonus:</span>
                          <span className="font-medium">₹{(formData.bonus || 0).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t pt-1 mt-1 flex justify-between font-semibold text-green-700">
                        <span>Gross Salary:</span>
                        <span className="text-lg">₹{((formData.basic_salary || 0) + (formData.hra || 0) + (formData.transport_allowance || 0) + (formData.medical_allowance || 0) + (formData.special_allowance || 0) + (formData.bonus || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Breakdown */}
                  <div className="p-3 bg-white rounded border">
                    <p className="text-sm font-semibold text-red-700 mb-2">Deductions:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Provident Fund (12%):</span>
                        <span className="font-medium">₹{(formData.provident_fund || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Professional Tax:</span>
                        <span className="font-medium">₹{(formData.professional_tax || 0).toLocaleString()}</span>
                      </div>
                      {attendancePreview && attendancePreview.totalDeduction > 0 && (
                        <div className="flex justify-between text-orange-700">
                          <span className="text-gray-600">Attendance Deduction:</span>
                          <span className="font-medium">₹{Math.round(attendancePreview.totalDeduction).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t pt-1 mt-1 flex justify-between font-semibold text-red-700">
                        <span>Total Deductions:</span>
                        <span className="text-lg">₹{((formData.provident_fund || 0) + (formData.professional_tax || 0) + (attendancePreview?.totalDeduction || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Salary Estimate */}
                  <div className="mt-3 p-4 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg border-2 border-green-300">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-gray-700">Final Net Salary:</span>
                      <span className="text-2xl font-bold text-green-700">
                        ₹{(((formData.basic_salary || 0) + (formData.hra || 0) + (formData.transport_allowance || 0) + (formData.medical_allowance || 0) + (formData.special_allowance || 0) + (formData.bonus || 0)) - ((formData.provident_fund || 0) + (formData.professional_tax || 0) + (attendancePreview?.totalDeduction || 0))).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {attendancePreview && attendancePreview.totalDeduction > 0 
                        ? `Including ₹${Math.round(attendancePreview.totalDeduction).toLocaleString()} attendance deduction`
                        : 'All deductions included'}
                    </p>
                  </div>
                  </div>
                </div>

              </form>

              {/* Sticky Footer with Actions */}
              <div className="sticky bottom-0 bg-white border-t-2 border-gray-300 mt-6 pt-4 flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setShowAddModal(false); setEditingPayroll(null); resetForm(); }}
                  className="border-black text-black hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="payroll-form" 
                  className="bg-black text-white hover:bg-gray-800 flex items-center gap-2"
                >
                  {editingPayroll ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Update Payroll
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Create Payroll
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;