import React, { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, DollarSign, Calendar, 
  Briefcase, Clock, CheckCircle, AlertCircle,
  ArrowUp, ArrowDown, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import dashboardService from '../../services/dashboardService';
import leaveService from '../../services/leaveService';
import eventService from '../../services/eventService';

const EnhancedAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [dashboardRes, eventsRes, leavesRes] = await Promise.all([
        dashboardService.getAdminDashboard(),
        eventService.getUpcomingEvents(5),
        leaveService.getPendingLeaves()
      ]);

      if (dashboardRes.success) {
        setStats(dashboardRes.data);
        
        // Mock attendance trend data (replace with real API data)
        setAttendanceData([
          { day: 'Mon', present: 450, absent: 50, late: 20 },
          { day: 'Tue', present: 470, absent: 30, late: 15 },
          { day: 'Wed', present: 460, absent: 40, late: 18 },
          { day: 'Thu', present: 480, absent: 20, late: 12 },
          { day: 'Fri', present: 440, absent: 60, late: 25 },
        ]);

        // Mock department data (replace with real API data)
        setDepartmentData([
          { name: 'Engineering', value: 150, color: '#3B82F6' },
          { name: 'Sales', value: 80, color: '#10B981' },
          { name: 'Marketing', value: 60, color: '#F59E0B' },
          { name: 'HR', value: 40, color: '#EF4444' },
          { name: 'Finance', value: 50, color: '#8B5CF6' },
          { name: 'Operations', value: 70, color: '#EC4899' },
        ]);
      }

      if (eventsRes.success) {
        setUpcomingEvents(eventsRes.data);
      }

      if (leavesRes.success) {
        setPendingLeaves(leavesRes.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, change, icon: Icon, color, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <ArrowUp className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 mr-1" />
              )}
              <span className="font-medium">{change}</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl ${color}`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <TrendingUp className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={stats?.totalUsers || 0}
          change="+12%"
          trend="up"
          icon={Users}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Present Today"
          value={stats?.todayAttendance?.present || 0}
          change="+5%"
          trend="up"
          icon={CheckCircle}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard
          title="Pending Leaves"
          value={pendingLeaves.length}
          icon={Calendar}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
        />
        <StatCard
          title="Active Jobs"
          value={stats?.activeJobs || 0}
          change="+3"
          trend="up"
          icon={Briefcase}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Attendance Trend</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={attendanceData}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="present" 
                stroke="#10B981" 
                fillOpacity={1} 
                fill="url(#colorPresent)" 
                name="Present"
              />
              <Area 
                type="monotone" 
                dataKey="absent" 
                stroke="#EF4444" 
                fillOpacity={1} 
                fill="url(#colorAbsent)" 
                name="Absent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Department Distribution</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No upcoming events</p>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.start_date).toLocaleDateString()} • {event.type}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Leave Approvals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Leave Approvals</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {pendingLeaves.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No pending approvals</p>
            ) : (
              pendingLeaves.map((leave) => (
                <div key={leave.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {leave.users?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 capitalize">{leave.leave_type}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 transition-colors text-left">
            <Users className="w-6 h-6 mb-2" />
            <p className="text-sm font-medium">Add Employee</p>
          </button>
          <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 transition-colors text-left">
            <Briefcase className="w-6 h-6 mb-2" />
            <p className="text-sm font-medium">Post Job</p>
          </button>
          <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 transition-colors text-left">
            <Calendar className="w-6 h-6 mb-2" />
            <p className="text-sm font-medium">Create Event</p>
          </button>
          <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 transition-colors text-left">
            <DollarSign className="w-6 h-6 mb-2" />
            <p className="text-sm font-medium">Process Payroll</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;
