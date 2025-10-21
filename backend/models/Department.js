const { supabase } = require('../config/db');

class Department {
  // Create department
  static async create(departmentData) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([departmentData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get department by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          manager:manager_id (id, name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get all departments
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          manager:manager_id (id, name, email)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Update department
  static async update(id, departmentData) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .update(departmentData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Delete department
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get department statistics
  static async getStats(departmentId = null) {
    try {
      let query = supabase
        .from('users')
        .select('department');
      
      if (departmentId) {
        query = query.eq('department', departmentId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Count employees by department
      const departmentCounts = data.reduce((acc, user) => {
        acc[user.department] = (acc[user.department] || 0) + 1;
        return acc;
      }, {});
      
      return departmentCounts;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Department;
