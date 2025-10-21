import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Clock, Users, Calendar, TrendingUp, Plus, Edit, UserPlus } from 'lucide-react';
import api from '../services/api';

const ShiftManagement = () => {
  const { user } = useAuth();
  const { isAdmin, isHR, isManager } = useRole();
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [myShift, setMyShift] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    start_time: '09:00',
    end_time: '18:00',
    late_threshold_minutes: 15
  });
  const [assignData, setAssignData] = useState({
    user_id: '',
    shift_id: '',
    effective_from: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchShifts();
    fetchMyShift();
    if (isAdmin || isHR) {
      fetchUsers();
    }
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shifts');
      setShifts(response.data.data.shifts || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMyShift = async () => {
    try {
      const response = await api.get(`/shifts/user/${user.id}`);
      setMyShift(response.data.data.userShift);
    } catch (error) {
      console.error('Error fetching my shift:', error);
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shifts', formData);
      setShowShiftForm(false);
      fetchShifts();
      setFormData({
        name: '',
        start_time: '09:00',
        end_time: '18:00',
        late_threshold_minutes: 15
      });
    } catch (error) {
      console.error('Error creating shift:', error);
      alert('Failed to create shift');
    }
  };

  const handleAssignShift = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shifts/assign', assignData);
      setShowAssignForm(false);
      
      // Always refresh shifts and my shift after assignment
      await fetchShifts();
      await fetchMyShift();
      
      setAssignData({
        user_id: '',
        shift_id: '',
        effective_from: new Date().toISOString().split('T')[0]
      });
      
      alert('Shift assigned successfully!');
    } catch (error) {
      console.error('Error assigning shift:', error);
      alert('Failed to assign shift');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shift Management</h1>
              <p className="text-gray-600">Manage employee shifts and schedules</p>
            </div>
          </div>
        </div>
        {(isAdmin || isHR) && (
          <div className="flex gap-2">
            <Button onClick={() => setShowShiftForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Shift
            </Button>
            <Button onClick={() => setShowAssignForm(true)} variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Shift
            </Button>
          </div>
        )}
      </div>

      {/* My Shift Card - Only for employees (not HR/Admin/Manager) */}
      {!isAdmin && !isHR && !isManager && (
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            My Current Shift
          </CardTitle>
          <CardDescription>Your assigned shift timing</CardDescription>
        </CardHeader>
        <CardContent>
          {myShift ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Shift Name</div>
                  <div className="text-lg font-semibold text-gray-900">{myShift.shifts?.name}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Timing</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {myShift.shifts?.start_time} - {myShift.shifts?.end_time}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Late Threshold</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {myShift.shifts?.late_threshold_minutes} minutes
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500 mb-2">Working Days</div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    try {
                      const days = typeof myShift.shifts?.working_days === 'string' 
                        ? JSON.parse(myShift.shifts.working_days) 
                        : myShift.shifts?.working_days;
                      
                      // If no working days, show default Mon-Fri
                      if (!days || !Array.isArray(days) || days.length === 0) {
                        return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, index) => (
                          <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            {day}
                          </span>
                        ));
                      }
                      
                      return days.map((day, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          {day}
                        </span>
                      ));
                    } catch (e) {
                      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          {day}
                        </span>
                      ));
                    }
                  })()}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Effective from: {new Date(myShift.effective_from).toLocaleDateString('en-GB')}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No shift assigned yet</p>
              <p className="text-sm text-gray-500 mt-1">Please contact HR to assign your shift</p>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Shifts List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Shifts</CardTitle>
          <CardDescription>All configured shift timings</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift Name</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Late Threshold</TableHead>
                <TableHead>Working Days</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>{shift.start_time}</TableCell>
                  <TableCell>{shift.end_time}</TableCell>
                  <TableCell>{shift.late_threshold_minutes} min</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {(() => {
                        try {
                          const days = typeof shift.working_days === 'string' 
                            ? JSON.parse(shift.working_days) 
                            : shift.working_days;
                          return Array.isArray(days) ? days.join(', ') : 'Mon-Fri';
                        } catch (e) {
                          return 'Mon-Fri';
                        }
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Active
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Shift Modal */}
      {showShiftForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Shift</CardTitle>
              <CardDescription>Define a new shift timing</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateShift} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Shift Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Morning Shift"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="late_threshold">Late Threshold (minutes)</Label>
                  <Input
                    id="late_threshold"
                    type="number"
                    value={formData.late_threshold_minutes}
                    onChange={(e) => setFormData({...formData, late_threshold_minutes: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">Create Shift</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowShiftForm(false)}
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

      {/* Assign Shift Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Assign Shift to Employee</CardTitle>
              <CardDescription>Assign a shift timing to an employee</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignShift} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">Employee</Label>
                  <select
                    id="user_id"
                    value={assignData.user_id}
                    onChange={(e) => setAssignData({...assignData, user_id: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select Employee</option>
                    {users
                      .filter(u => u.role === 'employee') // Only show employees, not HR/Admin/Manager
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift_id">Shift</Label>
                  <select
                    id="shift_id"
                    value={assignData.shift_id}
                    onChange={(e) => setAssignData({...assignData, shift_id: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select Shift</option>
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effective_from">Effective From</Label>
                  <Input
                    id="effective_from"
                    type="date"
                    value={assignData.effective_from}
                    onChange={(e) => setAssignData({...assignData, effective_from: e.target.value})}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">Assign Shift</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAssignForm(false)}
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
    </div>
  );
};

export default ShiftManagement;
