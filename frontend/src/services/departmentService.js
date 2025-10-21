import api from './api';

const departmentService = {
  // Create department
  createDepartment: async (departmentData) => {
    const response = await api.post('/departments', departmentData);
    return response.data;
  },

  // Get all departments
  getAllDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },

  // Get department by ID
  getDepartmentById: async (id) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  // Update department
  updateDepartment: async (id, departmentData) => {
    const response = await api.put(`/departments/${id}`, departmentData);
    return response.data;
  },

  // Delete department
  deleteDepartment: async (id) => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },

  // Get department statistics
  getDepartmentStats: async (departmentId = null) => {
    const response = await api.get('/departments/stats', {
      params: { departmentId }
    });
    return response.data;
  }
};

export default departmentService;
