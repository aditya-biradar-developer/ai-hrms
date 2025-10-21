/**
 * AI Routes
 * Endpoints for AI-powered features
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const aiService = require('../services/aiService');

/**
 * @route   GET /api/ai/health
 * @desc    Check AI service health
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const health = await aiService.healthCheck();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check AI service health',
      error: error.message
    });
  }
});

// All other routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/ai/resume/screen
 * @desc    Screen resume against job description
 * @access  Private (Admin, HR, Manager)
 */
router.post('/resume/screen', authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { resume_text, resume_url, job_description } = req.body;

    if (!job_description) {
      return res.status(400).json({
        success: false,
        message: 'job_description is required'
      });
    }

    if (!resume_text && !resume_url) {
      return res.status(400).json({
        success: false,
        message: 'Either resume_text or resume_url is required'
      });
    }

    console.log('🤖 AI: Screening resume...');
    
    // Pass both resume_text and resume_url to AI service
    // AI service will handle fetching from URL if needed
    const result = await aiService.screenResume(resume_text, job_description, resume_url);
    
    res.json(result);
  } catch (error) {
    console.error('Resume screening error:', error);
    res.status(500).json({
      success: false,
      message: 'Resume screening failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai/resume/rank
 * @desc    Rank multiple candidates
 * @access  Private (Admin, HR, Manager)
 */
router.post('/resume/rank', authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { candidates, job_description } = req.body;

    if (!candidates || !Array.isArray(candidates) || !job_description) {
      return res.status(400).json({
        success: false,
        message: 'candidates (array) and job_description are required'
      });
    }

    console.log(`🤖 AI: Ranking ${candidates.length} candidates...`);
    const result = await aiService.rankCandidates(candidates, job_description);
    
    res.json(result);
  } catch (error) {
    console.error('Candidate ranking error:', error);
    res.status(500).json({
      success: false,
      message: 'Candidate ranking failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai/job-description/generate
 * @desc    Generate job description
 * @access  Private (Admin, HR)
 */
router.post('/job-description/generate', authorize('admin', 'hr'), async (req, res) => {
  try {
    const { title, skills, department, experience_level, employment_type } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'title is required'
      });
    }

    console.log('🤖 AI: Generating job description for:', title);
    const result = await aiService.generateJobDescription({
      title,
      skills: skills || [],
      department: department || 'General',
      experience_level: experience_level || 'mid',
      employment_type: employment_type || 'full-time'
    });
    
    res.json(result);
  } catch (error) {
    console.error('Job description generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Job description generation failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai/email/generate
 * @desc    Generate professional email
 * @access  Private (Admin, HR, Manager)
 */
router.post('/email/generate', authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { type, recipient_name, context, tone } = req.body;

    if (!type || !recipient_name) {
      return res.status(400).json({
        success: false,
        message: 'type and recipient_name are required'
      });
    }

    console.log('🤖 AI: Generating email:', type);
    const result = await aiService.generateEmail(type, recipient_name, context || {}, tone || 'professional');
    
    res.json(result);
  } catch (error) {
    console.error('Email generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Email generation failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai/performance/summarize
 * @desc    Summarize employee performance
 * @access  Private (Admin, HR, Manager)
 */
router.post('/performance/summarize', authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { employee_data, performance_metrics, attendance, feedback } = req.body;

    if (!employee_data) {
      return res.status(400).json({
        success: false,
        message: 'employee_data is required'
      });
    }

    console.log('🤖 AI: Summarizing performance for:', employee_data.name);
    const result = await aiService.summarizePerformance({
      employee_data,
      performance_metrics: performance_metrics || {},
      attendance: attendance || {},
      feedback: feedback || []
    });
    
    res.json(result);
  } catch (error) {
    console.error('Performance summarization error:', error);
    res.status(500).json({
      success: false,
      message: 'Performance summarization failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/ai/chat
 * @desc    Chat with AI assistant
 * @access  Private (All authenticated users)
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'message is required'
      });
    }

    console.log('🤖 AI Chat:', req.user.role, '-', message.substring(0, 50));
    const result = await aiService.chat(message, req.user.role, context || {});
    
    res.json(result);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      message: 'AI chat failed',
      error: error.message
    });
  }
});

module.exports = router;
