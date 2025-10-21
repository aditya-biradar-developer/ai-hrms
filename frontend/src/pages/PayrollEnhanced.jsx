import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { 
  DollarSign, Download, Calendar, TrendingUp, Plus, Eye, Edit, 
  FileText, Users, Building, CheckCircle, Clock, XCircle, Wallet 
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PayrollEnhanced = () => {
  const { user } = useAuth();
  const { isAdmin, isHR } = useRole();
  const canManage = isAdmin || isHR;

  const [payrollData, setPayrollData] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [viewingPayroll, setViewingPayroll] = useState(null);
  const [showSalaryStructureModal, setShowSalaryStructureModal] = useState(false);
  
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalGrossSalary: 0,
    totalDeductions: 0,
    totalNetSalary: 0,
    totalBonus: 0,
    totalOvertime: 0,
    statusBreakdown: { draft: 0, processed: 0, paid: 0, cancelled: 0 }
  });

  const [formData, setFormData] = useState({
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
    if (canManage) {
      fetchUsers();
    }
  }, [selectedMonth, selectedYear]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = canManage 
        ? `${API_URL}/payroll?month=${selectedMonth}&year=${selectedYear}`
        : `${API_URL}/payroll/user/${user.id}?month=${selectedMonth}&year=${selectedYear}`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPayrollData(response.data.data.payroll || []);
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear
      });
      
      if (!canManage) {
        params.append('userId', user.id);
      }
      
      const response = await axios.get(`${API_URL}/payroll/stats/summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStats(response.data.data.stats || stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmitPayroll = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/payroll`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowModal(false);
      fetchPayroll();
      fetchStats();
      resetForm();
    } catch (error) {
      console.error('Error creating payroll:', error);
      alert(error.response?.data?.message || 'Failed to create payroll');
    }
  };

  const handleSubmitSalaryStructure = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/payroll/structure`, salaryStructureForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowSalaryStructureModal(false);
      alert('Salary structure saved successfully!');
      resetSalaryStructureForm();
    } catch (error) {
      console.error('Error saving salary structure:', error);
      alert(error.response?.data?.message || 'Failed to save salary structure');
    }
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
      alert('Payroll processed successfully!');
    } catch (error) {
      console.error('Error processing payroll:', error);
      alert(error.response?.data?.message || 'Failed to process payroll');
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
      alert('Payroll marked as paid!');
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert(error.response?.data?.message || 'Failed to mark as paid');
    }
  };

  const handleDownloadPayslip = (payroll) => {
    const payslipText = `
=====================================
     PAYSLIP FOR ${MONTHS[payroll.month - 1]} ${payroll.year}
=====================================

Employee: ${payroll.employee?.name || 'N/A'}
Department: ${payroll.employee?.department || 'N/A'}
Employee ID: ${payroll.user_id?.slice(0, 8)}

Pay Period: ${payroll.pay_period_start || 'N/A'} to ${payroll.pay_period_end || 'N/A'}
Payment Date: ${payroll.payment_date || 'Pending'}
Status: ${payroll.status?.toUpperCase()}

-------------------------------------
EARNINGS
-------------------------------------
Basic Salary              ₹ ${(payroll.basic_salary || 0).toFixed(2)}
House Rent Allowance      ₹ ${(payroll.hra || 0).toFixed(2)}
Transport Allowance       ₹ ${(payroll.transport_allowance || 0).toFixed(2)}
Medical Allowance         ₹ ${(payroll.medical_allowance || 0).toFixed(2)}
Special Allowance         ₹ ${(payroll.special_allowance || 0).toFixed(2)}
Overtime Pay              ₹ ${(payroll.overtime_pay || 0).toFixed(2)}
Bonus                     ₹ ${(payroll.bonus || 0).toFixed(2)}
Commission                ₹ ${(payroll.commission || 0).toFixed(2)}
Incentives                ₹ ${(payroll.incentives || 0).toFixed(2)}
-------------------------------------
GROSS SALARY              ₹ ${(payroll.gross_salary || 0).toFixed(2)}

-------------------------------------
DEDUCTIONS
-------------------------------------
Provident Fund            ₹ ${(payroll.provident_fund || 0).toFixed(2)}
Professional Tax          ₹ ${(payroll.professional_tax || 0).toFixed(2)}
Tax Deduction (TDS)       ₹ ${(payroll.tax_deduction || 0).toFixed(2)}
Insurance                 ₹ ${(payroll.insurance || 0).toFixed(2)}
Loan Repayment            ₹ ${(payroll.loan_repayment || 0).toFixed(2)}
Advance Deduction         ₹ ${(payroll.advance_deduction || 0).toFixed(2)}
Other Deductions          ₹ ${(payroll.other_deductions || 0).toFixed(2)}
-------------------------------------
TOTAL DEDUCTIONS          ₹ ${(payroll.total_deductions || 0).toFixed(2)}

-------------------------------------
NET SALARY                ₹ ${(payroll.net_salary || 0).toFixed(2)}
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
Generated on: ${new Date().toLocaleDateString()}
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

  const resetSalaryStructureForm = () => {
    setSalaryStructureForm({
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
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      processed: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    const icons = {
      draft: <Clock className="h-3 w-3 mr-1" />,
      processed: <CheckCircle className="h-3 w-3 mr-1" />,
      paid: <CheckCircle className="h-3 w-3 mr-1" />,
      cancelled: <XCircle className="h-3 w-3 mr-1" />
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {icons[status]}
        {status?.toUpperCase()}
      </span>
    );
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Wallet className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
              <p className="text-gray-600">Comprehensive salary management and payslip generation</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          {canManage && (
            <>
              <Button onClick={() => setShowSalaryStructureModal(true)} variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Salary Structure
              </Button>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payroll
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Month/Year Filter */}
      <div className="flex space-x-2">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {MONTHS.map((month, index) => (
            <option key={index} value={index + 1}>{month}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {[2023, 2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalGrossSalary)}</div>
            <p className="text-xs text-muted-foreground">{stats.totalRecords} records</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalDeductions)}</div>
            <p className="text-xs text-muted-foreground">Tax, PF, Insurance</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Payout</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalNetSalary)}</div>
            <p className="text-xs text-muted-foreground">After deductions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonus & Overtime</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalBonus + stats.totalOvertime)}</div>
            <p className="text-xs text-muted-foreground">Additional earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">{stats.statusBreakdown?.draft || 0}</div>
                <div className="text-sm text-gray-600">Draft</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{stats.statusBreakdown?.processed || 0}</div>
                <div className="text-sm text-blue-600">Processed</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{stats.statusBreakdown?.paid || 0}</div>
                <div className="text-sm text-green-600">Paid</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{stats.statusBreakdown?.cancelled || 0}</div>
                <div className="text-sm text-red-600">Cancelled</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
          <CardDescription>
            {MONTHS[selectedMonth - 1]} {selectedYear} - {payrollData.length} record(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canManage && <TableHead>Employee</TableHead>}
                  <TableHead>Period</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="text-center text-gray-500 py-8">
                      No payroll records found for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  payrollData.map((payroll) => (
                    <TableRow key={payroll.id}>
                      {canManage && (
                        <TableCell>
                          <div>
                            <div className="font-medium">{payroll.employee?.name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{payroll.employee?.department || 'N/A'}</div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="text-sm">
                          <div>{MONTHS[payroll.month - 1]} {payroll.year}</div>
                          <div className="text-gray-500">{payroll.present_days}/{payroll.working_days} days</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(payroll.gross_salary)}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(payroll.total_deductions)}</TableCell>
                      <TableCell className="font-bold text-green-600">{formatCurrency(payroll.net_salary)}</TableCell>
                      <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setViewingPayroll(payroll)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadPayslip(payroll)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canManage && payroll.status === 'draft' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleProcessPayroll(payroll.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {canManage && payroll.status === 'processed' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleMarkAsPaid(payroll.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Payroll Modal - Continue in next message due to length */}
    </div>
  );
};

export default PayrollEnhanced;
