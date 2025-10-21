import api from './api';

const eventService = {
  // Create event
  createEvent: async (eventData) => {
    const response = await api.post('/events', eventData);
    return response.data;
  },

  // Get all events
  getAllEvents: async (filters = {}) => {
    const response = await api.get('/events', { params: filters });
    return response.data;
  },

  // Get event by ID
  getEventById: async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  // Get events by date range
  getEventsByDateRange: async (startDate, endDate) => {
    const response = await api.get('/events/range', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  // Get upcoming events
  getUpcomingEvents: async (limit = 10) => {
    const response = await api.get('/events/upcoming', {
      params: { limit }
    });
    return response.data;
  },

  // Update event
  updateEvent: async (id, eventData) => {
    const response = await api.put(`/events/${id}`, eventData);
    return response.data;
  },

  // Delete event
  deleteEvent: async (id) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  }
};

export default eventService;
