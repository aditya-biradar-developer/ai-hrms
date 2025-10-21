import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';
import { NotificationProvider } from './context/NotificationContext';
import Sidebar from './components/layout/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import CompleteProfile from './pages/CompleteProfile';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Performance from './pages/Performance';
import Jobs from './pages/Jobs';
import Applications from './pages/Applications';
import Settings from './pages/Settings';
import Leaves from './pages/Leaves';
import CalendarPage from './pages/CalendarPage';
import ShiftManagement from './pages/ShiftManagement';
import AIInterview from './pages/AIInterview';
import Onboarding from './pages/Onboarding';
import { useAuth } from './context/AuthContext';
import { useRole } from './context/RoleContext';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Role-based route protection
const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const { isAdmin, isHR, isManager, isEmployee, isCandidate } = useRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const userRole = user.role?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

  // Check if user's role is in allowed roles
  if (!normalizedAllowedRoles.includes(userRole)) {
    console.warn(`🚫 Access denied: ${userRole} tried to access route requiring: ${allowedRoles.join(', ')}`);
    // Redirect to user's default page based on role
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Layout component for authenticated pages
const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-100">
        {/* Responsive padding: more on mobile top for menu button, less on sides */}
        <div className="p-4 sm:p-6 lg:p-8 pt-20 md:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/interview/:token" element={<AIInterview />} />
            <Route path="/onboarding/:token" element={<Onboarding />} />
            
            {/* Protected routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    {/* Dashboard - All authenticated users */}
                    <Route path="/dashboard" element={<Dashboard />} />
                    
                    {/* Users - Admin & HR only */}
                    <Route path="/users" element={
                      <RoleBasedRoute allowedRoles={['admin', 'hr']}>
                        <Users />
                      </RoleBasedRoute>
                    } />
                    
                    {/* Attendance - All except Candidate */}
                    <Route path="/attendance" element={
                      <RoleBasedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}>
                        <Attendance />
                      </RoleBasedRoute>
                    } />
                    
                    {/* Payroll - Admin & HR only */}
                    <Route path="/payroll" element={
                      <RoleBasedRoute allowedRoles={['admin', 'hr']}>
                        <Payroll />
                      </RoleBasedRoute>
                    } />
                    
                    {/* Performance - Admin, HR, Manager */}
                    <Route path="/performance" element={
                      <RoleBasedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}>
                        <Performance />
                      </RoleBasedRoute>
                    } />
                    
                    {/* Jobs - All users (candidates can view, others can manage) */}
                    <Route path="/jobs" element={<Jobs />} />
                    
                    {/* Applications - Admin, HR, Manager, Candidate */}
                    <Route path="/applications" element={
                      <RoleBasedRoute allowedRoles={['admin', 'hr', 'manager', 'candidate']}>
                        <Applications />
                      </RoleBasedRoute>
                    } />
                    
                    {/* Leaves - All except Candidate */}
                    <Route path="/leaves" element={
                      <RoleBasedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}>
                        <Leaves />
                      </RoleBasedRoute>
                    } />
                    
                    {/* Calendar - All except Candidate */}
                    <Route path="/calendar" element={
                      <RoleBasedRoute allowedRoles={['admin', 'hr', 'manager', 'employee']}>
                        <CalendarPage />
                      </RoleBasedRoute>
                    } />
                    
                    {/* Shifts - Admin, HR, Manager */}
                    <Route path="/shifts" element={
                      <RoleBasedRoute allowedRoles={['admin', 'hr', 'manager']}>
                        <ShiftManagement />
                      </RoleBasedRoute>
                    } />
                    
                    {/* Settings - All users */}
                    <Route path="/settings" element={<Settings />} />
                    
                    {/* Default redirect */}
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
        </NotificationProvider>
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;