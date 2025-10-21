const Event = require('../models/Event');
const Notification = require('../models/Notification');

// Create event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, start_date, end_date, type, location, department, all_day } = req.body;
    
    const eventData = {
      title,
      description,
      start_date,
      end_date,
      type,
      location,
      department,
      all_day: all_day || false,
      created_by: req.user.id
    };
    
    const event = await Event.create(eventData);
    
    // Create notifications for relevant users
    // In a real scenario, this would notify users in the department or all users
    await Notification.create({
      user_id: req.user.id,
      type: 'event',
      title: 'New Event Created',
      message: `Event "${title}" has been scheduled`,
      related_id: event.id,
      related_type: 'event'
    });
    
    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
};

// Get event by ID
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get event',
      error: error.message
    });
  }
};

// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    const { type, department, startDate, endDate } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (department) filters.department = department;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    const events = await Event.getAll(filters);
    
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get all events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get events',
      error: error.message
    });
  }
};

// Get events by date range
exports.getEventsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const events = await Event.getByDateRange(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get events by date range error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get events',
      error: error.message
    });
  }
};

// Get upcoming events
exports.getUpcomingEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const events = await Event.getUpcoming(limit);
    
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming events',
      error: error.message
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check if user has permission to update
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        req.user.role !== 'hr' && 
        event.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedEvent = await Event.update(id, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: error.message
    });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check if user has permission to delete
    if (req.user.role !== 'admin' && 
        req.user.role !== 'manager' && 
        req.user.role !== 'hr' && 
        event.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Event.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message
    });
  }
};
