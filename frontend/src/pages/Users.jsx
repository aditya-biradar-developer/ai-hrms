import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Users as UsersIcon, Plus, Edit, Trash2, Mail, Shield } from 'lucide-react'; // Rename Users import
import { userService } from '../services/userService';
import { formatDate, getRoleDisplayName } from '../utils/helpers';
import { ROLES, DEPARTMENTS } from '../utils/constants';

const UsersPage = () => { // Rename component to avoid conflict
  const { user: currentUser } = useAuth();
  const { isAdmin, isHR } = useRole();
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.EMPLOYEE,
    department: DEPARTMENTS[0],
    start_date: new Date().toISOString().split('T')[0] // Default to today
  });

  useEffect(() => {
    if (isAdmin || isHR) {
      fetchUsers();
    }
  }, [isAdmin, isHR]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers();
      setUsersData(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userService.updateUser(editingUser.id, formData);
        alert('User updated successfully!');
        
        // If updating current user, they need to logout/login to see changes
        if (editingUser.id === currentUser.id) {
          alert('You updated your own account. Please logout and login again to see the changes.');
        }
      } else {
        await userService.createUser(formData);
        alert('User created successfully!');
      }
      
      setShowUserForm(false);
      setEditingUser(null);
      
      // Force refresh the users list
      await fetchUsers();
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        role: ROLES.EMPLOYEE, // Default to Employee for admin-created users
        department: DEPARTMENTS[0],
        start_date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user. Please try again.');
    }
  };

  const handleEditUser = (user) => {
    // HR cannot edit admin users
    if (isHR && user.role === 'admin') {
      alert('You do not have permission to edit administrator accounts.');
      return;
    }
    
    // Users cannot edit their own account (prevents self-privilege escalation)
    if (user.id === currentUser.id) {
      alert('You cannot edit your own account. Please contact an administrator to make changes to your account.');
      return;
    }
    
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department,
      start_date: user.start_date || new Date().toISOString().split('T')[0]
    });
    setShowUserForm(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.deleteUser(userId);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  // HR cannot see admin users (role hierarchy)
  const accessibleUsers = isHR 
    ? usersData.filter(user => user.role !== 'admin')
    : usersData;

  const filteredUsers = accessibleUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return 'bg-purple-100 text-purple-800';
      case ROLES.MANAGER:
        return 'bg-blue-100 text-blue-800';
      case ROLES.HR:
        return 'bg-green-100 text-green-800';
      case ROLES.EMPLOYEE:
        return 'bg-gray-100 text-gray-800';
      case ROLES.CANDIDATE:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAdmin && !isHR) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <UsersIcon className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Users</h1>
              <p className="text-gray-600">Manage system users and permissions</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button onClick={() => setShowUserForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user accounts and their roles</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No users match your search criteria' : 'No users have been created yet'}
              </p>
              <Button onClick={() => setShowUserForm(true)}>
                Add First User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${getRoleColor(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      {user.start_date ? formatDate(user.start_date) : (
                        <span className="text-gray-400 text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {/* Users cannot edit their own account */}
                        {user.id !== currentUser.id ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500 px-2 py-1">Your Account</span>
                        )}
                        {/* Admins can delete any user except themselves and other admins */}
                        {/* HR can delete users except admins and themselves */}
                        {((isAdmin && user.id !== currentUser.id && user.role !== 'admin') ||
                          (isHR && user.id !== currentUser.id && user.role !== 'admin')) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit User Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingUser ? 'Edit User' : 'Add New User'}</CardTitle>
              <CardDescription>
                {editingUser ? 'Update user information' : 'Create a new user account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editingUser ? 'New Password (leave empty to keep current)' : 'Password'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder={editingUser ? 'Leave empty to keep current password' : 'Enter password'}
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    required
                  >
                    <option value={ROLES.CANDIDATE}>Candidate</option>
                    <option value={ROLES.EMPLOYEE}>Employee</option>
                    <option value={ROLES.MANAGER}>Manager</option>
                    <option value={ROLES.HR}>HR Recruiter</option>
                    {isAdmin && <option value={ROLES.ADMIN}>Administrator</option>}
                  </select>
                  {isHR && (
                    <p className="text-xs text-gray-500 mt-1">
                      Note: Only administrators can create or manage admin accounts.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    required
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">
                    Start Date {formData.role !== ROLES.CANDIDATE && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required={formData.role !== ROLES.CANDIDATE}
                    max={new Date().toISOString().split('T')[0]} // Cannot select future dates
                  />
                  <p className="text-xs text-gray-500">
                    {formData.role === ROLES.CANDIDATE 
                      ? 'Optional for candidates. Will be set when hired.' 
                      : 'Attendance tracking will start from this date.'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="submit" className="w-full sm:flex-1">
                    {editingUser ? 'Update User' : 'Create User'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowUserForm(false);
                      setEditingUser(null);
                      setFormData({
                        name: '',
                        email: '',
                        password: '',
                        role: ROLES.EMPLOYEE,
                        department: DEPARTMENTS[0],
                        start_date: new Date().toISOString().split('T')[0]
                      });
                    }}
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

export default UsersPage; // Export with the new name