import api from './api';

export const jobService = {
  // Create job
  createJob: async (jobData) => {
    const response = await api.post('/jobs', jobData);
    return response.data;
  },

  // Get job by ID
  getJobById: async (id) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  // Get all jobs
  getAllJobs: async (params = {}) => {
    const response = await api.get('/jobs', { params });
    return response.data;
  },

  // Get jobs by department
  getJobsByDepartment: async (department, params = {}) => {
    const response = await api.get(`/jobs/department/${department}`, { params });
    return response.data;
  },

  // Update job
  updateJob: async (id, jobData) => {
    const response = await api.put(`/jobs/${id}`, jobData);
    return response.data;
  },

  // Delete job
  deleteJob: async (id) => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },

  // Get job statistics
  getJobStats: async () => {
    const response = await api.get('/jobs/stats');
    return response.data;
  }
};