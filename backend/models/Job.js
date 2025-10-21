const { supabase } = require('../config/db');

class Job {
  // Create job
  static async create(jobData) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get job by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get all jobs
  static async getAll(limit = 100, offset = 0, includeDeleted = false) {
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .order('posted_date', { ascending: false });
        
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
        
      const { data, error } = await query.range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get jobs by department
  static async findByDepartment(department, limit = 100, offset = 0, includeDeleted = false) {
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('department', department)
        .order('posted_date', { ascending: false });
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query.range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Update job
  static async update(id, jobData) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .update(jobData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Delete job
  static async delete(id) {
    try {
      // First check if the job exists and is closed
      const job = await this.findById(id);
      if (!job) {
        throw new Error('Job not found');
      }
      if (job.status !== 'closed') {
        throw new Error('Only closed jobs can be deleted');
      }

      // Mark job as deleted instead of actually deleting it
      const { data, error } = await supabase
        .from('jobs')
        .update({ 
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          is_deleted: true 
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get job statistics
  static async getStats() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*');
      
      if (error) throw error;
      
      // Calculate statistics
      const totalJobs = data.length;
      const jobsByDepartment = {};
      
      data.forEach(job => {
        if (!jobsByDepartment[job.department]) {
          jobsByDepartment[job.department] = 0;
        }
        jobsByDepartment[job.department]++;
      });
      
      return {
        totalJobs,
        jobsByDepartment
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Check if job is accepting applications
  static async isAcceptingApplications(jobId) {
    try {
      const job = await this.findById(jobId);
      
      if (!job) {
        return { accepting: false, reason: 'Job not found' };
      }
      
      // Check if job status is open
      if (job.status !== 'open') {
        return { accepting: false, reason: 'Job is closed' };
      }
      
      // Check if last date to apply has passed
      if (job.last_date_to_apply) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastDate = new Date(job.last_date_to_apply);
        lastDate.setHours(23, 59, 59, 999);
        
        if (today > lastDate) {
          return { accepting: false, reason: 'Application deadline has passed' };
        }
      }
      
      // Check if vacancies are filled
      const filledPositions = job.filled_positions || 0;
      const vacancies = job.vacancies || 0;
      
      if (filledPositions >= vacancies) {
        return { accepting: false, reason: 'All positions have been filled' };
      }
      
      return { 
        accepting: true, 
        remainingVacancies: vacancies - filledPositions 
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Update filled positions count
  static async updateFilledPositions(jobId, increment = 1) {
    try {
      const job = await this.findById(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      const newFilledPositions = (job.filled_positions || 0) + increment;
      
      // Auto-close job if all vacancies are filled
      const updateData = {
        filled_positions: newFilledPositions
      };
      
      if (newFilledPositions >= job.vacancies) {
        updateData.status = 'closed';
      }
      
      const { data, error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Job;