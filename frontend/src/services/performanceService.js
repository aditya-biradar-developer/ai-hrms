import api from './api';

export const performanceService = {
  // Create performance record
  createPerformance: async (performanceData) => {
    const response = await api.post('/performance', performanceData);
    return response.data;
  },

  // Get performance by ID
  getPerformanceById: async (id) => {
    const response = await api.get(`/performance/${id}`);
    return response.data;
  },

  // Get performance by user ID
  getPerformanceByUserId: async (userId, params = {}) => {
    const response = await api.get(`/performance/user/${userId}`, { params });
    return response.data;
  },

  // Get all performance
  getAllPerformance: async (params = {}) => {
    const response = await api.get('/performance', { params });
    return response.data;
  },

  // Update performance
  updatePerformance: async (id, performanceData) => {
    const response = await api.put(`/performance/${id}`, performanceData);
    return response.data;
  },

  // Delete performance
  deletePerformance: async (id) => {
    const response = await api.delete(`/performance/${id}`);
    return response.data;
  },

  // Get performance statistics
  getPerformanceStats: async (params = {}) => {
    const response = await api.get('/performance/stats', { params });
    return response.data;
  }
};