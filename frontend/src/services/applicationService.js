import api from './api';

export const applicationService = {
  // Create application
  createApplication: async (applicationData) => {
    const response = await api.post('/applications', applicationData);
    return response.data;
  },

  // Get application by ID
  getApplicationById: async (id) => {
    const response = await api.get(`/applications/${id}`);
    return response.data;
  },

  // Get applications by candidate ID
  getApplicationsByCandidateId: async (candidateId, params = {}) => {
    const response = await api.get(`/applications/candidate/${candidateId}`, { params });
    return response.data;
  },

  // Get applications by job ID
  getApplicationsByJobId: async (jobId, params = {}) => {
    const response = await api.get(`/applications/job/${jobId}`, { params });
    return response.data;
  },

  // Get all applications
  getAllApplications: async (params = {}) => {
    const response = await api.get('/applications', { params });
    return response.data;
  },

  // Update application
  updateApplication: async (id, applicationData) => {
    const response = await api.put(`/applications/${id}`, applicationData);
    return response.data;
  },

  // Delete application
  deleteApplication: async (id) => {
    const response = await api.delete(`/applications/${id}`);
    return response.data;
  },

  // Get application statistics
  getApplicationStats: async (params = {}) => {
    const response = await api.get('/applications/stats', { params });
    return response.data;
  }
};