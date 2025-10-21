const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const { supabase } = require('../config/db');

// Generate random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate JWT
const generateJWT = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

/**
 * ENHANCED REGISTRATION - Industry Best Practices
 * - Separate flows for Candidates vs Employees
 * - Email verification required
 * - Company code validation for employees
 * - Invitation-based for employees
 */

// Public Candidate Registration (Job Seekers)
const registerCandidate = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;
    
    // Validate input
    if (!name || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Generate verification token
    const verificationToken = generateToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Create candidate user
    const user = await User.create({
      name,
      email,
      password,
      role: 'candidate',
      department,
      email_verified: false,
      verification_token: verificationToken,
      verification_token_expires: verificationExpires
    });
    
    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await emailService.sendVerificationEmail(email, name, verificationLink);
    
    // Log audit
    await logAudit({
      user_id: user.id,
      action: 'CANDIDATE_REGISTERED',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
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
    console.error('Candidate registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Employee Registration (Invitation-based)
const registerEmployee = async (req, res) => {
  try {
    const { name, email, password, invitationToken, companyCode } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Get company settings
    const { data: settings } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_code', companyCode)
      .single();
    
    if (!settings && companyCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company code'
      });
    }
    
    // Verify invitation token if required
    let invitationData = null;
    if (invitationToken) {
      const { data: invitation } = await supabase
        .from('invitation_tokens')
        .select('*')
        .eq('token', invitationToken)
        .eq('email', email)
        .eq('used', false)
        .single();
      
      if (!invitation) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired invitation token'
        });
      }
      
      if (new Date(invitation.expires_at) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Invitation token has expired'
        });
      }
      
      invitationData = invitation;
    } else if (settings?.require_company_code_for_signup) {
      return res.status(400).json({
        success: false,
        message: 'Company code or invitation required for employee registration'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create employee user with role from invitation
    const role = invitationData?.role || 'employee';
    const department = invitationData?.department || req.body.department;
    
    const user = await User.create({
      name,
      email,
      password,
      role,
      department,
      email_verified: true // Auto-verify for invited employees
    });
    
    // Mark invitation as used
    if (invitationData) {
      await supabase
        .from('invitation_tokens')
        .update({ used: true, used_at: new Date() })
        .eq('id', invitationData.id);
    }
    
    // Log audit
    await logAudit({
      user_id: user.id,
      action: 'EMPLOYEE_REGISTERED',
      details: { invitationUsed: !!invitationToken },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    const token = generateJWT(user.id);
    
    res.status(201).json({
      success: true,
      message: 'Employee registration successful!',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Employee registration error:', error);
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
        message: 'Verification token has expired. Please request a new one.'
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
    
    const jwtToken = generateJWT(user.id);
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: {
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

// Enhanced Login with security features
const enhancedLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.account_locked_until) - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account is locked. Please try again in ${minutesLeft} minutes.`
      });
    }
    
    // Verify password
    const isPasswordValid = await User.comparePassword(password, user.password);
    
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
        message: 'Invalid credentials'
      });
    }
    
    // Check email verification
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        requiresVerification: true
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
    
    // Log successful login
    await logAudit({
      user_id: user.id,
      action: 'LOGIN_SUCCESS',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    const token = generateJWT(user.id);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        },
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

// Helper function to log audit events
const logAudit = async (data) => {
  try {
    await supabase.from('audit_logs').insert(data);
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

module.exports = {
  registerCandidate,
  registerEmployee,
  verifyEmail,
  enhancedLogin,
  logAudit
};
