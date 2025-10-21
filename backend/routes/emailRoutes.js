const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { sendEmailToTopCandidates, previewEmail } = require('../controllers/emailController');

// Send emails to top candidates (Admin, HR only)
router.post('/send-to-candidates', authenticate, authorize('admin', 'hr'), sendEmailToTopCandidates);

// Preview email before sending
router.post('/preview', authenticate, authorize('admin', 'hr'), previewEmail);

module.exports = router;
