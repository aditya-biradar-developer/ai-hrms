const express = require('express');
const router = express.Router();
const { getNotificationCounts } = require('../controllers/notificationCountsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get notification counts for sidebar badges
router.get('/counts', authenticateToken, getNotificationCounts);

module.exports = router;
