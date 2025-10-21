import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Calendar, DollarSign, Briefcase, FileText, TrendingUp, AlertCircle, UserCheck, UserX, Clock, Award, Target, Bell, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import dashboardService from '../../services/dashboardService';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    attendancePercentage: 0,
    todayPresent: 0,
    todayLate: 0,
    todayAbsent: 0,
    totalPayroll: 0,
    avgSalary: 0,
    payrollChange: 0,
    pendingPayrolls: 0,
    totalJobs: 0,
    totalApplications: 0,
    avgPerformance: 0,
    topPerformers: [],
    needsAttention: [],
    pendingReviews: 0,
    pendingLeaves: 0,
    newHires: 0,
    departmentDistribution: [],
    weeklyAttendance: [],
    applicationStatus: [],
    alerts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching dashboard data...');
      const response = await dashboardService.getAdminDashboard();
      console.log('📊 Dashboard response:', response);
      
      if (response && response.success && response.data) {
        console.log('✅ Setting dashboard data:', response.data);
        setDashboardData(response.data);
      } else {
        console.warn('⚠️ Invalid response format:', response);
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      console.error('Error details:', error.response?.data);
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  // Use real data from API or fallback to empty arrays
  const attendanceData = dashboardData.weeklyAttendance || [];
  
  const departmentColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B9D'];
  const departmentData = (dashboardData.departmentDistribution || []).map((dept, index) => ({
    ...dept,
    color: departmentColors[index % departmentColors.length]
  }));

  const applicationColors = {
    pending: '#8884d8',
    reviewed: '#82ca9d',
    shortlisted: '#ffc658',
    rejected: '#ff7c7c',
    hired: '#8dd1e1'
  };
  const applicationStatusData = (dashboardData.applicationStatus || []).map(app => ({
    ...app,
    color: applicationColors[app.name.toLowerCase()] || '#8884d8'
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
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
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Overview of your company's HR metrics</p>
          </div>
        </div>
      </div>

      {/* Today's Attendance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-green-600" />
                    Present Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">{dashboardData.todayPresent || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    On time and working
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-yellow-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    Late Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-700">{dashboardData.todayLate || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Arrived after scheduled time
                  </p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-red-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <UserX className="w-4 h-4 text-red-600" />
                    Absent Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-700">{dashboardData.todayAbsent || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Not marked present
                  </p>
                </CardContent>
              </Card>
            </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalEmployees}</div>
            <p className="text-xs text-gray-500 mt-1">Registered employees in the system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalPayroll)}</div>
            <p className="text-xs text-gray-500 mt-1">Total payroll for current month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Employees by Department</CardTitle>
            <CardDescription>Distribution of employees across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle>Application Status</CardTitle>
          <CardDescription>Current status of all job applications</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={applicationStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {applicationStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
    </div>
  );
};

export default AdminDashboard;