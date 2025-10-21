// Role-based permissions matrix
// Based on real-world HR organizational structure

const PERMISSIONS = {
  // Admin - Full system access
  admin: {
    users: ['create', 'read', 'update', 'delete'],
    departments: ['create', 'read', 'update', 'delete'],
    attendance: ['create', 'read', 'update', 'delete'],
    payroll: ['create', 'read', 'update', 'delete'],
    performance: ['create', 'read', 'update', 'delete'],
    jobs: ['create', 'read', 'update', 'delete'],
    applications: ['create', 'read', 'update', 'delete'],
    leaves: ['create', 'read', 'update', 'delete', 'approve'],
    events: ['create', 'read', 'update', 'delete'],
    notifications: ['create', 'read', 'update', 'delete'],
    documents: ['create', 'read', 'update', 'delete'],
    dashboard: ['view_all', 'view_analytics']
  },
  
  // Senior Manager - Department-wide access, can approve leaves and performance reviews
  manager: {
    users: ['read', 'update'], // Can view and update team members
    departments: ['read'],
    attendance: ['read', 'update'], // Can mark attendance for team
    payroll: ['read'], // Can view team payroll
    performance: ['create', 'read', 'update'], // Can conduct reviews
    jobs: ['create', 'read', 'update'], // Can post jobs
    applications: ['read', 'update'], // Can review applications
    leaves: ['read', 'approve', 'reject'], // Can approve team leaves
    events: ['create', 'read', 'update', 'delete'],
    notifications: ['read'],
    documents: ['read', 'create'], // Can view team documents
    dashboard: ['view_team', 'view_analytics']
  },
  
  // HR Recruiter - Focused on recruitment, employee records, and compliance
  hr: {
    users: ['create', 'read', 'update'], // Can manage employee records
    departments: ['read'],
    attendance: ['read', 'update'], // Can manage attendance
    payroll: ['create', 'read', 'update'], // Can process payroll
    performance: ['read'], // Can view performance reviews
    jobs: ['create', 'read', 'update', 'delete'], // Full job management
    applications: ['read', 'update', 'delete'], // Full application management
    leaves: ['read', 'approve', 'reject'], // Can approve leaves
    events: ['create', 'read', 'update', 'delete'],
    notifications: ['read'],
    documents: ['create', 'read', 'update', 'delete'], // Full document management
    dashboard: ['view_hr', 'view_analytics']
  },
  
  // Employee - Self-service access
  employee: {
    users: ['read_self'], // Can only view own profile
    departments: ['read'],
    attendance: ['create', 'read_self'], // Can mark own attendance
    payroll: ['read_self'], // Can view own payroll
    performance: ['read_self'], // Can view own reviews
    jobs: ['read'], // Can view job postings
    applications: ['create', 'read_self', 'update_self'], // Can apply for jobs
    leaves: ['create', 'read_self', 'update_self'], // Can request leaves
    events: ['read'], // Can view events
    notifications: ['read'],
    documents: ['read_self', 'create_self'], // Can manage own documents
    dashboard: ['view_self']
  },
  
  // Candidate - Limited access for job applicants
  candidate: {
    users: ['read_self'],
    jobs: ['read'],
    applications: ['create', 'read_self', 'update_self'],
    events: ['read'],
    notifications: ['read'],
    documents: ['create_self', 'read_self'],
    dashboard: ['view_self']
  }
};

// Check if user has permission for a specific action
const hasPermission = (role, resource, action) => {
  if (!PERMISSIONS[role]) return false;
  if (!PERMISSIONS[role][resource]) return false;
  return PERMISSIONS[role][resource].includes(action);
};

// Middleware to check permissions
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!hasPermission(req.user.role, resource, action)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions for this action'
      });
    }
    
    next();
  };
};

// Get all permissions for a role
const getRolePermissions = (role) => {
  return PERMISSIONS[role] || {};
};

module.exports = {
  PERMISSIONS,
  hasPermission,
  checkPermission,
  getRolePermissions
};
