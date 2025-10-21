const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const documentController = require('../controllers/documentController');

// All routes require authentication
router.use(authenticate);

// Create document
router.post('/', documentController.createDocument);

// Get document statistics
router.get('/stats', documentController.getDocumentStats);

// Get user documents
router.get('/user/:userId?', documentController.getUserDocuments);

// Get all documents (admin/hr only)
router.get('/', authorize('admin', 'manager', 'hr'), documentController.getAllDocuments);

// Get document by ID
router.get('/:id', documentController.getDocumentById);

// Update document
router.put('/:id', documentController.updateDocument);

// Delete document
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
