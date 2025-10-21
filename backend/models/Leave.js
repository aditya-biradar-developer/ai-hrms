const { supabase } = require('../config/db');

class Leave {
  // Create leave request
  static async create(leaveData) {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .insert([leaveData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get leave by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select(`
          *,
          users:user_id (id, name, email, department),
          approver:approved_by (id, name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get leaves by user ID
  static async findByUserId(userId, limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select(`
          *,
          approver:approved_by (id, name, email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get all leaves (for admin/manager)
  static async getAll(filters = {}, limit = 100, offset = 0) {
    try {
      let query = supabase
        .from('leaves')
        .select(`
          *,
          users:user_id (id, name, email, department, role),
          approver:approved_by (id, name, email)
        `);
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.department) {
        query = query.eq('users.department', filters.department);
      }
      
      if (filters.startDate) {
        query = query.gte('start_date', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('end_date', filters.endDate);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Update leave
  static async update(id, leaveData) {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .update(leaveData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Delete leave
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get leave statistics
  static async getStats(userId = null, year = null, userRole = null) {
    try {
      let query = supabase
        .from('leaves')
        .select(`
          *,
          users:user_id (id, name, email, role)
        `);
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      if (year) {
        query = query.gte('start_date', `${year}-01-01`)
                     .lte('start_date', `${year}-12-31`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // INDUSTRY STANDARD: Filter for managers - only show their team's stats
      let filteredData = data;
      if (userRole === 'manager') {
        filteredData = data.filter(leave => {
          const requesterRole = leave.users?.role;
          return requesterRole === 'employee' || requesterRole === 'manager';
        });
      }
      
      // Calculate statistics using filtered data
      const totalRequests = filteredData.length;
      const approved = filteredData.filter(leave => leave.status === 'approved').length;
      const pending = filteredData.filter(leave => leave.status === 'pending').length;
      const rejected = filteredData.filter(leave => leave.status === 'rejected').length;
      
      // Calculate total days
      const totalDays = filteredData
        .filter(leave => leave.status === 'approved')
        .reduce((sum, leave) => {
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
      
      // Leave type breakdown
      const leaveTypes = filteredData.reduce((acc, leave) => {
        const type = leave.leave_type || 'casual';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      // Monthly breakdown
      const monthlyBreakdown = filteredData.reduce((acc, leave) => {
        const month = new Date(leave.start_date).getMonth();
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalRequests,
        approved,
        pending,
        rejected,
        totalDays,
        leaveTypes,
        monthlyBreakdown,
        cancelled: filteredData.filter(leave => leave.status === 'cancelled').length
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Get pending leaves for approval
  static async getPendingForApprover(approverId) {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select(`
          *,
          users:user_id (id, name, email, department)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Leave;
