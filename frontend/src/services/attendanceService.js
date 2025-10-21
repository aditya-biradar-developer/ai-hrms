import api from './api';

export const attendanceService = {
  // Create attendance record
  createAttendance: async (attendanceData) => {
    const response = await api.post('/attendance', attendanceData);
    return response.data;
  },

  // Get attendance by ID
  getAttendanceById: async (id) => {
    const response = await api.get(`/attendance/${id}`);
    return response.data;
  },

  // Get attendance by user ID
  getAttendanceByUserId: async (userId, params = {}) => {
    const response = await api.get(`/attendance/user/${userId}`, { params });
    return response.data;
  },

  // Get all attendance
  getAllAttendance: async (params = {}) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },

  // Update attendance
  updateAttendance: async (id, attendanceData) => {
    const response = await api.put(`/attendance/${id}`, attendanceData);
    return response.data;
  },

  // Delete attendance
  deleteAttendance: async (id) => {
    const response = await api.delete(`/attendance/${id}`);
    return response.data;
  },

  // Get attendance statistics
  getAttendanceStats: async (params = {}) => {
    const response = await api.get('/attendance/stats', { params });
    return response.data;
  }
};