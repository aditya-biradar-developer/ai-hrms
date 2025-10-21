const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { validate, schemas } = require('../middlewares/validation');
const { supabase } = require('../config/db');
const {
  createApplication,
  getApplicationById,
  getApplicationsByCandidateId,
  getApplicationsByJobId,
  getAllApplications,
  updateApplication,
  deleteApplication,
  getApplicationStats,
  saveATSScreening,
  scheduleInterviewWithEmail,
  convertToEmployee,
  verifyOnboardingToken
} = require('../controllers/applicationController');

const router = express.Router();

// ==========================================
// PUBLIC ROUTES (No Authentication Required)
// ==========================================

// Get interview details by token (public route for candidates)
router.get('/interview/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Looking up interview by token:', token.substring(0, 10) + '...');
    
    // Get application by token
    const { data: application, error } = await supabase
      .from('applications')
      .select('*')
      .eq('interview_token', token)
      .single();
    
    if (error || !application) {
      console.log('❌ Interview not found:', error?.message);
      return res.status(404).json({
        success: false,
        message: 'Interview not found or link has expired'
      });
    }
    
    console.log('✅ Application found:', application.id);
    console.log('📅 Application interview_date:', application.interview_date);
    console.log('🕐 Application interview_time:', application.interview_time);
    console.log('📍 Application interview_location:', application.interview_location);
    console.log('✅ Interview status:', application.interview_status || 'pending');
    
    // Check if interview is already completed
    if (application.interview_status === 'completed') {
      console.log('⚠️ Interview already completed at:', application.interview_completed_at);
      return res.json({
        success: true,
        data: {
          id: application.id,
          interview_status: 'completed',
          interview_completed_at: application.interview_completed_at,
          message: 'Interview already completed'
        }
      });
    }
    
    // Fetch job details
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, department')
      .eq('id', application.job_id)
      .single();
    
    // Fetch candidate details
    const { data: candidate } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', application.candidate_id)
      .single();
    
    console.log('✅ Job:', job?.title, '| Candidate:', candidate?.name);
    
    // Try to get custom questions for this application
    let customQuestions = [];
    try {
      console.log('🔍 Looking for custom questions for application:', application.id);
      
      // Fetch custom questions from new multi-round tables first, then fallback to old table
      const assessmentService = require('../services/assessmentService');
      let questionsData = [];
      
      try {
        // Try to get questions from all assessment types
        const aptitudeQuestions = await assessmentService.getQuestions(application.id, 'aptitude');
        const communicationQuestions = await assessmentService.getQuestions(application.id, 'communication');
        const codingQuestions = await assessmentService.getQuestions(application.id, 'coding');
        
        questionsData = [...aptitudeQuestions, ...communicationQuestions, ...codingQuestions];
        console.log(`✅ New tables: Found ${questionsData.length} questions (apt:${aptitudeQuestions.length}, comm:${communicationQuestions.length}, code:${codingQuestions.length})`);
        
        // If new tables are empty, try fallback to old table
        if (questionsData.length === 0) {
          console.log('⚠️ New tables empty, trying fallback to old table...');
          throw new Error('New tables empty, using fallback');
        }
      } catch (newTableError) {
        console.log('⚠️ New tables failed or empty, trying old table:', newTableError.message);
        
        // Fallback to old interview_questions table
        const { data: oldQuestionsData, error: questionsError } = await supabase
          .from('interview_questions')
          .select('*')
          .eq('application_id', application.id)
          .order('question_order', { ascending: true });
        
        questionsData = oldQuestionsData || [];
        console.log(`🔄 Old table: Found ${questionsData.length} questions`);
      }
      
      if (questionsData && questionsData.length > 0) {
        console.log('📋 Found custom questions in database:', questionsData.length);
        
        // Format questions for the frontend
        customQuestions = questionsData.map((q, index) => {
          // Parse options if it's a JSON string and filter out metadata
          let options = {};
          let correctAnswerFromOptions = null;
          
          if (q.options) {
            try {
              const rawOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
              
              // Extract correct_answer from rawOptions before filtering
              correctAnswerFromOptions = rawOptions.correct_answer;
              
              // Filter to only include A, B, C, D, E options (not metadata)
              const validOptionKeys = ['A', 'B', 'C', 'D', 'E'];
              const metadataKeys = ['correct_answer', 'difficulty', 'explanation', 'time_limit'];
              
              Object.keys(rawOptions).forEach(key => {
                if (validOptionKeys.includes(key) && !metadataKeys.includes(key)) {
                  options[key] = rawOptions[key];
                }
              });
              
              console.log(`🔍 Filtered options for question ${q.id}:`, options);
            } catch (e) {
              console.log('Error parsing options:', e);
            }
          }
          
          // Use correct_answer from main object, or extract from options if missing
          let correctAnswer = q.correct_answer;
          if (!correctAnswer && correctAnswerFromOptions) {
            correctAnswer = correctAnswerFromOptions;
            console.log(`🔧 Extracted correct_answer from options for question ${q.id}: ${correctAnswer}`);
          }

          return {
            id: q.id,
            question: q.question_text,
            question_text: q.question_text,
            text: q.question_text,
            type: q.question_type,
            question_type: q.question_type,
            options: options,
            correct_answer: correctAnswer,
            explanation: q.explanation,
            topic: q.topic,
            difficulty: q.difficulty,
            time_limit: q.time_limit || q.duration || 60,
            duration: q.duration || 180,
            code_snippet: q.code_snippet !== 'None' ? q.code_snippet : null,
            code_language: q.code_language,
            expected_answer: q.expected_answer,
            answer_mode: q.answer_mode || 'voice',
            question_order: q.question_order || index,
            // Communication-specific fields
            passage: q.passage,
            audio_url: q.audio_url,
            audio_text: q.audio_url, // Map audio_url to audio_text for compatibility
            instructions: q.instructions,
            evaluation_criteria: q.evaluation_criteria ? (typeof q.evaluation_criteria === 'string' ? JSON.parse(q.evaluation_criteria) : q.evaluation_criteria) : null,
            title: q.title,
            skill: q.skill || q.section,
            subtype: q.subtype,
            section: q.section
          };
        });
        
        console.log('✅ Formatted questions:', customQuestions.length);
      } else {
        console.log('📝 No custom questions found in database');
      }
    } catch (e) {
      console.log('⚠️ Error fetching custom questions:', e.message);
    }
    
    // Combine data
    const result = {
      id: application.id,
      interview_date: application.interview_date,
      interview_time: application.interview_time,
      interview_location: application.interview_location,
      interview_notes: application.interview_notes,
      interview_token: application.interview_token,
      custom_questions: customQuestions,
      job: job || { id: application.job_id, title: 'Unknown Position', department: 'Unknown' },
      candidate: candidate || { id: application.candidate_id, name: 'Candidate', email: '' }
    };
    
    console.log('📦 Sending response:', JSON.stringify(result, null, 2));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error fetching interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interview details'
    });
  }
});

// Save interview results (public route - called by AI service)
router.post('/interview/:token/results', async (req, res) => {
  try {
    const { token } = req.params;
    const results = req.body;
    
    console.log('💾 Saving interview results for token:', token.substring(0, 10) + '...');
    
    // Get application by token
    const { data: application, error } = await supabase
      .from('applications')
      .select('id, candidate_id, job_id')
      .eq('interview_token', token)
      .single();
    
    if (error || !application) {
      console.log('❌ Application not found');
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    // Save interview results
    const { data: savedResults, error: saveError } = await supabase
      .from('interview_results')
      .insert({
        application_id: application.id,
        candidate_id: application.candidate_id,
        job_id: application.job_id,
        overall_score: results.overall_score || 0,
        performance_level: results.performance_level || 'Average',
        question_scores: results.question_scores || [],
        category_scores: results.category_scores || [],
        feedback: results.feedback || '',
        recommendations: results.recommendations || [],
        strengths: results.strengths || [],
        weaknesses: results.weaknesses || [],
        completed_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('❌ Error saving results:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save results'
      });
    }
    
    // Update application status and mark interview as completed
    await supabase
      .from('applications')
      .update({ 
        status: 'interviewed',
        interview_status: 'completed',
        interview_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', application.id);
    
    console.log('✅ Interview results saved successfully - Interview marked as completed');
    
    res.json({
      success: true,
      data: savedResults
    });
  } catch (error) {
    console.error('❌ Error saving interview results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save interview results'
    });
  }
});

// Verify onboarding token (public route)
router.get('/onboarding/:token/verify', (req, res, next) => {
  console.log('🔍 Onboarding verification route hit:', req.params.token);
  next();
}, verifyOnboardingToken);

// Convert candidate to employee (public route - secured by token)
router.post('/onboarding/:token/convert', (req, res, next) => {
  console.log('🔄 Onboarding conversion route hit:', req.params.token);
  next();
}, convertToEmployee);

// ==========================================
// AUTHENTICATED ROUTES (Below this point, all routes require authentication)
// ==========================================
router.use(authenticate);

// Create application
router.post('/', validate(schemas.application), createApplication);

// Get application statistics (all authenticated users can see their own stats)
router.get('/stats', getApplicationStats);

// Get all applications (admin and HR only)
router.get('/', authorize('admin', 'hr'), getAllApplications);

// Get applications by candidate ID
router.get('/candidate/:candidateId', getApplicationsByCandidateId);

// Get applications by job ID (admin and HR only)
router.get('/job/:jobId', authorize('admin', 'hr'), getApplicationsByJobId);

// Save ATS screening results (admin and HR only) - MUST be before /:id
router.post('/:applicationId/ats-screening', authorize('admin', 'hr'), saveATSScreening);

// Schedule interview with AI-generated email invitation (admin and HR only) - MUST be before /:id
router.post('/:id/schedule-interview', (req, res, next) => {
  console.log('🎯 Schedule interview route hit:', {
    method: req.method,
    url: req.url,
    params: req.params,
    body: req.body
  });
  next();
}, authorize('admin', 'hr'), scheduleInterviewWithEmail);

// Get application by ID - Generic route, must be after specific routes
router.get('/:id', getApplicationById);

// Update application (admin and HR only)
router.put('/:id', authorize('admin', 'hr'), updateApplication);

// Delete application (admin only)
router.delete('/:id', authorize('admin'), deleteApplication);

// Complete interview (public route - called by interview interface)
router.post('/interview/:token/complete', async (req, res) => {
  try {
    const { token } = req.params;
    const { answers, completed_at } = req.body;
    
    console.log('✅ Completing interview for token:', token.substring(0, 10) + '...');
    
    // Get application by token
    const { data: application, error } = await supabase
      .from('applications')
      .select('*')
      .eq('interview_token', token)
      .single();
    
    if (error || !application) {
      console.log('❌ Interview not found for completion:', error?.message);
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    // Update application with completion data
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        interview_status: 'completed',
        interview_completed_at: completed_at || new Date().toISOString(),
        interview_results: JSON.stringify(answers)
      })
      .eq('id', application.id);
    
    if (updateError) {
      console.error('❌ Error updating interview completion:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save interview completion'
      });
    }
    
    console.log('✅ Interview completed successfully for application:', application.id);
    
    res.json({
      success: true,
      message: 'Interview completed successfully'
    });
  } catch (error) {
    console.error('❌ Error completing interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete interview'
    });
  }
});

// Debug endpoint to check current interview results structure
router.get('/:id/debug-results', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: application, error } = await supabase
      .from('applications')
      .select('interview_results, interview_status')
      .eq('id', id)
      .single();
    
    if (error) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    
    console.log('🔍 DEBUG - Current interview_results for application', id, ':', application.interview_results);
    
    let parsedResults = null;
    try {
      if (application.interview_results) {
        parsedResults = JSON.parse(application.interview_results);
      }
    } catch (e) {
      console.log('❌ Error parsing results:', e.message);
    }
    
    res.json({
      success: true,
      raw_results: application.interview_results,
      parsed_results: parsedResults,
      interview_status: application.interview_status
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ success: false, message: 'Debug failed' });
  }
});

// Complete assessment with scoring (for aptitude/coding assessments)
router.post('/:id/complete-assessment', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      score, 
      total_questions, 
      correct_answers, 
      time_taken, 
      answers, 
      completed_at, 
      assessment_type 
    } = req.body;
    
    console.log('🔥 ===== ASSESSMENT COMPLETION DEBUG =====');
    console.log('📊 Application ID:', id);
    console.log('📈 Received Data:', {
      score,
      total_questions,
      correct_answers,
      assessment_type,
      time_taken,
      sections_scores: req.body.sections_scores
    });
    
    // Check if assessment already completed to prevent retakes
    const { data: existingApplication, error: fetchError } = await supabase
      .from('applications')
      .select('interview_status, interview_results')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching application:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Parse existing results to preserve previous assessments
    console.log('🔍 Existing application data:', {
      interview_status: existingApplication.interview_status,
      interview_results: existingApplication.interview_results
    });
    
    let existingResults = {};
    try {
      if (existingApplication.interview_results) {
        existingResults = JSON.parse(existingApplication.interview_results);
        console.log('✅ Parsed existing results:', existingResults);
      } else {
        console.log('📝 No existing results found');
      }
    } catch (e) {
      console.log('❌ Error parsing existing results:', e.message);
      console.log('📝 Starting with fresh results object');
      existingResults = {};
    }

    // Check if this specific assessment type was already completed
    if (existingResults[assessment_type] && existingResults[assessment_type].score !== undefined) {
      console.log(`⚠️ ${assessment_type} assessment already completed, preventing retake`);
      return res.status(400).json({
        success: false,
        message: `${assessment_type} assessment already completed. Multiple attempts not allowed.`
      });
    }
    
    // Add new assessment results while preserving existing ones
    const newAssessmentResult = {
      score: score,
      total_questions: total_questions,
      correct_answers: correct_answers,
      time_taken: time_taken,
      answers: answers,
      completed_at: completed_at || new Date().toISOString(),
      ...(req.body.sections_scores && { sections_scores: req.body.sections_scores })
    };

    // Preserve existing results and add new assessment
    const updatedResults = {
      ...existingResults,
      [assessment_type]: newAssessmentResult
    };

    console.log('🔧 Creating new assessment result:', newAssessmentResult);
    console.log('🔄 Merging with existing results...');
    console.log('📋 Previous assessment types:', Object.keys(existingResults));
    console.log('💾 Final merged results:', updatedResults);
    
    console.log('💾 Saving assessment results:', {
      assessment_type,
      score,
      preserving_previous: Object.keys(existingResults),
      total_assessment_types: Object.keys(updatedResults).length
    });

    const { error: updateError } = await supabase
      .from('applications')
      .update({
        interview_status: 'completed',
        interview_completed_at: completed_at || new Date().toISOString(),
        interview_results: JSON.stringify(updatedResults)
      })
      .eq('id', id);
    
    if (updateError) {
      console.error('❌ Error updating assessment results:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save assessment results'
      });
    }
    
    console.log('✅ Assessment results saved successfully!');
    console.log('🔥 ===== END ASSESSMENT DEBUG =====');
    
    console.log('✅ Assessment completed successfully with score:', score + '%');
    
    res.json({
      success: true,
      message: 'Assessment completed successfully',
      score: score
    });
  } catch (error) {
    console.error('❌ Error completing assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete assessment'
    });
  }
});

// Re-process existing assessment with correct type and scoring
router.post('/:id/reprocess-assessment', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔄 ===== RE-PROCESSING ASSESSMENT =====');
    console.log('📊 Application ID:', id);
    
    // Get current application data
    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select('interview_results, interview_status')
      .eq('id', id)
      .single();
    
    if (fetchError || !application.interview_results) {
      return res.status(404).json({ success: false, message: 'No assessment found to reprocess' });
    }
    
    const currentResults = JSON.parse(application.interview_results);
    console.log('📋 Current results:', currentResults);
    
    // Detect correct assessment type from answers
    const answerKeys = Object.keys(currentResults.answers || {});
    const hasReadingAnswers = answerKeys.some(key => key.startsWith('Reading_'));
    const hasListeningAnswers = answerKeys.some(key => key.startsWith('Listening_'));
    const hasGrammarAnswers = answerKeys.some(key => key.startsWith('Grammar_'));
    
    let correctAssessmentType = 'aptitude';
    if (hasReadingAnswers || hasListeningAnswers || hasGrammarAnswers) {
      correctAssessmentType = 'communication';
    }
    
    console.log('🎯 Detected correct assessment type:', correctAssessmentType);
    
    if (correctAssessmentType === 'communication') {
      // Re-calculate communication assessment score
      const readingAnswers = answerKeys.filter(key => key.startsWith('Reading_'));
      const listeningAnswers = answerKeys.filter(key => key.startsWith('Listening_'));
      const grammarAnswers = answerKeys.filter(key => key.startsWith('Grammar_'));
      
      // Calculate scores for each section
      const readingCompleted = readingAnswers.filter(key => 
        currentResults.answers[key]?.type === 'audio' && currentResults.answers[key]?.audioBlob
      ).length;
      const readingScore = readingAnswers.length > 0 ? (readingCompleted / readingAnswers.length) * 100 : 0;
      
      const listeningCompleted = listeningAnswers.filter(key => 
        currentResults.answers[key]?.type === 'audio' && currentResults.answers[key]?.audioBlob
      ).length;
      const listeningScore = listeningAnswers.length > 0 ? (listeningCompleted / listeningAnswers.length) * 100 : 0;
      
      // For grammar, we need to check correct answers (this would need the original questions)
      // For now, assume all grammar answers are attempts (completion-based)
      const grammarScore = grammarAnswers.length > 0 ? 100 : 0; // Assume completed if answered
      
      // Calculate overall score
      let overallScore = 0;
      let sectionsCount = 0;
      
      if (readingAnswers.length > 0) { overallScore += readingScore; sectionsCount++; }
      if (listeningAnswers.length > 0) { overallScore += listeningScore; sectionsCount++; }
      if (grammarAnswers.length > 0) { overallScore += grammarScore; sectionsCount++; }
      
      const finalScore = sectionsCount > 0 ? Math.round(overallScore / sectionsCount) : 0;
      
      // Create new multi-round structure
      const newResults = {
        communication: {
          score: finalScore,
          total_questions: answerKeys.length,
          time_taken: currentResults.time_taken || 0,
          answers: currentResults.answers,
          sections_scores: {
            reading: {
              score: Math.round(readingScore),
              completed: readingCompleted,
              total: readingAnswers.length
            },
            listening: {
              score: Math.round(listeningScore),
              completed: listeningCompleted,
              total: listeningAnswers.length
            },
            grammar: {
              score: Math.round(grammarScore),
              completed: grammarAnswers.length,
              total: grammarAnswers.length
            }
          },
          completed_at: new Date().toISOString()
        }
      };
      
      console.log('💾 New multi-round results:', newResults);
      
      // Update database
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          interview_results: JSON.stringify(newResults)
        })
        .eq('id', id);
      
      if (updateError) {
        console.error('❌ Error updating:', updateError);
        return res.status(500).json({ success: false, message: 'Failed to update assessment' });
      }
      
      console.log('✅ Assessment re-processed successfully!');
      res.json({ 
        success: true, 
        message: 'Assessment re-processed with correct scoring',
        new_score: finalScore,
        assessment_type: correctAssessmentType
      });
    } else {
      res.json({ 
        success: true, 
        message: 'Assessment type is already correct',
        current_type: correctAssessmentType
      });
    }
    
  } catch (error) {
    console.error('❌ Re-process error:', error);
    res.status(500).json({ success: false, message: 'Re-processing failed' });
  }
});

module.exports = router;