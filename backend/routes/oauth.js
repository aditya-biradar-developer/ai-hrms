const express = require('express');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
// @access  Public
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/login?error=oauth_failed'
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user.id);
      
      console.log('✅ OAuth successful, redirecting with token');
      
      // Redirect to frontend with token
      // Frontend will extract token from URL and store it
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendURL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`);
      
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      res.redirect('/login?error=token_generation_failed');
    }
  }
);

// @route   POST /api/auth/google/verify
// @desc    Verify Google token from frontend
// @access  Public
router.post('/google/verify', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'No credential provided'
      });
    }
    
    // Verify the Google token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const googleId = payload.sub;
    
    console.log('🔐 Google token verified:', email);
    
    // Check if user exists
    const User = require('../models/User');
    let user = await User.findByEmail(email);
    
    if (user) {
      // Existing user - link Google account if not linked
      if (!user.google_id) {
        await User.update(user.id, { google_id: googleId });
        console.log('🔗 Linked Google account to existing user:', email);
      }
      console.log('✅ Existing user logged in via Google:', email);
    } else {
      // No account exists - require signup first
      console.log('❌ No account found for Google login:', email);
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please sign up first using email and password.',
        requiresSignup: true
      });
    }
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    console.log('📤 Sending user data to frontend:', {
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department
    });
    
    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user,
        token
      }
    });
    
  } catch (error) {
    console.error('❌ Google verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify Google token',
      error: error.message
    });
  }
});

module.exports = router;
