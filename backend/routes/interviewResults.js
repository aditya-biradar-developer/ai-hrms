const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { supabase } = require('../config/db');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all interview results (admin and HR only)
router.get('/', authorize('admin', 'hr'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('interview_results')
      .select(`
        *,
        candidate:users!interview_results_candidate_id_fkey(id, name, email),
        job:jobs(id, title, department),
        application:applications(id, status)
      `)
      .order('completed_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching interview results:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch interview results'
      });
    }
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get interview results by candidate ID
router.get('/candidate/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { user } = req;
    
    // Check if user is viewing their own results or is admin/HR
    if (user.id !== candidateId && !['admin', 'hr'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const { data, error } = await supabase
      .from('interview_results')
      .select(`
        *,
        job:jobs(id, title, department, company),
        application:applications(id, status, interview_date)
      `)
      .eq('candidate_id', candidateId)
      .order('completed_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching candidate results:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch results'
      });
    }
    
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get interview result by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;
    
    const { data, error } = await supabase
      .from('interview_results')
      .select(`
        *,
        candidate:users!interview_results_candidate_id_fkey(id, name, email),
        job:jobs(id, title, department, company),
        application:applications(id, status, interview_date, interview_time, interview_location)
      `)
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: 'Interview result not found'
      });
    }
    
    // Check access
    if (data.candidate_id !== user.id && !['admin', 'hr'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get interview statistics
router.get('/stats/summary', authorize('admin', 'hr'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('interview_results')
      .select('overall_score, performance_level, completed_at');
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
    
    // Calculate statistics
    const totalInterviews = data.length;
    const avgScore = data.reduce((sum, r) => sum + r.overall_score, 0) / totalInterviews || 0;
    
    const performanceDistribution = {
      excellent: data.filter(r => r.overall_score >= 80).length,
      good: data.filter(r => r.overall_score >= 60 && r.overall_score < 80).length,
      average: data.filter(r => r.overall_score >= 40 && r.overall_score < 60).length,
      poor: data.filter(r => r.overall_score < 40).length
    };
    
    // Recent interviews (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentInterviews = data.filter(r => new Date(r.completed_at) >= thirtyDaysAgo).length;
    
    res.json({
      success: true,
      data: {
        totalInterviews,
        averageScore: Math.round(avgScore),
        performanceDistribution,
        recentInterviews
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
