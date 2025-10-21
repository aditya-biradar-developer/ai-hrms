const { supabase } = require('../config/db');

class PayrollEnhanced {
  // ============================================================================
  // PAYROLL CRUD OPERATIONS
  // ============================================================================
  
  // Create payroll record with auto-calculation
  static async create(payrollData) {
    try {
      console.log('💾 Inserting payroll data:', JSON.stringify(payrollData, null, 2));
      
      const { data, error } = await supabase
        .from('payroll')
        .insert([payrollData])
        .select();
      
      if (error) {
        console.error('❌ Database insert error:', error);
        throw error;
      }
      
      console.log('✅ Database returned (before fix):', JSON.stringify(data[0], null, 2));
      
      // Check if database trigger corrupted our values
      const insertedRecord = data[0];
      if (insertedRecord.gross_salary !== payrollData.gross_salary ||
          insertedRecord.total_deductions !== payrollData.total_deductions ||
          insertedRecord.net_salary !== payrollData.net_salary) {
        
        console.log('⚠️ Database trigger corrupted values! Fixing with UPDATE...');
        
        // Fix the corrupted values with an UPDATE
        const { data: fixedData, error: updateError } = await supabase
          .from('payroll')
          .update({
            gross_salary: payrollData.gross_salary,
            total_deductions: payrollData.total_deductions,
            net_salary: payrollData.net_salary
          })
          .eq('id', insertedRecord.id)
          .select();
        
        if (updateError) {
          console.error('❌ Update error:', updateError);
          throw updateError;
        }
        
        console.log('✅ Values fixed with UPDATE:', JSON.stringify(fixedData[0], null, 2));
        return fixedData[0];
      }
      
      return insertedRecord;
    } catch (error) {
      throw error;
    }
  }
  
  // Get payroll by ID with employee details
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          employee:users!payroll_user_id_fkey(id, name, email, department),
          processor:users!payroll_processed_by_fkey(id, name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get payroll by user ID
  static async findByUserId(userId, filters = {}) {
    try {
      let query = supabase
        .from('payroll')
        .select(`
          *,
          employee:users!payroll_user_id_fkey(id, name, email, department)
        `)
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (filters.month) query = query.eq('month', filters.month);
      if (filters.year) query = query.eq('year', filters.year);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.limit) query = query.limit(filters.limit);
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get all payroll (for admin/HR)
  static async getAll(filters = {}) {
    try {
      let query = supabase
        .from('payroll')
        .select(`
          *,
          employee:users!payroll_user_id_fkey(id, name, email, department)
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (filters.month) query = query.eq('month', filters.month);
      if (filters.year) query = query.eq('year', filters.year);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.department) query = query.eq('employee.department', filters.department);
      if (filters.limit) query = query.limit(filters.limit);
      
      const { data, error } = await query;
      
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
  
  // ============================================================================
  // SALARY STRUCTURE OPERATIONS
  // ============================================================================
  
  // Get active salary structure for user
  static async getSalaryStructure(userId) {
    try {
      const { data, error } = await supabase
        .from('salary_structure')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Create or update salary structure
  static async upsertSalaryStructure(structureData) {
    try {
      // Deactivate previous structures
      if (structureData.user_id) {
        await supabase
          .from('salary_structure')
          .update({ is_active: false })
          .eq('user_id', structureData.user_id);
      }
      
      const { data, error } = await supabase
        .from('salary_structure')
        .insert([structureData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // ============================================================================
  // PAYROLL GENERATION & PROCESSING
  // ============================================================================
  
  // Generate payroll for a user based on salary structure
  static async generatePayroll(userId, month, year, attendanceData = {}) {
    try {
      // Get salary structure
      const structure = await this.getSalaryStructure(userId);
      if (!structure) {
        throw new Error('No active salary structure found for user');
      }
      
      // Calculate attendance-based deductions
      const workingDays = attendanceData.working_days || 26;
      const presentDays = attendanceData.present_days || workingDays;
      const absentDays = workingDays - presentDays;
      const perDaySalary = structure.basic_salary / workingDays;
      const absentDeduction = perDaySalary * absentDays;
      
      // Calculate PF (12% of basic salary)
      const pfAmount = (structure.basic_salary * (structure.provident_fund_percent || 12)) / 100;
      
      // Prepare payroll data
      const payrollData = {
        user_id: userId,
        month: month,
        year: year,
        pay_period_start: new Date(year, month - 1, 1),
        pay_period_end: new Date(year, month, 0),
        
        // Earnings
        basic_salary: structure.basic_salary - absentDeduction,
        hra: structure.hra || 0,
        transport_allowance: structure.transport_allowance || 0,
        medical_allowance: structure.medical_allowance || 0,
        special_allowance: structure.special_allowance || 0,
        overtime_pay: attendanceData.overtime_pay || 0,
        bonus: attendanceData.bonus || 0,
        commission: attendanceData.commission || 0,
        incentives: attendanceData.incentives || 0,
        
        // Deductions
        provident_fund: pfAmount,
        professional_tax: structure.professional_tax || 0,
        insurance: structure.insurance || 0,
        tax_deduction: attendanceData.tax_deduction || 0,
        loan_repayment: attendanceData.loan_repayment || 0,
        advance_deduction: attendanceData.advance_deduction || 0,
        other_deductions: attendanceData.other_deductions || 0,
        
        // Attendance
        working_days: workingDays,
        present_days: presentDays,
        absent_days: absentDays,
        paid_leaves: attendanceData.paid_leaves || 0,
        unpaid_leaves: attendanceData.unpaid_leaves || 0,
        overtime_hours: attendanceData.overtime_hours || 0,
        
        status: 'draft',
        notes: attendanceData.notes || null
      };
      
      // Database trigger will calculate gross_salary, total_deductions, and net_salary
      return await this.create(payrollData);
    } catch (error) {
      throw error;
    }
  }
  
  // Process payroll (mark as processed)
  static async processPayroll(payrollId, processedBy) {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .update({
          status: 'processed',
          processed_by: processedBy,
          processed_at: new Date().toISOString()
        })
        .eq('id', payrollId)
        .select();
      
      if (error) throw error;
      
      // Log to history
      await this.logHistory(payrollId, 'processed', processedBy, { status: 'processed' });
      
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Mark payroll as paid
  static async markAsPaid(payrollId, paymentDate, processedBy) {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .update({
          status: 'paid',
          payment_date: paymentDate,
          processed_by: processedBy,
          processed_at: new Date().toISOString()
        })
        .eq('id', payrollId)
        .select();
      
      if (error) throw error;
      
      // Log to history
      await this.logHistory(payrollId, 'paid', processedBy, { status: 'paid', payment_date: paymentDate });
      
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // ============================================================================
  // ADJUSTMENTS
  // ============================================================================
  
  // Add adjustment to payroll
  static async addAdjustment(adjustmentData) {
    try {
      const { data, error } = await supabase
        .from('payroll_adjustments')
        .insert([adjustmentData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get adjustments for payroll
  static async getAdjustments(payrollId) {
    try {
      const { data, error } = await supabase
        .from('payroll_adjustments')
        .select('*')
        .eq('payroll_id', payrollId);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // ============================================================================
  // STATISTICS & REPORTS
  // ============================================================================
  
  // Get payroll statistics
  static async getStats(filters = {}) {
    try {
      console.log('🔍 PayrollEnhanced.getStats called with filters:', filters);
      
      let query = supabase
        .from('payroll')
        .select('*');
      
      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.month) query = query.eq('month', filters.month);
      if (filters.year) query = query.eq('year', filters.year);
      if (filters.status) query = query.eq('status', filters.status);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('📦 Fetched records:', data.length);
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
      
      // Calculate statistics - handle both old and new records
      const totalRecords = data.length;
      
      // Use gross_salary if available, otherwise calculate from salary + bonus
      const totalGrossSalary = data.reduce((sum, record) => {
        const gross = parseFloat(record.gross_salary) || 
                     (parseFloat(record.salary) + parseFloat(record.bonus || 0));
        return sum + gross;
      }, 0);
      
      // Use total_deductions if available, otherwise use deductions
      const totalDeductions = data.reduce((sum, record) => {
        const deduct = parseFloat(record.total_deductions) || parseFloat(record.deductions) || 0;
        return sum + deduct;
      }, 0);
      
      // Calculate net salary: gross_salary - total_deductions
      const totalNetSalary = data.reduce((sum, record) => {
        // If net_salary exists and is not 0, use it
        if (record.net_salary && parseFloat(record.net_salary) !== 0) {
          return sum + parseFloat(record.net_salary);
        }
        // Otherwise calculate: gross - deductions
        const gross = parseFloat(record.gross_salary) || 
                     (parseFloat(record.salary) + parseFloat(record.bonus || 0));
        const deduct = parseFloat(record.total_deductions) || parseFloat(record.deductions) || 0;
        return sum + (gross - deduct);
      }, 0);
      
      const totalBonus = data.reduce((sum, record) => sum + (parseFloat(record.bonus) || 0), 0);
      const totalOvertime = data.reduce((sum, record) => sum + (parseFloat(record.overtime_pay) || 0), 0);
      
      console.log('💰 Calculated totals:', {
        totalRecords,
        totalGrossSalary,
        totalDeductions,
        totalNetSalary,
        totalBonus
      });
      
      // Status breakdown
      const statusBreakdown = {
        draft: data.filter(r => r.status === 'draft').length,
        processed: data.filter(r => r.status === 'processed').length,
        paid: data.filter(r => r.status === 'paid').length,
        cancelled: data.filter(r => r.status === 'cancelled').length
      };
      
      return {
        totalRecords,
        totalGrossSalary,
        totalDeductions,
        totalNetSalary,
        totalBonus,
        totalOvertime,
        averageNetSalary: totalRecords > 0 ? totalNetSalary / totalRecords : 0,
        statusBreakdown
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Get department-wise payroll summary
  static async getDepartmentSummary(month, year) {
    try {
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          employee:users!payroll_user_id_fkey(department)
        `)
        .eq('month', month)
        .eq('year', year);
      
      if (error) throw error;
      
      // Group by department
      const departmentStats = {};
      data.forEach(record => {
        const dept = record.employee?.department || 'Unknown';
        if (!departmentStats[dept]) {
          departmentStats[dept] = {
            count: 0,
            totalGross: 0,
            totalNet: 0,
            totalDeductions: 0
          };
        }
        departmentStats[dept].count++;
        departmentStats[dept].totalGross += parseFloat(record.gross_salary) || 0;
        departmentStats[dept].totalNet += parseFloat(record.net_salary) || 0;
        departmentStats[dept].totalDeductions += parseFloat(record.total_deductions) || 0;
      });
      
      return departmentStats;
    } catch (error) {
      throw error;
    }
  }
  
  // ============================================================================
  // HISTORY & AUDIT
  // ============================================================================
  
  // Log payroll history
  static async logHistory(payrollId, action, changedBy, changes) {
    try {
      const { data, error } = await supabase
        .from('payroll_history')
        .insert([{
          payroll_id: payrollId,
          action: action,
          changed_by: changedBy,
          changes: changes
        }])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get payroll history
  static async getHistory(payrollId) {
    try {
      const { data, error } = await supabase
        .from('payroll_history')
        .select(`
          *,
          user:users!payroll_history_changed_by_fkey(name, email)
        `)
        .eq('payroll_id', payrollId)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PayrollEnhanced;
