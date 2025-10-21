import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Calendar, TrendingUp, Target, Eye, X } from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { Button } from '../ui/button';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    teamSize: 0,
    attendancePercentage: 0,
    averagePerformance: 0,
    weeklyAttendance: [],
    teamMembers: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching manager dashboard data...');
      const response = await dashboardService.getManagerDashboard();
      console.log('📊 Manager dashboard response:', response);
      
      if (response && response.success && response.data) {
        console.log('✅ Setting manager dashboard data:', response.data);
        setDashboardData(response.data);
      } else {
        console.warn('⚠️ Invalid response format:', response);
      }
    } catch (error) {
      console.error('❌ Error fetching manager dashboard data:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // Use real data from API
  const teamAttendanceData = dashboardData.weeklyAttendance || [];
  const teamMembers = dashboardData.teamMembers || [];

  const handleViewMember = (member) => {
    setSelectedMember(member);
  };

  const handleCloseMemberModal = () => {
    setSelectedMember(null);
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
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="text-gray-600">Overview of your team's performance and attendance</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.teamSize}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.attendancePercentage}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.averagePerformance}/5</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Performance Highlights</CardTitle>
            <CardDescription>Top and bottom performers this month</CardDescription>
          </CardHeader>
          <CardContent>
            {teamMembers.length > 0 ? (
              <div className="space-y-4">
                {/* Top Performers */}
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Top Performers
                  </h4>
                  <div className="space-y-2">
                    {teamMembers
                      .filter(m => m.performance > 0 || m.attendance > 0) // Exclude employees who haven't started (0% attendance AND 0 rating)
                      .sort((a, b) => {
                        // Sort by performance first, then by attendance as tiebreaker
                        if (b.performance !== a.performance) {
                          return b.performance - a.performance;
                        }
                        return b.attendance - a.attendance;
                      })
                      .slice(0, 3)
                      .map((member, index) => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-green-600">#{index + 1}</span>
                            <div>
                              <p className="font-medium text-sm">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.attendance}% attendance</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">{member.performance}</p>
                            <p className="text-xs text-gray-500">rating</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Needs Attention */}
                {teamMembers.length > 3 && (
                  <div>
                    <h4 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Needs Attention
                    </h4>
                    <div className="space-y-2">
                      {teamMembers
                        .filter(m => m.performance > 0 || m.attendance > 0) // Exclude employees who haven't started
                        .sort((a, b) => {
                          // Sort by performance first (lowest first), then by attendance
                          if (a.performance !== b.performance) {
                            return a.performance - b.performance;
                          }
                          return a.attendance - b.attendance;
                        })
                        .slice(0, 2)
                        .map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.attendance}% attendance</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-orange-600">{member.performance}</p>
                              <p className="text-xs text-gray-500">rating</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No performance data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team Overview</CardTitle>
            <CardDescription>Performance and attendance summary</CardDescription>
          </CardHeader>
          <CardContent>
            {teamMembers.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Team Performance Overview</p>
                  <p className="text-4xl font-bold text-blue-600 mt-2">{dashboardData.averagePerformance}/5</p>
                  <p className="text-xs text-gray-500 mt-1">Average Team Rating</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{dashboardData.attendancePercentage}%</p>
                    <p className="text-xs text-gray-600 mt-1">Team Attendance</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{teamMembers.length}</p>
                    <p className="text-xs text-gray-600 mt-1">Team Members</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No team data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Performance and attendance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Performance</th>
                  <th className="text-left p-2">Attendance</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <tr key={member.id} className="border-b">
                      <td className="p-2 font-medium">{member.name}</td>
                      <td className="p-2">{member.role || 'Employee'}</td>
                      <td className="p-2">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(member.performance / 5) * 100}%` }}
                            ></div>
                          </div>
                          <span>{member.performance}/5</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${member.attendance}%` }}
                            ></div>
                          </div>
                          <span>{member.attendance}%</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <button 
                          onClick={() => handleViewMember(member)}
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-500">
                      No team members found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Member Details</CardTitle>
                <CardDescription>{selectedMember.name}</CardDescription>
              </div>
              <button 
                onClick={handleCloseMemberModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selectedMember.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedMember.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <p className="font-medium">{selectedMember.role || 'Employee'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium">{selectedMember.department}</p>
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Performance</h3>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Overall Rating</span>
                    <span className="font-bold text-lg">{selectedMember.performance}/5</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-600 h-4 rounded-full transition-all"
                      style={{ width: `${(selectedMember.performance / 5) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>
              </div>

              {/* Attendance */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Attendance</h3>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Attendance Rate</span>
                    <span className="font-bold text-lg">{selectedMember.attendance}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-600 h-4 rounded-full transition-all"
                      style={{ width: `${selectedMember.attendance}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      handleCloseMemberModal();
                      navigate('/performance');
                    }}
                    className="w-full"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Performance
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      handleCloseMemberModal();
                      navigate('/attendance');
                    }}
                    className="w-full"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View Attendance
                  </Button>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleCloseMemberModal}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;