const { supabase } = require('../config/db');

class Notification {
  // Create notification
  static async create(notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Create bulk notifications
  static async createBulk(notificationsArray) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationsArray)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get notification by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get notifications by user ID
  static async findByUserId(userId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get unread notifications count
  static async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw error;
    }
  }
  
  // Mark notification as read
  static async markAsRead(id) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Delete notification
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Delete old notifications (cleanup)
  static async deleteOld(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const { data, error} = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('is_read', true);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get notification counts by category
  static async getCountsByCategory(userId, userRole) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('category')
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) throw error;
      
      // Count notifications by category
      const counts = {
        payroll: 0,
        performance: 0,
        leaves: 0,
        attendance: 0,
        applications: 0,
        users: 0
      };
      
      data?.forEach(notification => {
        const category = notification.category;
        if (counts.hasOwnProperty(category)) {
          counts[category]++;
        }
      });
      
      return counts;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Notification;
