import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import ManagerDashboard from '../components/dashboard/ManagerDashboard';
import HRDashboard from '../components/dashboard/HRDashboard';
import EmployeeDashboard from '../components/dashboard/EmployeeDashboard';
import CandidateDashboard from '../components/dashboard/CandidateDashboard';

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const { isAdmin, isManager, isHR, isEmployee, isCandidate } = useRole();

  // Render the appropriate dashboard based on user role
  const renderDashboard = () => {
    console.log('🎯 Dashboard Role Check:', {
      user: user,
      userRole: user?.role,
      isAdmin,
      isManager,
      isHR,
      isEmployee,
      isCandidate
    });
    
    if (isAdmin) {
      return <AdminDashboard />;
    } else if (isManager) {
      return <ManagerDashboard />;
    } else if (isHR) {
      return <HRDashboard />;
    } else if (isEmployee) {
      return <EmployeeDashboard />;
    } else if (isCandidate) {
      return <CandidateDashboard />;
    } else {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Unable to load dashboard. Invalid user role.
          </p>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Main content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 pt-16 md:pt-0">
        {renderDashboard()}
      </div>
    </div>
  );
};

export default Dashboard;