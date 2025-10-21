import api from './api';

const dashboardService = {
  // Get dashboard data based on user role
  getDashboardData: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  // Get admin dashboard
  getAdminDashboard: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  // Get manager dashboard
  getManagerDashboard: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  // Get HR dashboard
  getHRDashboard: async (filters = {}) => {
    const params = {};
    if (filters.jobId) params.jobId = filters.jobId;
    if (filters.department) params.department = filters.department;
    
    const response = await api.get('/dashboard', { params });
    return response.data;
  },

  // Get employee dashboard
  getEmployeeDashboard: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  }
};

export default dashboardService;