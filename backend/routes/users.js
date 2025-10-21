const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { validate, schemas } = require('../middlewares/validation');
const { createUser, getAllUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Update user profile - MUST be before /:id routes
router.put('/profile', async (req, res) => {
  try {
    const User = require('../models/User');
    
    const { name, email, department } = req.body;
    const userId = req.user.id;
    
    // Check if user is updating their own profile or is admin
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedUser = await User.update(userId, {
      name,
      email,
      department
    });
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
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
});

// Change password - MUST be before /:id routes
router.post('/change-password', async (req, res) => {
  try {
    const User = require('../models/User');
    
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Get current user with password_hash
    const { data: userData, error } = await require('../config/db').supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isPasswordValid = await User.verifyPassword(currentPassword, userData.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    await User.update(userId, { password: newPassword });
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
});

// Create user (admin and HR only)
router.post('/', authorize('admin', 'hr'), createUser);

// Get all users (admin/HR see all, manager sees team, employee sees only themselves)
router.get('/', authorize('admin', 'hr', 'manager', 'employee'), getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user
router.put('/:id', updateUser);

// Delete user (admin and HR only)
router.delete('/:id', authorize('admin', 'hr'), deleteUser);

module.exports = router;