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

// Register user (Enhanced with email verification)
const register = async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    const { name, email, password, department } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
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
    
    // Generate verification token
    const verificationToken = generateRandomToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // SECURITY: All new signups are 'candidate' by default
    // Only admins can change roles later
    const user = await User.create({
      name,
      email,
      password,
      role: 'candidate', // Force candidate role for all signups
      department: department || 'Candidate', // Default department for job seekers
      email_verified: false,
      verification_token: verificationToken,
      verification_token_expires: verificationExpires
    });
    
    console.log('User created successfully:', user);
    
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
    
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        email: user.email,
        requiresVerification: true
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

// Login user (Enhanced with security features)
const login = async (req, res) => {
  try {
    console.log('Login request received:', { email: req.body.email });
    
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      await logAudit({
        action: 'LOGIN_FAILED',
        details: { email, reason: 'User not found' },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.account_locked_until) - new Date()) / 60000);
      await logAudit({
        user_id: user.id,
        action: 'LOGIN_BLOCKED',
        details: { reason: 'Account locked', minutesLeft },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      return res.status(403).json({
        success: false,
        message: `Account is locked due to multiple failed login attempts. Please try again in ${minutesLeft} minutes.`,
        accountLocked: true,
        minutesLeft
      });
    }
    
    // Check if password is correct
    const isPasswordValid = await User.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const updates = { failed_login_attempts: failedAttempts };
      
      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updates.account_locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }
      
      await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);
      
      await logAudit({
        user_id: user.id,
        action: 'LOGIN_FAILED',
        details: { reason: 'Invalid password', attempts: failedAttempts },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      return res.status(401).json({
        success: false,
        message: failedAttempts >= 5 
          ? 'Account locked due to multiple failed login attempts. Please try again in 30 minutes.'
          : 'Invalid credentials'
      });
    }
    
    // Check email verification
    if (!user.email_verified) {
      await logAudit({
        user_id: user.id,
        action: 'LOGIN_BLOCKED',
        details: { reason: 'Email not verified' },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        requiresVerification: true,
        email: user.email
      });
    }
    
    // Reset failed attempts and update last login
    await supabase
      .from('users')
      .update({
        failed_login_attempts: 0,
        account_locked_until: null,
        last_login: new Date()
      })
      .eq('id', user.id);
    
    // Generate token
    const token = generateToken(user.id);
    
    // Remove password hash from response
    if (user.password_hash) {
      delete user.password_hash;
    }
    
    // Log successful login
    await logAudit({
      user_id: user.id,
      action: 'LOGIN_SUCCESS',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    console.log('User logged in successfully:', { id: user.id, email: user.email });
    
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