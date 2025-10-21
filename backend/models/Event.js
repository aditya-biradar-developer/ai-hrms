const { supabase } = require('../config/db');

class Event {
  // Create event
  static async create(eventData) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get event by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:created_by (id, name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get all events
  static async getAll(filters = {}, limit = 100, offset = 0) {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          creator:created_by (id, name, email)
        `);
      
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters.department) {
        query = query.eq('department', filters.department);
      }
      
      if (filters.startDate) {
        query = query.gte('start_date', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('end_date', filters.endDate);
      }
      
      const { data, error } = await query
        .order('start_date', { ascending: true })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get events by date range
  static async getByDateRange(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:created_by (id, name, email)
        `)
        .gte('start_date', startDate)
        .lte('end_date', endDate)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get upcoming events
  static async getUpcoming(limit = 10) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:created_by (id, name, email)
        `)
        .gte('start_date', today)
        .order('start_date', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Update event
  static async update(id, eventData) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Delete event
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Event;
