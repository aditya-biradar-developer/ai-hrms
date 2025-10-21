import api from './api';

const leaveService = {
  // Create leave request
  createLeave: async (leaveData) => {
    const response = await api.post('/leaves', leaveData);
    return response.data;
  },

  // Get user's leaves
  getUserLeaves: async (userId = null) => {
    const url = userId ? `/leaves/user/${userId}` : '/leaves/user';
    const response = await api.get(url);
    return response.data;
  },

  // Get all leaves (admin/manager/hr)
  getAllLeaves: async (filters = {}) => {
    const response = await api.get('/leaves', { params: filters });
    return response.data;
  },

  // Get leave by ID
  getLeaveById: async (id) => {
    const response = await api.get(`/leaves/${id}`);
    return response.data;
  },

  // Update leave (approve/reject)
  updateLeave: async (id, updateData) => {
    const response = await api.put(`/leaves/${id}`, updateData);
    return response.data;
  },

  // Delete leave
  deleteLeave: async (id) => {
    const response = await api.delete(`/leaves/${id}`);
    return response.data;
  },

  // Get leave statistics
  getLeaveStats: async (userId = null, year = null) => {
    const response = await api.get('/leaves/stats', {
      params: { userId, year }
    });
    return response.data;
  },

  // Get pending leaves for approval
  getPendingLeaves: async () => {
    try {
      const response = await api.get('/leaves/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending leaves:', error);
      return { success: false, data: [] };
    }
  }
};

export default leaveService;
