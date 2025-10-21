const Document = require('../models/Document');

// Create document record
exports.createDocument = async (req, res) => {
  try {
    const { name, type, description, file_url, size, user_id } = req.body;
    
    const documentData = {
      name,
      type,
      description,
      file_url,
      size,
      user_id: user_id || req.user.id,
      uploaded_by: req.user.id
    };
    
    const document = await Document.create(documentData);
    
    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      data: document
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create document',
      error: error.message
    });
  }
};

// Get document by ID
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Check if user has permission to view
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        req.user.role !== 'hr' && 
        document.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document',
      error: error.message
    });
  }
};

// Get user documents
exports.getUserDocuments = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Check permission
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        req.user.role !== 'hr' && 
        userId !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const documents = await Document.findByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get user documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents',
      error: error.message
    });
  }
};

// Get all documents (admin)
exports.getAllDocuments = async (req, res) => {
  try {
    const { type, userId } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (userId) filters.userId = userId;
    
    const documents = await Document.getAll(filters);
    
    res.status(200).json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents',
      error: error.message
    });
  }
};

// Update document
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const document = await Document.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Check permission
    if (req.user.role !== 'admin' && 
        req.user.role !== 'hr' && 
        document.uploaded_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedDocument = await Document.update(id, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: updatedDocument
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error.message
    });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Document.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Check permission
    if (req.user.role !== 'admin' && 
        req.user.role !== 'hr' && 
        document.uploaded_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Document.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
};

// Get document statistics
exports.getDocumentStats = async (req, res) => {
  try {
    const userId = req.query.userId;
    const stats = await Document.getStats(userId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get document stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document statistics',
      error: error.message
    });
  }
};
