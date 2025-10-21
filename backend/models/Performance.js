const { supabase } = require('../config/db');

class Performance {
  // Create performance record
  static async create(performanceData) {
    try {
      const { data, error } = await supabase
        .from('performance')
        .insert([performanceData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get performance by ID with employee names
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('performance')
        .select(`
          *,
          employee:users!performance_user_id_fkey(id, name, email, department),
          reviewer:users!performance_reviewer_id_fkey(id, name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Flatten the data structure
      return {
        ...data,
        employee_name: data.employee?.name || 'Unknown',
        employee_email: data.employee?.email || '',
        employee_department: data.employee?.department || '',
        reviewer_name: data.reviewer?.name || 'Unknown'
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Get performance by user ID
  static async findByUserId(userId, limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('performance')
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
  
  // Get all performance (for admin) with employee names
  static async getAll(limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('performance')
        .select(`
          *,
          employee:users!performance_user_id_fkey(id, name, email, department),
          reviewer:users!performance_reviewer_id_fkey(id, name, email)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      // Flatten the data structure for easier frontend consumption
      return data.map(review => ({
        ...review,
        employee_name: review.employee?.name || 'Unknown',
        employee_email: review.employee?.email || '',
        employee_department: review.employee?.department || '',
        reviewer_name: review.reviewer?.name || 'Unknown'
      }));
    } catch (error) {
      throw error;
    }
  }
  
  // Update performance
  static async update(id, performanceData) {
    try {
      const { data, error } = await supabase
        .from('performance')
        .update(performanceData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Delete performance
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('performance')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get performance statistics
  static async getStats(userId = null, startDate = null, endDate = null) {
    try {
      let query = supabase
        .from('performance')
        .select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      if (startDate) {
        query = query.gte('review_period_start', startDate);
      }
      
      if (endDate) {
        query = query.lte('review_period_end', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log('📊 Raw data from database:', data?.length || 0, 'reviews');
      console.log('Sample review:', data?.[0]);
      
      // Calculate statistics using overall_rating (new field)
      const totalReviews = data.length;
      
      // Filter out records without overall_rating
      const validRatings = data.filter(record => record.overall_rating && record.overall_rating > 0);
      
      const averageRating = validRatings.length > 0 
        ? validRatings.reduce((sum, record) => sum + record.overall_rating, 0) / validRatings.length 
        : 0;
      
      const ratingDistribution = {
        5: data.filter(record => record.overall_rating === 5).length,
        4: data.filter(record => record.overall_rating === 4).length,
        3: data.filter(record => record.overall_rating === 3).length,
        2: data.filter(record => record.overall_rating === 2).length,
        1: data.filter(record => record.overall_rating === 1).length
      };
      
      return {
        totalReviews,
        averageRating,
        ratingDistribution
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Performance;