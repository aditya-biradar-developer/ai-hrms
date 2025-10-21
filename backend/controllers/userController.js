const User = require('../models/User');

// Create user (Admin/HR only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, start_date } = req.body;
    
    // Only admin and HR can create users directly
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators and HR can create users directly.'
      });
    }
    
    // Validate input
    if (!name || !email || !password || !role || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, role, department'
      });
    }
    
    // Validate start_date if provided (for employees, managers, HR)
    if (role !== 'candidate' && !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date is required for employees, managers, and HR personnel'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Role restrictions
    // Only admins can create admin users
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create admin accounts'
      });
    }
    
    // Create user with specified role
    const user = await User.create({
      name,
      email,
      password,
      role, // Use the role specified by admin/HR
      department,
      start_date, // Employee start date for attendance tracking
      email_verified: true // Admin-created users are auto-verified
    });
    
    console.log(`✅ User created by ${req.user.role}:`, { id: user.id, email: user.email, role: user.role });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    
    console.log('📋 Getting users:', { role: userRole, userId });
    
    // SECURITY: Employees can ONLY see their own data
    if (userRole === 'employee') {
      console.log('🔒 Employee access - returning only own data');
      const user = await User.findById(userId);
      
      console.log('👤 Employee user data:', {
        found: !!user,
        id: user?.id,
        name: user?.name,
        role: user?.role
      });
      
      return res.status(200).json({
        success: true,
        data: {
          users: user ? [user] : []
        }
      });
    }
    
    let users = await User.getAll();
    
    // If manager, filter to show employees in their department + themselves
    if (userRole === 'manager') {
      const manager = await User.findById(userId);
      const managerDept = manager?.department;
      
      console.log('👔 Manager filtering users:', {
        managerDept,
        totalUsers: users.length
      });
      
      users = users.filter(u => 
        u.department === managerDept && 
        (u.role === 'employee' || u.id === userId) // Include employees + manager themselves
      );
      
      console.log('✅ Filtered users (team + manager):', users.length);
    }
    
    // Admin and HR can see all users
    res.status(200).json({
      success: true,
      data: {
        users
      }
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        user
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

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only update their own profile unless they're admin or HR
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Role change restrictions
    if (req.body.role) {
      // Only admins can assign admin role
      if (req.body.role === 'admin' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can assign admin role'
        });
      }
      
      // HR can change roles (except to admin)
      // Regular users cannot change roles at all
      if (req.user.role !== 'admin' && req.user.role !== 'hr') {
        delete req.body.role;
      }
    }
    
    const user = await User.update(id, req.body);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user
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

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { supabase } = require('../config/db');
    
    // Only admins and HR can delete users
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators and HR can delete users.'
      });
    }
    
    // Users cannot delete themselves
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    // Get the user being deleted
    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // HR cannot delete admin users (role hierarchy)
    if (req.user.role === 'hr' && userToDelete.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'HR cannot delete administrator accounts'
      });
    }
    
    // Delete related records first to avoid foreign key constraints
    // Delete audit logs for this user
    await supabase
      .from('audit_logs')
      .delete()
      .eq('user_id', id);
    
    // Delete applications if user is a candidate
    await supabase
      .from('applications')
      .delete()
      .eq('candidate_id', id);
    
    // Delete attendance records
    await supabase
      .from('attendance')
      .delete()
      .eq('user_id', id);
    
    // Delete leave requests
    await supabase
      .from('leave_requests')
      .delete()
      .eq('user_id', id);
    
    // Delete notifications
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', id);
    
    // Finally, delete the user
    await User.delete(id);
    
    console.log(`✅ User deleted by ${req.user.role}:`, { id, email: userToDelete.email, role: userToDelete.role });
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};