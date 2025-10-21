const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');
const { 
  register, 
  login, 
  getMe, 
  requestPasswordReset, 
  verifyResetCode, 
  resetPassword,
  verifyEmail,
  resendVerification
} = require('../controllers/authController');

const router = express.Router();

// Register user
router.post('/register', validate(schemas.register), register);

// Login user
router.post('/login', validate(schemas.login), login);

// Get current user
router.get('/me', authenticate, getMe);

// Email verification routes (public - no authentication required)
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Password reset routes (public - no authentication required)
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// Google OAuth route
router.post('/google/verify', async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    const User = require('../models/User');
    const jwt = require('jsonwebtoken');

    if (!email || !name || !googleId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    console.log('🔐 Google OAuth verification:', email);

    // Check if user exists
    let user = await User.findByEmail(email);

    let isNewUser = false;
    
    if (user) {
      console.log('✅ Existing user found');
      // Update google_id if not set
      if (!user.google_id) {
        await User.update(user.id, { google_id: googleId });
      }
    } else {
      console.log('➕ Creating new user from Google OAuth');
      isNewUser = true;
      // Create new user with default values
      user = await User.create({
        name,
        email,
        google_id: googleId,
        role: 'employee',
        department: 'Not Set'
        // No password for OAuth users
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user,
        token,
        isNewUser // Flag to indicate if profile needs completion
      }
    });

  } catch (error) {
    console.error('❌ Google verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify Google authentication',
      error: error.message
    });
  }
});

module.exports = router;