const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Notification Helper
 * Centralized utility to create notifications for various system events
 */

class NotificationHelper {
  /**
   * Create notifications for new user registration
   */
  static async notifyNewUser(newUser) {
    try {
      const allUsers = await User.getAll();
      const adminAndHRUsers = allUsers.filter(u => ['admin', 'hr'].includes(u.role));
      
      const notifications = adminAndHRUsers.map(user => ({
        user_id: user.id,
        category: 'users',
        title: 'New User Registered',
        message: `${newUser.name} (${newUser.role}) has joined the ${newUser.department} department`,
        is_read: false
      }));
      
      if (notifications.length > 0) {
        await Notification.createBulk(notifications);
        console.log(`✅ Created ${notifications.length} notifications for new user`);
      }
    } catch (error) {
      console.error('⚠️ Failed to create user notifications:', error);
    }
  }

  /**
   * Create notifications for new payroll/payslip
   */
  static async notifyNewPayroll(payroll, employeeName) {
    try {
      // Notify the employee about their new payslip
      await Notification.create({
        user_id: payroll.user_id,
        category: 'payroll',
        title: 'New Payslip Available',
        message: `Your payslip for ${payroll.month}/${payroll.year} is now available. Net Salary: ₹${payroll.net_salary}`,
        is_read: false
      });
      
      console.log(`✅ Created payroll notification for employee ${payroll.user_id}`);
    } catch (error) {
      console.error('⚠️ Failed to create payroll notification:', error);
    }
  }

  /**
   * Create notifications for new performance review
   */
  static async notifyNewPerformance(performance, employeeName, reviewerName) {
    try {
      // Notify the employee about their new performance review
      await Notification.create({
        user_id: performance.user_id,
        category: 'performance',
        title: 'New Performance Review',
        message: `${reviewerName} has submitted a performance review for you. Overall Rating: ${performance.overall_rating}/5`,
        is_read: false
      });
      
      console.log(`✅ Created performance notification for employee ${performance.user_id}`);
    } catch (error) {
      console.error('⚠️ Failed to create performance notification:', error);
    }
  }

  /**
   * Create notifications for leave request
   */
  static async notifyLeaveRequest(leave, employeeName) {
    try {
      const allUsers = await User.getAll();
      
      // Notify admins, HR, and the employee's manager
      const notifyUsers = allUsers.filter(u => 
        ['admin', 'hr', 'manager'].includes(u.role)
      );
      
      const notifications = notifyUsers.map(user => ({
        user_id: user.id,
        category: 'leaves',
        title: 'New Leave Request',
        message: `${employeeName} has requested ${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date}`,
        is_read: false
      }));
      
      if (notifications.length > 0) {
        await Notification.createBulk(notifications);
        console.log(`✅ Created ${notifications.length} notifications for leave request`);
      }
    } catch (error) {
      console.error('⚠️ Failed to create leave notifications:', error);
    }
  }

  /**
   * Create notification for leave status update
   */
  static async notifyLeaveStatusUpdate(leave, employeeName, status) {
    try {
      // Notify the employee about their leave status
      const statusMessages = {
        approved: 'Your leave request has been approved',
        rejected: 'Your leave request has been rejected',
        pending: 'Your leave request is pending review'
      };
      
      await Notification.create({
        user_id: leave.user_id,
        category: 'leaves',
        title: 'Leave Request Update',
        message: `${statusMessages[status]} for ${leave.leave_type} from ${leave.start_date} to ${leave.end_date}`,
        is_read: false
      });
      
      console.log(`✅ Created leave status notification for employee ${leave.user_id}`);
    } catch (error) {
      console.error('⚠️ Failed to create leave status notification:', error);
    }
  }

  /**
   * Create notifications for attendance marked
   */
  static async notifyAttendanceMarked(attendance, employeeName) {
    try {
      // Only notify if status is absent or late
      if (['absent', 'late'].includes(attendance.status)) {
        const allUsers = await User.getAll();
        const managers = allUsers.filter(u => u.role === 'manager');
        
        const notifications = managers.map(user => ({
          user_id: user.id,
          category: 'attendance',
          title: `Attendance Alert: ${attendance.status}`,
          message: `${employeeName} was marked as ${attendance.status} on ${attendance.date}`,
          is_read: false
        }));
        
        if (notifications.length > 0) {
          await Notification.createBulk(notifications);
          console.log(`✅ Created ${notifications.length} notifications for attendance`);
        }
      }
    } catch (error) {
      console.error('⚠️ Failed to create attendance notifications:', error);
    }
  }

  /**
   * Create notifications for new job application
   */
  static async notifyNewApplication(application, candidateName, jobTitle) {
    try {
      const allUsers = await User.getAll();
      const adminAndHRUsers = allUsers.filter(u => ['admin', 'hr'].includes(u.role));
      
      const notifications = adminAndHRUsers.map(user => ({
        user_id: user.id,
        category: 'applications',
        title: 'New Job Application',
        message: `${candidateName} has applied for ${jobTitle} position`,
        is_read: false
      }));
      
      if (notifications.length > 0) {
        await Notification.createBulk(notifications);
        console.log(`✅ Created ${notifications.length} notifications for new application`);
      }
    } catch (error) {
      console.error('⚠️ Failed to create application notifications:', error);
    }
  }

  /**
   * Create notification for application status update
   */
  static async notifyApplicationStatusUpdate(application, candidateName, jobTitle, status) {
    try {
      // Notify the candidate about their application status
      const statusMessages = {
        reviewed: 'Your application has been reviewed',
        shortlisted: 'Congratulations! You have been shortlisted',
        rejected: 'Your application has been reviewed',
        hired: 'Congratulations! You have been hired'
      };
      
      await Notification.create({
        user_id: application.candidate_id,
        category: 'applications',
        title: 'Application Status Update',
        message: `${statusMessages[status]} for ${jobTitle} position`,
        is_read: false
      });
      
      console.log(`✅ Created application status notification for candidate ${application.candidate_id}`);
    } catch (error) {
      console.error('⚠️ Failed to create application status notification:', error);
    }
  }
}

module.exports = NotificationHelper;
