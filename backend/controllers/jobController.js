const Job = require('../models/Job');

// Create job
const createJob = async (req, res) => {
  try {
    // Only admins and HR can create jobs
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    console.log('Creating job with data:', req.body);
    console.log('User:', req.user);
    
    // Add posted_by field and set defaults
    const jobData = {
      ...req.body,
      posted_by: req.user.id,
      posted_date: req.body.posted_date || new Date().toISOString().split('T')[0],
      status: req.body.status || 'open',
      vacancies: req.body.vacancies || 1,
      filled_positions: 0
    };
    
    // Validate last_date_to_apply
    if (req.body.last_date_to_apply) {
      const lastDate = new Date(req.body.last_date_to_apply);
      const postedDate = new Date(jobData.posted_date);
      
      if (lastDate < postedDate) {
        return res.status(400).json({
          success: false,
          message: 'Last date to apply cannot be before posted date'
        });
      }
    }
    
    console.log('Final job data:', jobData);
    
    const job = await Job.create(jobData);
    
    console.log('Job created successfully:', job);
    
    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: {
        job
      }
    });
  } catch (error) {
    console.error('Job creation error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
      error: error.message,
      details: error.detail || error.hint
    });
  }
};

// Get job by ID
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await Job.findById(id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        job
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all jobs
const getAllJobs = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    const jobs = await Job.getAll(limit, offset);
    
    res.status(200).json({
      success: true,
      data: {
        jobs
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get jobs by department
const getJobsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const jobs = await Job.findByDepartment(department, limit, offset);
    
    res.status(200).json({
      success: true,
      data: {
        jobs
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update job
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await Job.findById(id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Only admins and HR can update jobs
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedJob = await Job.update(id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: {
        job: updatedJob
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete job
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await Job.findById(id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Only admins and HR can delete jobs
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Job.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get job statistics
const getJobStats = async (req, res) => {
  try {
    // Only admins and HR can view job statistics
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const stats = await Job.getStats();
    
    res.status(200).json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
  createJob,
  getJobById,
  getAllJobs,
  getJobsByDepartment,
  updateJob,
  deleteJob,
  getJobStats
};