const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const NotificationHelper = require('../utils/notificationHelper');
const emailService = require('../utils/emailService');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/db');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Helper: Generate random token
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper: Log audit event
const logAudit = async (data) => {
  try {
    await supabase.from('audit_logs').insert(data);
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

// Register user
const register = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create the user
    const user = await User.create({
      name,
      email,
      password,
      role: 'candidate',
      department: department || 'Candidate',
      email_verified: true
    });
    
    if (!user) {
      throw new Error('Failed to create user');
    }
    
    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail(email, name, verificationLink);
    
    // Create notifications for admins and HR about new user
    await NotificationHelper.notifyNewUser(user);
    
    // Log audit
    await logAudit({
      user_id: user.id,
      action: 'USER_REGISTERED',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      details: { email, role: 'candidate' }
    });
    
    // Generate token for auto-login
    const token = generateToken(user.id);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in.',
      data: {
        email: user.email,
        token: token,
        user: user
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Login user (Optimized for performance)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    // Check if user exists and get their data
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Quick check for locked account
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.account_locked_until) - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account is locked. Please try again in ${minutesLeft} minutes.`,
        accountLocked: true,
        minutesLeft
      });
    }
    
    // Verify password
    const isPasswordValid = await User.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      // Only update failed attempts for critical failures
      if (user.failed_login_attempts >= 3) {
        const updates = { 
          failed_login_attempts: user.failed_login_attempts + 1,
          account_locked_until: user.failed_login_attempts >= 4 ? new Date(Date.now() + 30 * 60 * 1000) : null
        };
        await supabase.from('users').update(updates).eq('id', user.id);
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    // Remove sensitive data
    delete user.password_hash;
    
    // Update user status (async, don't wait)
    supabase.from('users').update({
      failed_login_attempts: 0,
      account_locked_until: null,
      last_login: new Date()
    }).eq('id', user.id).then(() => {
      // Log successful login asynchronously
      logAudit({
        user_id: user.id,
        action: 'LOGIN_SUCCESS',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    });
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
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
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Request password reset (send verification code)
const requestPasswordReset = async (req, res) => {
  try {
    console.log('🔐 Password reset request received');
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }
    
    console.log('📧 Looking up user:', email);
    
    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('⚠️ User not found, but returning success for security');
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a verification code has been sent'
      });
    }
    
    console.log('✅ User found:', user.name);
    
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔑 Generated code:', code);
    
    // Store reset token in database
    console.log('💾 Storing reset token in database...');
    await PasswordReset.create(email, code);
    console.log('✅ Reset token stored');
    
    // Send email with verification code
    console.log('📨 Sending email...');
    const emailResult = await emailService.sendPasswordResetCode(email, code, user.name);
    console.log('📨 Email result:', emailResult);
    
    if (!emailResult.success) {
      console.error('❌ Failed to send email:', emailResult.error);
      
      // Always log code to console for development/debugging
      console.log('🔑 PASSWORD RESET CODE:', code);
      console.log('📧 For user:', email);
      
      // For development: Still allow password reset even if email fails
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ DEV MODE: Allowing password reset despite email failure');
        return res.status(200).json({
          success: true,
          message: 'Email service encountered an issue. Check backend console for verification code.',
          devMode: true,
          code: code // Only in development!
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code. Please contact administrator.'
      });
    }
    
    console.log(`✅ Password reset code sent to ${email}`);
    
    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email address'
    });
  } catch (error) {
    console.error('❌ Request password reset error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Verify reset code
const verifyResetCode = async (req, res) => {
  try {
    console.log('🔍 Verifying reset code...');
    const { email, code } = req.body;
    
    console.log('📧 Email:', email);
    console.log('🔑 Code received:', code);
    console.log('🔑 Code type:', typeof code, 'Length:', code?.length);
    
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and verification code'
      });
    }
    
    // Verify the code
    console.log('💾 Looking up reset token in database...');
    const resetToken = await PasswordReset.verify(email, code);
    
    console.log('💾 Reset token found:', resetToken ? 'YES' : 'NO');
    
    if (!resetToken) {
      console.log('❌ Invalid or expired code');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }
    
    console.log('✅ Code is valid');
    res.status(200).json({
      success: true,
      message: 'Verification code is valid'
    });
  } catch (error) {
    console.error('❌ Verify reset code error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Reset password with verification code
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, verification code, and new password'
      });
    }
    
    // Verify the code
    const resetToken = await PasswordReset.verify(email, code);
    
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }
    
    // Get user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user password
    await User.update(user.id, { password_hash: hashedPassword });
    
    // Mark token as used
    await PasswordReset.markAsUsed(email, code);
    
    // Send confirmation email
    await emailService.sendPasswordResetConfirmation(email, user.name);
    
    console.log(`✅ Password reset successful for ${email}`);
    
    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Verify Email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }
    
    // Find user with this token
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('verification_token', token);
    
    if (!users || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }
    
    const user = users[0];
    
    // Check if token expired
    if (new Date(user.verification_token_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired. Please request a new one.',
        expired: true
      });
    }
    
    // Update user
    await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null
      })
      .eq('id', user.id);
    
    // Log audit
    await logAudit({
      user_id: user.id,
      action: 'EMAIL_VERIFIED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Generate token for auto-login
    const jwtToken = generateToken(user.id);
    
    // Remove sensitive data
    delete user.password_hash;
    delete user.verification_token;
    user.email_verified = true;
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      data: {
        user,
        token: jwtToken
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Resend Verification Email
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }
    
    // Generate new verification token
    const verificationToken = generateRandomToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await supabase
      .from('users')
      .update({
        verification_token: verificationToken,
        verification_token_expires: verificationExpires
      })
      .eq('id', user.id);
    
    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail(email, user.name, verificationLink);
    
    res.status(200).json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
  verifyEmail,
  resendVerification
};