import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Calendar, DollarSign, TrendingUp, Clock, FileText, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/helpers';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    attendancePercentage: 0,
    totalDays: 0,
    presentDays: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    latestPayslip: null,
    latestPerformance: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('📊 Employee Dashboard Data:', response.data);

      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (err) {
      console.error('❌ Dashboard fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const [recentAttendance, setRecentAttendance] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
      fetchRecentAttendance();
    }
  }, [user]);

  const fetchRecentAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/attendance/user/${user.id}?limit=5`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setRecentAttendance(response.data.data.attendance || []);
      }
    } catch (err) {
      console.error('❌ Attendance fetch error:', err);
      // Keep empty array if error
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'on_leave': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse h-80">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse h-80">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="p-3 bg-cyan-100 rounded-lg">
            <TrendingUp className="w-8 h-8 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Dashboard</h1>
            <p className="text-gray-600">Overview of your attendance, payroll, and performance</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.attendancePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.presentDays} of {dashboardData.totalDays} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const totalAnnualLeaves = 24; // Standard annual leave allocation
                const usedLeaves = dashboardData.approvedLeaves || 0;
                const remainingLeaves = totalAnnualLeaves - usedLeaves;
                return remainingLeaves;
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.approvedLeaves || 0} used of 24 days
            </p>
            {dashboardData.pendingLeaves > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                {dashboardData.pendingLeaves} pending approval
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Payslip</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.latestPayslip ? formatCurrency(dashboardData.latestPayslip.net_salary) : '$0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.latestPayslip ? `${dashboardData.latestPayslip.month}/${dashboardData.latestPayslip.year}` : 'No data'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.averagePerformanceRating || 0}/5
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.totalPerformanceReviews > 0 
                ? `Average of ${dashboardData.totalPerformanceReviews} review${dashboardData.totalPerformanceReviews > 1 ? 's' : ''}`
                : 'Not reviewed yet'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Leave Status</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardData.latestLeave ? (
              <>
                <div className="text-2xl font-bold capitalize">{dashboardData.latestLeave.status}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.latestLeave.leave_type} • {new Date(dashboardData.latestLeave.start_date).toLocaleDateString()}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">No Leaves</div>
                <p className="text-xs text-muted-foreground">No leave requests yet</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/attendance'}
            >
              <Calendar className="h-6 w-6 text-blue-600" />
              <span className="text-sm">Mark Attendance</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/leaves'}
            >
              <FileText className="h-6 w-6 text-green-600" />
              <span className="text-sm">Apply Leave</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/payroll'}
            >
              <DollarSign className="h-6 w-6 text-purple-600" />
              <span className="text-sm">View Payslips</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/performance'}
            >
              <TrendingUp className="h-6 w-6 text-orange-600" />
              <span className="text-sm">Performance</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDashboard;