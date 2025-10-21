import api from './api';

const documentService = {
  // Create document
  createDocument: async (documentData) => {
    const response = await api.post('/documents', documentData);
    return response.data;
  },

  // Get user documents
  getUserDocuments: async (userId = null) => {
    const url = userId ? `/documents/user/${userId}` : '/documents/user';
    const response = await api.get(url);
    return response.data;
  },

  // Get all documents (admin/hr)
  getAllDocuments: async (filters = {}) => {
    const response = await api.get('/documents', { params: filters });
    return response.data;
  },

  // Get document by ID
  getDocumentById: async (id) => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  // Update document
  updateDocument: async (id, documentData) => {
    const response = await api.put(`/documents/${id}`, documentData);
    return response.data;
  },

  // Delete document
  deleteDocument: async (id) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  // Get document statistics
  getDocumentStats: async (userId = null) => {
    const response = await api.get('/documents/stats', {
      params: { userId }
    });
    return response.data;
  }
};

export default documentService;
