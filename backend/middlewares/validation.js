const Joi = require('joi');

// Validation schemas
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),
  
  register: Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'manager', 'hr', 'employee', 'candidate').optional(),
    department: Joi.string().required()
  }),
  
  attendance: Joi.object({
    user_id: Joi.string().required().messages({
      'string.empty': 'User ID is required',
      'any.required': 'User ID is required'
    }),
    date: Joi.alternatives().try(
      Joi.date(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    ).required().messages({
      'any.required': 'Date is required',
      'string.pattern.base': 'Date must be in YYYY-MM-DD format'
    }),
    status: Joi.string().valid('present', 'absent', 'late', 'on_leave').required().messages({
      'any.only': 'Status must be one of: present, absent, late, on_leave',
      'any.required': 'Status is required'
    }),
    leave_type: Joi.string().valid('sick', 'casual', 'annual', 'unpaid').optional()
  }),
  
  payroll: Joi.object({
    user_id: Joi.string().uuid().required(),
    salary: Joi.number().positive().required(),
    bonus: Joi.number().min(0).optional(),
    deductions: Joi.number().min(0).optional(),
    month: Joi.number().min(1).max(12).required(),
    year: Joi.number().min(2000).max(2100).required()
  }),
  
  performance: Joi.object({
    user_id: Joi.string().uuid().required(),
    reviewer_id: Joi.string().uuid().optional(),
    review_period_start: Joi.date().required(),
    review_period_end: Joi.date().required(),
    
    // Core Metrics (1-5)
    quality_of_work: Joi.number().min(1).max(5).optional(),
    productivity: Joi.number().min(1).max(5).optional(),
    communication: Joi.number().min(1).max(5).optional(),
    teamwork: Joi.number().min(1).max(5).optional(),
    problem_solving: Joi.number().min(1).max(5).optional(),
    initiative: Joi.number().min(1).max(5).optional(),
    attendance_punctuality: Joi.number().min(1).max(5).optional(),
    
    // Goal Tracking
    previous_goals_completion: Joi.string().allow('').optional(),
    goals: Joi.string().allow('').optional(),
    
    // Feedback
    achievements: Joi.string().allow('').optional(),
    areas_of_improvement: Joi.string().allow('').optional(),
    manager_comments: Joi.string().allow('').optional(),
    employee_self_assessment: Joi.string().allow('').optional(),
    
    // Final Evaluation
    overall_rating: Joi.number().min(1).max(5).optional(),
    recommendation: Joi.string().valid('none', 'promotion', 'bonus', 'training', 'pip').optional(),
    status: Joi.string().valid('draft', 'submitted', 'completed').optional()
  }),
  
  job: Joi.object({
    title: Joi.string().min(3).required(),
    department: Joi.string().optional(),
    location: Joi.string().optional(),
    employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'internship').optional(),
    experience_level: Joi.string().valid('entry', 'mid', 'senior', 'lead').optional(),
    salary_range: Joi.string().optional(),
    description: Joi.string().min(10).required(),
    requirements: Joi.string().optional(),
    responsibilities: Joi.string().optional(),
    benefits: Joi.string().optional(),
    status: Joi.string().valid('open', 'closed', 'on_hold').optional(),
    posted_by: Joi.string().uuid().optional(),
    closing_date: Joi.date().optional(),
    posted_date: Joi.date().optional(),
    last_date_to_apply: Joi.date().optional().allow(''),
    vacancies: Joi.number().integer().min(1).optional()
  }),
  
  application: Joi.object({
    job_id: Joi.string().required().messages({
      'string.empty': 'Job ID is required',
      'any.required': 'Job ID is required'
    }),
    resume_url: Joi.string().uri().optional().allow('').messages({
      'string.uri': 'Resume URL must be a valid URL'
    }),
    candidate_id: Joi.string().optional() // Added by backend
  })
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

module.exports = { schemas, validate };