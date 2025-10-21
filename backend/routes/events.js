const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const eventController = require('../controllers/eventController');

// All routes require authentication
router.use(authenticate);

// Create event (admin/manager/hr only)
router.post('/', authorize('admin', 'manager', 'hr'), eventController.createEvent);

// Get upcoming events
router.get('/upcoming', eventController.getUpcomingEvents);

// Get events by date range
router.get('/range', eventController.getEventsByDateRange);

// Get all events
router.get('/', eventController.getAllEvents);

// Get event by ID
router.get('/:id', eventController.getEventById);

// Update event (admin/manager/hr only)
router.put('/:id', authorize('admin', 'manager', 'hr'), eventController.updateEvent);

// Delete event (admin/manager/hr only)
router.delete('/:id', authorize('admin', 'manager', 'hr'), eventController.deleteEvent);

module.exports = router;
