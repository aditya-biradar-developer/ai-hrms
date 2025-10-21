const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', notificationController.getUserNotifications);

// Get unread count
router.get('/unread/count', notificationController.getUnreadCount);

// Get notification counts by category
router.get('/counts', notificationController.getNotificationCounts);

// Mark all as read
router.put('/read/all', notificationController.markAllAsRead);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
