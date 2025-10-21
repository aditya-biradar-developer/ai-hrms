import api from './api';

export const payrollService = {
  // Create payroll record
  createPayroll: async (payrollData) => {
    const response = await api.post('/payroll', payrollData);
    return response.data;
  },

  // Get payroll by ID
  getPayrollById: async (id) => {
    const response = await api.get(`/payroll/${id}`);
    return response.data;
  },

  // Get payroll by user ID
  getPayrollByUserId: async (userId, params = {}) => {
    const response = await api.get(`/payroll/user/${userId}`, { params });
    return response.data;
  },

  // Get all payroll
  getAllPayroll: async (params = {}) => {
    const response = await api.get('/payroll', { params });
    return response.data;
  },

  // Update payroll
  updatePayroll: async (id, payrollData) => {
    const response = await api.put(`/payroll/${id}`, payrollData);
    return response.data;
  },

  // Delete payroll
  deletePayroll: async (id) => {
    const response = await api.delete(`/payroll/${id}`);
    return response.data;
  },

  // Get payroll statistics
  getPayrollStats: async (params = {}) => {
    const response = await api.get('/payroll/stats', { params });
    return response.data;
  }
};