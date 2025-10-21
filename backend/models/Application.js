const { supabase } = require('../config/db');

class Application {
  // Create application
  static async create(applicationData) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert([applicationData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get application by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get applications by candidate ID
  static async findByCandidateId(candidateId, limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get applications by job ID
  static async findByJobId(jobId, limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get all applications (for admin)
  static async getAll(limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          candidate:users!applications_candidate_id_fkey(
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      // Flatten the candidate data into the application object
      const flattenedData = data.map(app => ({
        ...app,
        candidate_name: app.candidate?.name || 'Unknown',
        candidate_email: app.candidate?.email || 'N/A'
      }));
      
      return flattenedData;
    } catch (error) {
      throw error;
    }
  }
  
  // Update application
  static async update(id, applicationData) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update(applicationData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Delete application
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get application statistics
  static async getStats(jobId = null, status = null) {
    try {
      let query = supabase
        .from('applications')
        .select('*');
      
      if (jobId) {
        query = query.eq('job_id', jobId);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calculate statistics
      const totalApplications = data.length;
      const applicationsByStatus = {
        pending: data.filter(app => app.status === 'pending').length,
        reviewed: data.filter(app => app.status === 'reviewed').length,
        shortlisted: data.filter(app => app.status === 'shortlisted').length,
        rejected: data.filter(app => app.status === 'rejected').length,
        hired: data.filter(app => app.status === 'hired').length
      };
      
      const averageScore = totalApplications > 0 
        ? data.reduce((sum, app) => sum + (app.score || 0), 0) / totalApplications 
        : 0;
      
      return {
        totalApplications,
        applicationsByStatus,
        averageScore
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Application;