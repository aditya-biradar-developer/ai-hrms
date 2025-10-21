const { supabase } = require('../config/db');

class Payroll {
  // Create payroll record
  static async create(payrollData) {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .insert([payrollData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get payroll by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get payroll by user ID
  static async findByUserId(userId, limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get all payroll (for admin)
  static async getAll(limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Update payroll
  static async update(id, payrollData) {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .update(payrollData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Delete payroll
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get payroll statistics
  static async getStats(userId = null, month = null, year = null) {
    try {
      console.log('🔍 Payroll.getStats called with:', { userId, month, year });
      
      let query = supabase
        .from('payroll')
        .select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      if (month) {
        query = query.eq('month', month);
      }
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('📦 Fetched payroll records:', data.length);
      if (data.length > 0) {
        console.log('📝 Sample record:', {
          salary: data[0].salary,
          bonus: data[0].bonus,
          deductions: data[0].deductions,
          gross_salary: data[0].gross_salary,
          total_deductions: data[0].total_deductions,
          net_salary: data[0].net_salary
        });
      }
      
      // Calculate statistics
      const totalRecords = data.length;
      
      // Calculate totals - use gross_salary if available, otherwise calculate from salary + bonus
      const totalGrossSalary = data.reduce((sum, record) => {
        return sum + (record.gross_salary || (record.salary + (record.bonus || 0)));
      }, 0);
      
      const totalBonus = data.reduce((sum, record) => sum + (record.bonus || 0), 0);
      
      // Use total_deductions if available, otherwise use deductions
      const totalDeductions = data.reduce((sum, record) => {
        return sum + (record.total_deductions || record.deductions || 0);
      }, 0);
      
      // Use net_salary if available, otherwise calculate
      const totalNetSalary = data.reduce((sum, record) => {
        return sum + (record.net_salary || ((record.salary + (record.bonus || 0)) - (record.deductions || 0)));
      }, 0);
      
      const averageNetSalary = totalRecords > 0 ? totalNetSalary / totalRecords : 0;
      
      // Status breakdown
      const statusBreakdown = {
        draft: data.filter(r => r.status === 'draft').length,
        processed: data.filter(r => r.status === 'processed').length,
        paid: data.filter(r => r.status === 'paid').length,
        cancelled: data.filter(r => r.status === 'cancelled').length
      };
      
      const result = {
        totalRecords,
        totalGrossSalary,
        totalBonus,
        totalDeductions,
        totalNetSalary,
        averageNetSalary,
        totalOvertime: 0, // Can be added later if needed
        statusBreakdown
      };
      
      console.log('✅ Calculated stats result:', result);
      
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Payroll;