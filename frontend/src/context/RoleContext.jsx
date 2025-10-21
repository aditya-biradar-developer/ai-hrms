import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { ROLES } from '../utils/constants';

// Create context
const RoleContext = createContext();

// Provider component
export const RoleProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Role-based permissions
  const permissions = {
    // User management
    canViewUsers: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canCreateUsers: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canEditUsers: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canDeleteUsers: user?.role === ROLES.ADMIN,
    
    // Attendance
    canViewAllAttendance: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    canMarkAttendance: true, // All authenticated users
    canEditAttendance: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canDeleteAttendance: user?.role === ROLES.ADMIN,
    canViewTeamAttendance: user?.role === ROLES.MANAGER, // Manager can view team attendance
    
    // Leaves
    canViewAllLeaves: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    canApproveLeaves: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    canRejectLeaves: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    canRequestLeave: user?.role === ROLES.EMPLOYEE || user?.role === ROLES.MANAGER || user?.role === ROLES.HR,
    
    // Payroll
    canViewAllPayroll: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canViewTeamPayroll: user?.role === ROLES.MANAGER, // Manager can view team payroll
    canCreatePayroll: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canEditPayroll: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canDeletePayroll: user?.role === ROLES.ADMIN, // Only Admin can delete
    
    // Performance
    canViewAllPerformance: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    canCreatePerformance: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    canEditPerformance: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    canDeletePerformance: user?.role === ROLES.ADMIN,
    canReviewTeam: user?.role === ROLES.MANAGER || user?.role === ROLES.HR,
    
    // Jobs
    canViewAllJobs: true, // All authenticated users
    canCreateJobs: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canEditJobs: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canDeleteJobs: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    
    // Applications
    canViewAllApplications: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    canCreateApplications: user?.role === ROLES.CANDIDATE || user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canEditApplications: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    canDeleteApplications: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canReviewApplications: user?.role === ROLES.MANAGER || user?.role === ROLES.HR,
    
    // Dashboard
    canViewDashboard: true, // All authenticated users
    canViewAdminDashboard: user?.role === ROLES.ADMIN,
    canViewManagerDashboard: user?.role === ROLES.MANAGER,
    canViewHRDashboard: user?.role === ROLES.HR,
    canViewEmployeeDashboard: user?.role === ROLES.EMPLOYEE,
    canViewCandidateDashboard: user?.role === ROLES.CANDIDATE,
    
    // Reports
    canViewReports: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    canExportReports: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER,
    
    // Employee Management
    canManageEmployees: user?.role === ROLES.ADMIN || user?.role === ROLES.HR,
    canViewEmployeeDetails: user?.role === ROLES.ADMIN || user?.role === ROLES.HR || user?.role === ROLES.MANAGER
  };

  const value = {
    user,
    permissions,
    isAdmin: user?.role === ROLES.ADMIN,
    isManager: user?.role === ROLES.MANAGER,
    isHR: user?.role === ROLES.HR,
    isEmployee: user?.role === ROLES.EMPLOYEE,
    isCandidate: user?.role === ROLES.CANDIDATE
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

// Custom hook to use role context
export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};