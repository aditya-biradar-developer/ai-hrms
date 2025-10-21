const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { supabase } = require('../config/db');

const router = express.Router();

// PUBLIC ROUTES (No authentication required) - Must come BEFORE authenticate middleware

// Get questions by interview token (Public - for AI interview)
router.get('/token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Fetching questions for token:', token.substring(0, 10) + '...');
    
    // Get application by token
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, job_id')
      .eq('interview_token', token)
      .single();
    
    if (appError || !application) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    // Get custom questions for this application
    const { data: questions, error: qError } = await supabase
      .from('interview_questions')
      .select('*')
      .eq('application_id', application.id)
      .order('question_order', { ascending: true });
    
    if (qError) {
      console.error('Error fetching questions:', qError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch questions'
      });
    }
    
    console.log(`✅ Found ${questions?.length || 0} custom questions`);
    
    res.json({
      success: true,
      data: questions || [],
      has_custom_questions: questions && questions.length > 0
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// PROTECTED ROUTES (Authentication required)
router.use(authenticate);

// Clean duplicate questions for an application (HR/Admin only)
router.delete('/application/:applicationId/duplicates', authorize('admin', 'hr'), async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    console.log(`🧹 Cleaning duplicates for application: ${applicationId}`);
    
    // Get all questions for this application
    const { data: allQuestions } = await supabase
      .from('interview_questions')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });
    
    if (!allQuestions || allQuestions.length === 0) {
      return res.json({ success: true, message: 'No questions found' });
    }
    
    // Keep only unique questions based on question_text
    const seen = new Set();
    const toKeep = [];
    const toDelete = [];
    
    allQuestions.forEach(q => {
      if (!seen.has(q.question_text)) {
        seen.add(q.question_text);
        toKeep.push(q.id);
      } else {
        toDelete.push(q.id);
      }
    });
    
    // Delete duplicates
    if (toDelete.length > 0) {
      await supabase
        .from('interview_questions')
        .delete()
        .in('id', toDelete);
      
      console.log(`✅ Deleted ${toDelete.length} duplicate questions, kept ${toKeep.length}`);
    }
    
    res.json({
      success: true,
      deleted: toDelete.length,
      kept: toKeep.length,
      message: `Removed ${toDelete.length} duplicates`
    });
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create questions for an application (HR/Admin only)
router.post('/application/:applicationId', authorize('admin', 'hr'), async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { questions } = req.body; // Array of question objects
    
    console.log(`📝 Creating ${questions.length} custom questions for application:`, applicationId);
    
    // Get application to find job_id
    const { data: application } = await supabase
      .from('applications')
      .select('job_id')
      .eq('id', applicationId)
      .single();
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Delete existing questions for this application to prevent duplicates
    console.log(`🗑️ Deleting existing questions for application: ${applicationId}`);
    await supabase
      .from('interview_questions')
      .delete()
      .eq('application_id', applicationId);
    
    // Prepare questions for insertion
    const questionsToInsert = questions.map((q, index) => ({
      application_id: applicationId,
      job_id: application.job_id,
      question_text: q.question_text,
      question_type: q.question_type || 'general',
      expected_answer: q.expected_answer || null,
      code_snippet: q.code_snippet || null,
      code_language: q.code_language || null,
      duration: q.duration || 180,
      question_order: index,
      created_by: req.user.id
    }));
    
    // Insert questions
    const { data, error } = await supabase
      .from('interview_questions')
      .insert(questionsToInsert)
      .select();
    
    if (error) {
      console.error('❌ Error creating questions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create questions'
      });
    }
    
    console.log('✅ Questions created successfully');
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get questions for an application (Authenticated users only)
router.get('/application/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    const { data, error } = await supabase
      .from('interview_questions')
      .select('*')
      .eq('application_id', applicationId)
      .order('question_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching questions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch questions'
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

// Update a question (HR/Admin only)
router.put('/:id', authorize('admin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('interview_questions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update question'
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

// Delete a question (HR/Admin only)
router.delete('/:id', authorize('admin', 'hr'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('interview_questions')
      .delete()
      .eq('id', id);
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete question'
      });
    }
    
    res.json({
      success: true,
      message: 'Question deleted successfully'
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
