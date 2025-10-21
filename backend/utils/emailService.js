const nodemailer = require('nodemailer');

/**
 * Email Service for sending verification codes and notifications
 */

class EmailService {
  constructor() {
    // Check if email is configured
    this.isConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
    
    if (!this.isConfigured) {
      console.warn('⚠️ Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env file');
      this.transporter = null;
      return;
    }

    // Configure email transporter
    // For development, you can use services like Gmail, SendGrid, or Mailtrap
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Email service initialization error:', error);
      this.transporter = null;
    }
  }

  /**
   * Send email verification link
   */
  async sendVerificationEmail(email, userName, verificationLink) {
    if (!this.isConfigured || !this.transporter) {
      console.error('❌ Email service not configured');
      console.log('🔗 VERIFICATION LINK (for development):', verificationLink);
      console.log('📧 Email would be sent to:', email);
      return { 
        success: false, 
        error: 'Email service not configured. Check backend logs for verification link.' 
      };
    }

    try {
      const mailOptions = {
        from: `"AI-HRMS" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email Address - AI-HRMS',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to AI-HRMS!</h1>
              </div>
              <div class="content">
                <p>Hi ${userName},</p>
                <p>Thank you for registering with AI-HRMS. Please verify your email address to complete your registration.</p>
                <p style="text-align: center;">
                  <a href="${verificationLink}" class="button">Verify Email Address</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${verificationLink}</p>
                <p><strong>This link will expire in 24 hours.</strong></p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} AI-HRMS. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset verification code
   */
  async sendPasswordResetCode(email, code, userName) {
    // Check if email service is configured
    if (!this.isConfigured || !this.transporter) {
      console.error('❌ Email service not configured');
      // For development: Log the code to console
      console.log('🔑 PASSWORD RESET CODE (for development):', code);
      console.log('📧 Email would be sent to:', email);
      return { 
        success: false, 
        error: 'Email service not configured. Check backend logs for verification code.' 
      };
    }

    try {
      const mailOptions = {
        from: `"AI HRMS" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Verification Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .code-box { background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
              .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${userName}</strong>,</p>
                <p>We received a request to reset your password for your AI HRMS account.</p>
                
                <div class="code-box">
                  <p style="margin: 0; color: #666; font-size: 14px;">Your verification code is:</p>
                  <div class="code">${code}</div>
                  <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">Valid for 10 minutes</p>
                </div>
                
                <p>Enter this code on the password reset page to continue.</p>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong><br>
                  If you didn't request this password reset, please ignore this email or contact your administrator immediately.
                </div>
                
                <p>Best regards,<br><strong>AI HRMS Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
                <p>&copy; 2025 AI HRMS. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmation(email, userName) {
    try {
      const mailOptions = {
        from: `"AI HRMS" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Successfully Reset',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Password Reset Successful</h1>
              </div>
              <div class="content">
                <div class="success-icon">🎉</div>
                <p>Hello <strong>${userName}</strong>,</p>
                <p>Your password has been successfully reset.</p>
                <p>You can now log in to your AI HRMS account using your new password.</p>
                <p>If you did not make this change, please contact your administrator immediately.</p>
                <p>Best regards,<br><strong>AI HRMS Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
                <p>&copy; 2025 AI HRMS. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset confirmation email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send interview invitation email
   */
  async sendInterviewInvitation(email, candidateName, emailSubject, emailBody) {
    if (!this.isConfigured || !this.transporter) {
      console.error('❌ Email service not configured');
      console.log('📧 Interview invitation would be sent to:', email);
      console.log('📄 Subject:', emailSubject);
      console.log('📄 Body:', emailBody);
      return { 
        success: false, 
        error: 'Email service not configured. Check backend logs for email details.' 
      };
    }

    try {
      const mailOptions = {
        from: `"AI-HRMS Recruitment" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: emailSubject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { max-width: 650px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
              .content { padding: 40px 30px; background: white; }
              .content p { margin: 15px 0; color: #555; }
              .highlight-box { background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px; }
              .highlight-box strong { color: #667eea; }
              .footer { background: #f9f9f9; padding: 25px 30px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #eee; }
              .footer p { margin: 5px 0; }
              .logo { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🚀 AI-HRMS</div>
                <h1>Interview Invitation</h1>
              </div>
              <div class="content">
                ${emailBody}
              </div>
              <div class="footer">
                <p><strong>AI-HRMS Recruitment Team</strong></p>
                <p>This is an automated email generated by AI-HRMS.</p>
                <p>&copy; ${new Date().getFullYear()} AI-HRMS. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Interview invitation email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending interview invitation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready');
      return true;
    } catch (error) {
      console.error('❌ Email service error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
