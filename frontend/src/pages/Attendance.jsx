import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Filter, TrendingUp, Users } from 'lucide-react';
import { attendanceService } from '../services/attendanceService';
import { formatDate, getStatusColor } from '../utils/helpers';
import { ATTENDANCE_STATUS, LEAVE_TYPES } from '../utils/constants';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Attendance = () => {
  const { user } = useAuth();
  const { isAdmin, isManager, isHR } = useRole();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMarkForm, setShowMarkForm] = useState(false);
  const [dateFilter, setDateFilter] = useState('month'); // 'day', 'week', 'month', 'year', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null); // Start as null, set in useEffect
  const [isInitialized, setIsInitialized] = useState(false); // Track if initial setup is done
  const [statusFilter, setStatusFilter] = useState('all'); // Filter by attendance status (default: all)
  const [usersList, setUsersList] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    status: ATTENDANCE_STATUS.PRESENT,
    leave_type: ''
  });
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    leaveDays: 0,
    attendancePercentage: 0
  });

  // Set default selectedUserId after roles are loaded
  useEffect(() => {
    if (user && user.id) {
      if (isAdmin || isHR || isManager) {
        console.log('🔑 Role detected: Admin/HR/Manager - Setting default to "all"');
        setSelectedUserId('all');
        fetchUsers();
      } else {
        console.log('🔑 Role detected: Employee/Candidate - Setting default to "me"');
        setSelectedUserId('me');
      }
      setIsInitialized(true); // Mark as initialized
    }
  }, [user, isAdmin, isHR, isManager]);

  useEffect(() => {
    // Only fetch after initialization and when selectedUserId is set
    if (isInitialized && selectedUserId !== null) {
      console.log(`🔄 Date filter changed to: ${dateFilter}, selectedUserId: ${selectedUserId}`);
      console.log('🔄 Fetching fresh attendance and stats...');
      fetchAttendance();
      fetchStats();
    } else {
      console.log('⏳ Waiting for initialization... isInitialized:', isInitialized, 'selectedUserId:', selectedUserId);
    }
  }, [dateFilter, customStartDate, customEndDate, selectedUserId, isInitialized]);

  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = () => {
    const now = new Date();
    console.log('📅 Current date info:', {
      fullDate: now.toString(),
      localDate: now.toLocaleDateString(),
      dayName: now.toLocaleDateString('en-US', { weekday: 'long' }),
      dayOfWeek: now.getDay(),
      date: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear()
    });
    
    let startDate, endDate;

    switch (dateFilter) {
      case 'day':
        // Today: start and end are the same day
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case 'week':
        // Week: Sunday to Saturday of current week
        const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Calculate Sunday of this week
        const daysToSubtract = dayOfWeek; // If Sunday=0, subtract 0; if Monday=1, subtract 1, etc.
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
        weekStart.setHours(0, 0, 0, 0);
        
        // Calculate Saturday of this week (6 days after Sunday)
        const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        console.log('🗓️ Week calculation:', {
          today: now.toDateString(),
          dayOfWeek,
          daysToSubtract,
          weekStartCalc: weekStart.toDateString(),
          weekEndCalc: weekEnd.toDateString()
        });
        
        startDate = weekStart;
        endDate = weekEnd;
        break;
      case 'month':
        // Month: 1st day to last day of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
        break;
      case 'year':
        // Year: Jan 1 to Dec 31
        startDate = new Date(now.getFullYear(), 0, 1); // Jan 1
        endDate = new Date(now.getFullYear(), 11, 31); // Dec 31
        break;
      case 'custom':
        // Custom: use user-selected dates
        if (customStartDate && customEndDate) {
          return {
            startDate: customStartDate,
            endDate: customEndDate
          };
        }
        // Fallback to current month if no custom dates set
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const formattedStart = formatDateToYYYYMMDD(startDate);
    const formattedEnd = formatDateToYYYYMMDD(endDate);
    
    console.log(`📅 Date range [${dateFilter}]:`, {
      filter: dateFilter,
      today: formatDateToYYYYMMDD(now),
      dayOfWeek: dateFilter === 'week' ? now.getDay() : 'N/A',
      startDate: formattedStart,
      endDate: formattedEnd
    });
    
    return {
      startDate: formattedStart,
      endDate: formattedEnd
    };
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      console.log('🔄 fetchAttendance called with:', { selectedUserId, user: user?.id, isInitialized });
      
      // Validate custom date range
      if (dateFilter === 'custom' && (!customStartDate || !customEndDate)) {
        console.log('⏳ Waiting for custom date range selection...');
        setLoading(false);
        return;
      }
      
      const { startDate, endDate } = getDateRange();
      
      console.log('📅 Fetching attendance:', { dateFilter, startDate, endDate, selectedUserId, userRole: user?.role });
      
      let response;
      
      // If "My Attendance" is selected - show logged-in user's attendance
      if (selectedUserId === 'me') {
        console.log(`👤 Fetching my attendance: ${user.id}`);
        response = await attendanceService.getAttendanceByUserId(user.id, { limit: 1000, startDate, endDate });
      }
      // If HR/Admin/Manager and a specific user is selected
      else if ((isAdmin || isManager || isHR) && selectedUserId !== 'all') {
        console.log(`👤 Fetching attendance for specific user: ${selectedUserId}`);
        response = await attendanceService.getAttendanceByUserId(selectedUserId, { limit: 1000, startDate, endDate });
      }
      // If HR/Admin/Manager and "All Users" is selected
      else if ((isAdmin || isManager || isHR) && selectedUserId === 'all') {
        console.log('👥 Fetching attendance for all users');
        response = await attendanceService.getAllAttendance({ limit: 1000, startDate, endDate });
      }
      // Regular employee - only their own data
      else {
        console.log(`👤 Fetching attendance for current user: ${user.id}`);
        response = await attendanceService.getAttendanceByUserId(user.id, { limit: 1000, startDate, endDate });
      }
      
      console.log('📊 Full response:', response);
      const records = response?.data?.attendance || [];
      setAttendanceData(records);
      console.log(`✅ Loaded ${records.length} attendance records`);
      console.log('📊 attendanceData state will be:', records);
      if (records.length > 0) {
        console.log('📋 Sample record:', records[0]);
      } else {
        console.warn('⚠️ No records in response!');
      }
    } catch (error) {
      console.error('❌ Error fetching attendance:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter out admin, candidates, and employees who haven't started yet
        const employees = data.data.users.filter(u => {
          const role = u.role?.toLowerCase();
          
          // Exclude admin and candidates
          if (role === 'admin' || role === 'candidate') {
            return false;
          }
          
          // Exclude employees who haven't started yet
          if (u.start_date) {
            const startDate = new Date(u.start_date);
            startDate.setHours(0, 0, 0, 0);
            if (startDate > today) {
              console.log(`⏭️ Excluding ${u.name} - starts on ${u.start_date} (future)`);
              return false;
            }
          }
          
          return true;
        });
        
        setUsersList(employees);
        console.log(`✅ Loaded ${employees.length} employees for filter (admins, candidates, and future employees excluded)`);
        console.log('📋 Roles in list:', [...new Set(employees.map(e => e.role))]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Validate custom date range
      if (dateFilter === 'custom' && (!customStartDate || !customEndDate)) {
        console.log('⏳ Waiting for custom date range selection...');
        return;
      }
      
      const { startDate, endDate } = getDateRange();
      
      // Determine which user's stats to fetch
      let userId;
      if (selectedUserId === 'me') {
        userId = user.id; // My attendance - logged-in user
      } else if ((isAdmin || isManager || isHR) && selectedUserId !== 'all') {
        userId = selectedUserId; // Specific user selected
      } else if (isAdmin || isManager || isHR) {
        userId = null; // All users
      } else {
        userId = user.id; // Regular employee - their own stats
      }
      
      console.log('📊 Fetching attendance stats:', { userId, startDate, endDate, filter: dateFilter });
      
      const response = await attendanceService.getAttendanceStats({ 
        userId,
        startDate,
        endDate
      });
      
      console.log('✅ Stats received:', response.data.stats);
      
      // Always update stats, even if all values are 0
      if (response.data.stats) {
        setStats(response.data.stats);
        console.log('✅ Stats state updated:', response.data.stats);
      } else {
        console.warn('⚠️ No stats in response, keeping current stats');
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      const attendanceData = {
        user_id: user.id,
        date: formData.date,
        status: formData.status,
        // Only include leave_type if status is on_leave and it's not empty
        ...(formData.status === ATTENDANCE_STATUS.ON_LEAVE && formData.leave_type 
          ? { leave_type: formData.leave_type } 
          : {})
      };
      
      console.log(' Marking attendance:', attendanceData);
      
      const response = await attendanceService.createAttendance(attendanceData);
      console.log(' Attendance marked:', response);
      
      setShowMarkForm(false);
      fetchAttendance();
      fetchStats();
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        status: ATTENDANCE_STATUS.PRESENT,
        leave_type: ''
      });
      
      alert('✅ Attendance marked successfully!');
    } catch (error) {
      console.error('❌ Error marking attendance:', error);
      console.error('Error response:', error.response?.data);
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      alert(`❌ ${errorMessage}`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case ATTENDANCE_STATUS.PRESENT:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ATTENDANCE_STATUS.ABSENT:
        return <XCircle className="h-4 w-4 text-red-500" />;
      case ATTENDANCE_STATUS.LATE:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case ATTENDANCE_STATUS.ON_LEAVE:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Main content */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 pt-20 md:pt-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded-md"></div>
                </div>
              ))}
            </div>
            <div className="animate-pulse h-96 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Main content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 pt-20 md:pt-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
                  <p className="text-gray-600">Track and manage attendance records</p>
                </div>
              </div>
            </div>
            {!isAdmin && (() => {
              // Check if user has a start_date and if it's in the future
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              if (user.start_date) {
                const startDate = new Date(user.start_date);
                startDate.setHours(0, 0, 0, 0);
                
                if (startDate > today) {
                  // Start date is in the future
                  return (
                    <div className="text-sm">
                      <p className="text-gray-600">Joining Date: {new Date(user.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <p className="text-orange-600 font-medium">⏳ Not yet started</p>
                    </div>
                  );
                }
              }
              
              // User has started or no start date set
              return (
                <Button onClick={() => setShowMarkForm(true)}>
                  Mark Attendance
                </Button>
              );
            })()}
          </div>

          {/* Date Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Filter by:</span>
                </div>
                
                {/* User Filter - Only for HR/Admin/Manager */}
                {(isAdmin || isHR || isManager) && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {!isAdmin && <option value="me">My Attendance</option>}
                      <option value="all">All Employees</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} - {u.role?.charAt(0).toUpperCase() + u.role?.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={dateFilter === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter('day')}
                  >
                    Day
                  </Button>
                  <Button
                    variant={dateFilter === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter('week')}
                  >
                    Week
                  </Button>
                  <Button
                    variant={dateFilter === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter('month')}
                  >
                    Month
                  </Button>
                  <Button
                    variant={dateFilter === 'year' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter('year')}
                  >
                    Year
                  </Button>
                  <Button
                    variant={dateFilter === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter('custom')}
                  >
                    Custom Range
                  </Button>
                </div>
                
                {/* Custom Date Range Inputs */}
                {dateFilter === 'custom' && (
                  <div className="flex items-center gap-2 ml-4">
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-40"
                      placeholder="Start Date"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-40"
                      placeholder="End Date"
                    />
                  </div>
                )}
                <span className="text-sm text-gray-500 ml-auto">
                  {(() => {
                    const { startDate, endDate } = getDateRange();
                    const formatDisplayDate = (dateStr) => {
                      const date = new Date(dateStr);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };
                    return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
                  })()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div 
            key={`stats-${dateFilter}-${selectedUserId}-${stats.presentDays}-${stats.workingDaysCount}`}
            className={`grid grid-cols-1 gap-4 ${
            // Responsive grid: 1 col mobile, 2 cols tablet, 3-5 cols desktop
            (dateFilter === 'day' && selectedUserId === 'all') || (dateFilter !== 'day' && selectedUserId !== 'all')
              ? 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
              : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}>
            {/* Show Attendance % only for specific employee or my attendance */}
            {dateFilter !== 'day' && selectedUserId !== 'all' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance %</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.attendancePercentage ? `${stats.attendancePercentage.toFixed(1)}%` : '0%'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.workingDaysCount > 0 
                      ? `Out of ${stats.workingDaysCount} working days`
                      : dateFilter === 'day' 
                        ? 'Today is a weekend (not a working day)'
                        : 'No working days in selected period'}
                  </p>
                  {stats.weekendDays > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      +{stats.weekendPresent || 0} weekend attendance (not counted)
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Show Total Employees only for Day view when viewing all employees */}
            {(isAdmin || isHR || isManager) && selectedUserId === 'all' && dateFilter === 'day' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {usersList.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total team size
                  </p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.presentDays}</div>
                <p className="text-xs text-muted-foreground mt-1">days present</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.absentDays}</div>
                <p className="text-xs text-muted-foreground mt-1">days absent</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.lateDays}</div>
                <p className="text-xs text-muted-foreground mt-1">days late</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Leave</CardTitle>
                <AlertCircle className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.leaveDays}</div>
                <p className="text-xs text-muted-foreground mt-1">days on leave</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Overview - {dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}</CardTitle>
              <CardDescription>
                Visual breakdown of attendance status for the selected {dateFilter}
                {stats.totalDays > 0 && ` (${stats.totalDays} total days)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={(() => {
                    const now = new Date();
                    const chartData = [];

                    if (dateFilter === 'day') {
                      // Single day summary
                      chartData.push({
                        name: 'Today',
                        Present: stats.presentDays || 0,
                        Absent: stats.absentDays || 0,
                        Late: stats.lateDays || 0,
                        'On Leave': stats.leaveDays || 0
                      });
                    } else if (dateFilter === 'week') {
                      // 7 days of the week
                      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const dayOfWeek = now.getDay();
                      
                      for (let i = 0; i < 7; i++) {
                        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + i);
                        const dateStr = formatDateToYYYYMMDD(date);
                        const dayRecords = attendanceData.filter(record => record.date === dateStr);
                        
                        chartData.push({
                          name: days[i],
                          Present: dayRecords.filter(r => r.status === 'present').length,
                          Absent: dayRecords.filter(r => r.status === 'absent').length,
                          Late: dayRecords.filter(r => r.status === 'late').length,
                          'On Leave': dayRecords.filter(r => r.status === 'on_leave').length
                        });
                      }
                    } else if (dateFilter === 'month') {
                      // Group by weeks in the month
                      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      const totalDays = lastDay.getDate();
                      
                      // Create 4-5 week groups
                      const weeksInMonth = Math.ceil(totalDays / 7);
                      for (let week = 0; week < weeksInMonth; week++) {
                        const weekStart = week * 7 + 1;
                        const weekEnd = Math.min((week + 1) * 7, totalDays);
                        
                        let present = 0, absent = 0, late = 0, onLeave = 0;
                        
                        for (let day = weekStart; day <= weekEnd; day++) {
                          const dateStr = formatDateToYYYYMMDD(new Date(now.getFullYear(), now.getMonth(), day));
                          const dayRecords = attendanceData.filter(record => record.date === dateStr);
                          present += dayRecords.filter(r => r.status === 'present').length;
                          absent += dayRecords.filter(r => r.status === 'absent').length;
                          late += dayRecords.filter(r => r.status === 'late').length;
                          onLeave += dayRecords.filter(r => r.status === 'on_leave').length;
                        }
                        
                        chartData.push({
                          name: `Week ${week + 1}`,
                          Present: present,
                          Absent: absent,
                          Late: late,
                          'On Leave': onLeave
                        });
                      }
                    } else if (dateFilter === 'year') {
                      // 12 months of the year
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      
                      for (let month = 0; month < 12; month++) {
                        const monthRecords = attendanceData.filter(record => {
                          const recordDate = new Date(record.date);
                          return recordDate.getMonth() === month && recordDate.getFullYear() === now.getFullYear();
                        });
                        
                        chartData.push({
                          name: months[month],
                          Present: monthRecords.filter(r => r.status === 'present').length,
                          Absent: monthRecords.filter(r => r.status === 'absent').length,
                          Late: monthRecords.filter(r => r.status === 'late').length,
                          'On Leave': monthRecords.filter(r => r.status === 'on_leave').length
                        });
                      }
                    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
                      // Custom date range - group by days
                      const start = new Date(customStartDate);
                      const end = new Date(customEndDate);
                      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                      
                      // If range is small (< 15 days), show daily data
                      if (daysDiff <= 15) {
                        for (let i = 0; i < daysDiff; i++) {
                          const date = new Date(start);
                          date.setDate(start.getDate() + i);
                          const dateStr = formatDateToYYYYMMDD(date);
                          const dayRecords = attendanceData.filter(record => record.date === dateStr);
                          
                          chartData.push({
                            name: `${date.getDate()}/${date.getMonth() + 1}`,
                            Present: dayRecords.filter(r => r.status === 'present').length,
                            Absent: dayRecords.filter(r => r.status === 'absent').length,
                            Late: dayRecords.filter(r => r.status === 'late').length,
                            'On Leave': dayRecords.filter(r => r.status === 'on_leave').length
                          });
                        }
                      } else {
                        // If range is large (> 15 days), group by weeks
                        const weeks = Math.ceil(daysDiff / 7);
                        for (let week = 0; week < weeks; week++) {
                          let present = 0, absent = 0, late = 0, onLeave = 0;
                          
                          for (let day = 0; day < 7; day++) {
                            const dayIndex = week * 7 + day;
                            if (dayIndex >= daysDiff) break;
                            
                            const date = new Date(start);
                            date.setDate(start.getDate() + dayIndex);
                            const dateStr = formatDateToYYYYMMDD(date);
                            const dayRecords = attendanceData.filter(record => record.date === dateStr);
                            
                            present += dayRecords.filter(r => r.status === 'present').length;
                            absent += dayRecords.filter(r => r.status === 'absent').length;
                            late += dayRecords.filter(r => r.status === 'late').length;
                            onLeave += dayRecords.filter(r => r.status === 'on_leave').length;
                          }
                          
                          const weekStart = new Date(start);
                          weekStart.setDate(start.getDate() + week * 7);
                          
                          chartData.push({
                            name: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
                            Present: present,
                            Absent: absent,
                            Late: late,
                            'On Leave': onLeave
                          });
                        }
                      }
                    }

                    return chartData;
                  })()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Late" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="On Leave" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>
                    {isAdmin || isManager || isHR ? 'All attendance records' : 'Your attendance records'}
                  </CardDescription>
                </div>
                
                {/* Status Filter - Only for HR/Admin/Manager */}
                {(isAdmin || isHR || isManager) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Filter by status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="on_leave">On Leave</option>
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                  <TableRow>
                    {(isAdmin || isManager || isHR) && <TableHead>Employee</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Leave Type</TableHead>
                    {!isAdmin && !isManager && !isHR && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin || isManager || isHR ? 4 : 3} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          {(() => {
                            // Check if the date range is a weekend
                            const { startDate, endDate } = getDateRange();
                            const start = new Date(startDate);
                            const end = new Date(endDate);
                            
                            // Check if it's a single day and it's a weekend
                            if (dateFilter === 'day') {
                              const dayOfWeek = start.getDay();
                              if (dayOfWeek === 0 || dayOfWeek === 6) {
                                const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
                                return (
                                  <>
                                    <Calendar className="h-16 w-16 mb-4 text-blue-300" />
                                    <p className="text-lg font-semibold text-blue-600">Weekend - Holiday 🎉</p>
                                    <p className="text-sm mt-2">Today is {dayName}. No attendance records.</p>
                                    <p className="text-xs text-gray-400 mt-1">Employees enjoy their day off on weekends!</p>
                                  </>
                                );
                              }
                            }
                            
                            // Default no data message
                            return (
                              <>
                                <Calendar className="h-16 w-16 mb-4 text-gray-300" />
                                <p className="text-lg font-semibold">No Attendance Records</p>
                                <p className="text-sm mt-2">
                                  {stats.workingDaysCount === 0 
                                    ? "No working days in this period (weekends only)" 
                                    : "No attendance data found for the selected period."}
                                </p>
                                {stats.weekendDays > 0 && (
                                  <p className="text-xs text-blue-600 mt-2">
                                    Note: {stats.weekendDays} weekend record(s) exist but are not shown (weekends are non-working days)
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceData
                      .filter(record => statusFilter === 'all' || record.status === statusFilter)
                      .map((record) => (
                      <TableRow key={record.id}>
                        {(isAdmin || isManager || isHR) && (
                          <TableCell>
                            <div>
                              <div className="font-medium">{record.user?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{record.user?.email || ''}</div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(record.status)}
                            <div>
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(record.status)}`}>
                                {record.status}
                              </span>
                              {record.status === 'late' && record.late_by_minutes > 0 && (
                                <div className="text-xs text-red-600 mt-1">
                                  ({(() => {
                                    const hours = Math.floor(record.late_by_minutes / 60);
                                    const minutes = record.late_by_minutes % 60;
                                    if (hours > 0) {
                                      return `${hours}h ${minutes}m late`;
                                    }
                                    return `${minutes}m late`;
                                  })()})
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.leave_type || '-'}
                        </TableCell>
                        {!isAdmin && !isManager && !isHR && (
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowDetailsModal(true);
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mark Attendance Modal */}
          {showMarkForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Mark Attendance</CardTitle>
                  <CardDescription>Select a date and mark your attendance status</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleMarkAttendance} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        max={new Date().toISOString().split('T')[0]}
                        min={new Date().toISOString().split('T')[0]}
                        disabled={!isAdmin && !isManager && !isHR}
                        className={!isAdmin && !isManager && !isHR ? 'bg-gray-100 cursor-not-allowed' : ''}
                        required
                      />
                      {!isAdmin && !isManager && !isHR && (
                        <p className="text-xs text-gray-500">You can only mark attendance for today</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        required
                      >
                        <option value={ATTENDANCE_STATUS.PRESENT}>Present</option>
                        <option value={ATTENDANCE_STATUS.ABSENT}>Absent</option>
                        <option value={ATTENDANCE_STATUS.LATE}>Late</option>
                        <option value={ATTENDANCE_STATUS.ON_LEAVE}>On Leave</option>
                      </select>
                    </div>
                    {formData.status === ATTENDANCE_STATUS.ON_LEAVE && (
                      <div className="space-y-2">
                        <Label htmlFor="leave_type">Leave Type</Label>
                        <select
                          id="leave_type"
                          value={formData.leave_type}
                          onChange={(e) => setFormData({...formData, leave_type: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="">Select leave type</option>
                          <option value={LEAVE_TYPES.SICK}>Sick Leave</option>
                          <option value={LEAVE_TYPES.CASUAL}>Casual Leave</option>
                          <option value={LEAVE_TYPES.ANNUAL}>Annual Leave</option>
                          <option value={LEAVE_TYPES.UNPAID}>Unpaid Leave</option>
                        </select>
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <Button type="submit" className="flex-1">
                        Mark Attendance
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowMarkForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance Details Modal */}
          {showDetailsModal && selectedRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Attendance Details</CardTitle>
                  <CardDescription>
                    {formatDate(selectedRecord.date)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Date</span>
                      <span className="text-sm font-semibold">{formatDate(selectedRecord.date)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Status</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedRecord.status)}
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedRecord.status)}`}>
                          {selectedRecord.status}
                        </span>
                      </div>
                    </div>

                    {selectedRecord.status === 'late' && selectedRecord.late_by_minutes > 0 && (
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Late By</span>
                        <span className="text-sm font-semibold text-red-600">
                          {(() => {
                            const hours = Math.floor(selectedRecord.late_by_minutes / 60);
                            const minutes = selectedRecord.late_by_minutes % 60;
                            if (hours > 0) {
                              return `${hours}h ${minutes}m`;
                            }
                            return `${minutes} minutes`;
                          })()}
                        </span>
                      </div>
                    )}

                    {selectedRecord.leave_type && (
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Leave Type</span>
                        <span className="text-sm font-semibold text-blue-600">{selectedRecord.leave_type}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Recorded At</span>
                      <span className="text-sm font-semibold">
                        {new Date(selectedRecord.created_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setShowDetailsModal(false)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Attendance;