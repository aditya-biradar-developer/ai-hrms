import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    payroll: 0,
    performance: 0,
    leaves: 0,
    attendance: 0,
    applications: 0,
    interviews: 0,
    users: 0
  });

  // Simulate fetching notifications (replace with actual API calls)
  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${API_URL}/notifications/counts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data);
          console.log('🔔 Notifications updated:', data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Keep current state on error
    }
  };

  const clearNotification = (section) => {
    setNotifications(prev => ({
      ...prev,
      [section]: 0
    }));
  };

  const addNotification = (section, count = 1) => {
    setNotifications(prev => ({
      ...prev,
      [section]: prev[section] + count
    }));
  };

  const value = {
    notifications,
    clearNotification,
    addNotification,
    refreshNotifications: fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
