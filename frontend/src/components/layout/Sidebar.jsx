import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { useNotifications } from '../../context/NotificationContext';
import { cn } from '../../utils/helpers';
import {
  Home,
  Users,
  Calendar,
  IndianRupee,
  TrendingUp,
  Briefcase,
  FileText,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Umbrella,
  Trophy,
  CalendarDays,
  Clock
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isAdmin, isManager, isHR, isEmployee, isCandidate } = useRole();
  const { notifications } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNotificationCount = (path) => {
    const pathMap = {
      '/payroll': notifications.payroll,
      '/performance': notifications.performance,
      '/leaves': notifications.leaves,
      '/attendance': notifications.attendance,
      '/applications': notifications.applications,
      '/users': notifications.users
    };
    return pathMap[path] || 0;
  };

  const menuItems = [
    {
      title: 'Main',
      items: [
        {
          title: 'Dashboard',
          path: '/dashboard',
          icon: Home,
          visible: true
        }
      ]
    },
    {
      title: 'Management',
      items: [
        {
          title: 'Users',
          path: '/users',
          icon: Users,
          visible: isAdmin || isHR
        },
        {
          title: 'Attendance',
          path: '/attendance',
          icon: Calendar,
          visible: isAdmin || isHR || isManager || isEmployee
        },
        {
          title: 'Leaves',
          path: '/leaves',
          icon: Umbrella,
          visible: isAdmin || isManager || isHR || isEmployee
        },
        {
          title: 'Calendar',
          path: '/calendar',
          icon: CalendarDays,
          visible: !isCandidate // Hide calendar for candidates
        },
        {
          title: 'Shifts',
          path: '/shifts',
          icon: Clock,
          visible: isAdmin || isHR || isManager || isEmployee
        },
        {
          title: 'Payroll',
          path: '/payroll',
          icon: IndianRupee,
          visible: isAdmin || isHR || isEmployee
        },
        {
          title: 'Performance',
          path: '/performance',
          icon: TrendingUp,
          visible: isAdmin || isHR || isManager || isEmployee
        }
      ]
    },
    {
      title: 'Recruitment',
      items: [
        {
          title: 'Jobs',
          path: '/jobs',
          icon: Briefcase,
          visible: isAdmin || isHR || isCandidate
        },
        {
          title: 'Applications',
          path: '/applications',
          icon: FileText,
          visible: isAdmin || isHR || isCandidate
        }
      ]
    },
    {
      title: 'Account',
      items: [
        {
          title: 'Settings',
          path: '/settings',
          icon: Settings,
          visible: true
        }
      ]
    }
  ];

  const filteredMenuItems = menuItems.map(section => ({
    ...section,
    items: section.items.filter(item => item.visible)
  })).filter(section => section.items.length > 0);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex md:flex-col ${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transition-all duration-300 ease-in-out`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {isCollapsed ? (
            <div className="flex items-center justify-center w-full">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-colors"
              >
                <span className="text-white font-bold text-sm">AI</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
                <span className="text-xl font-bold text-gray-900">HRMS</span>
              </div>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <Menu className="h-5 w-5 text-gray-500" />
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="px-2 space-y-2">
            {filteredMenuItems.map((section) => (
              <div key={section.title} className="mb-4">
                {!isCollapsed && (
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => {
                  const notificationCount = getNotificationCount(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        isActive(item.path)
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon
                          className={cn(
                            isCollapsed ? 'h-5 w-5' : 'h-5 w-5 mr-3',
                            'flex-shrink-0',
                            isActive(item.path)
                              ? 'text-blue-500'
                              : 'text-gray-400 group-hover:text-gray-500'
                          )}
                        />
                        {!isCollapsed && (
                          <span>{item.title}</span>
                        )}
                      </div>
                      {notificationCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[20px]">
                          {notificationCount > 99 ? '99+' : notificationCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Settings link is rendered from the Menu (Account section) to avoid duplication */}

        {/* User Profile Section */}
        <div className="border-t border-gray-200 p-4">
          {isCollapsed ? (
            <div className="flex flex-col items-center space-y-4">
              {/* User Avatar */}
              <div className="relative group">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                  <span className="text-white font-bold text-lg">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {user?.name}
                </div>
              </div>
              
              {/* Logout Button */}
              <div className="relative group">
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Logout
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-medium">{user?.role?.charAt(0)?.toUpperCase() + user?.role?.slice(1)}</span>
                <span>{user?.department}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden fixed inset-0 z-50 ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
        <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className="text-xl font-bold text-gray-900">HRMS</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 py-4 overflow-y-auto">
            <nav className="px-2 space-y-2">
              {filteredMenuItems.map((section) => (
                <div key={section.title} className="mb-4">
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const notificationCount = getNotificationCount(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          'group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md',
                          isActive(item.path)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <div className="flex items-center">
                          <item.icon
                            className={cn(
                              'h-5 w-5 mr-3 flex-shrink-0',
                              isActive(item.path)
                                ? 'text-blue-500'
                                : 'text-gray-400 group-hover:text-gray-500'
                            )}
                          />
                          <span>{item.title}</span>
                        </div>
                        {notificationCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[20px]">
                            {notificationCount > 99 ? '99+' : notificationCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* Settings link removed here to prevent duplicate entry; it's available under the Account section above */}

          <div className="border-t border-gray-200 p-4">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{user?.role?.charAt(0)?.toUpperCase() + user?.role?.slice(1)}</span>
                <span>{user?.department}</span>
              </div>
              
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header - Professional Design */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo on Left */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="text-xl font-bold text-gray-900">HRMS</span>
          </div>
          
          {/* Hamburger Menu on Right */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;