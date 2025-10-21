const Application = require('../models/Application');
const Job = require('../models/Job');
const { supabase } = require('../config/db');
const assessmentService = require('../services/assessmentService');

// Create application
const createApplication = async (req, res) => {
  try {
    console.log(' Creating application:', {
      role: req.user.role,
      userId: req.user.id,
      body: req.body
    });
    
    // Candidates can only apply for themselves
    if (req.user.role === 'candidate') {
      req.body.candidate_id = req.user.id;
    }
    
    // Only candidates, admins, and HR can create applications
    if (!['candidate', 'admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if job is accepting applications (only for candidates)
    if (req.user.role === 'candidate') {
      const jobCheck = await Job.isAcceptingApplications(req.body.job_id);
      
      if (!jobCheck.accepting) {
        return res.status(400).json({
          success: false,
          message: jobCheck.reason
        });
      }
    }
    
    const application = await Application.create(req.body);
    console.log(' Application created:', application);
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application
      }
    });
  } catch (error) {
    console.error(' Create application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create application',
      error: error.message
    });
  }
};

// Get application by ID
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Candidates can only view their own applications
    if (req.user.role === 'candidate' && req.user.id !== application.candidate_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        application
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

// Get applications by candidate ID
const getApplicationsByCandidateId = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Candidates can only view their own applications
    if (req.user.role === 'candidate' && req.user.id !== candidateId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const applications = await Application.findByCandidateId(candidateId, limit, offset);
    
    res.status(200).json({
      success: true,
      data: {
        applications
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

// Get applications by job ID
const getApplicationsByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Only admins and HR can view applications for a job
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const applications = await Application.findByJobId(jobId, limit, offset);
    
    res.status(200).json({
      success: true,
      data: {
        applications
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

// Get all applications (for admin and HR)
const getAllApplications = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    // Only admins and HR can view all applications
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const applications = await Application.getAll(limit, offset);
    
    // Debug: Log applications with interview results
    console.log('🔍 ===== APPLICATIONS WITH INTERVIEW RESULTS =====');
    applications.forEach(app => {
      if (app.interview_results) {
        console.log(`📋 Application ID: ${app.id}`);
        console.log(`👤 Candidate: ${app.candidate_name}`);
        console.log(`📊 Interview Status: ${app.interview_status}`);
        console.log(`💾 Raw Results: ${app.interview_results}`);
        try {
          const parsed = JSON.parse(app.interview_results);
          console.log(`🔍 Parsed Results:`, parsed);
          console.log(`📈 Assessment Types:`, Object.keys(parsed));
        } catch (e) {
          console.log(`❌ Parse Error: ${e.message}`);
        }
        console.log('---');
      }
    });
    console.log('🔍 ===== END APPLICATIONS DEBUG =====');
    
    res.status(200).json({
      success: true,
      data: {
        applications
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

// Update application
const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Only admins and HR can update applications
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updatedApplication = await Application.update(id, req.body);
    
    // If status changed to 'hired', increment filled positions and send congratulations email
    if (req.body.status === 'hired' && application.status !== 'hired') {
      console.log(`🎯 Candidate hired! Updating filled positions for job ${application.job_id}`);
      
      const { supabase } = require('../config/database');
      const { sendEmail } = require('../services/emailService');
      const assessmentService = require('../services/assessmentService');
      const crypto = require('crypto');
      const Job = require('../models/Job');
      const User = require('../models/User');
      
      // Check if job can accept more hires
      try {
        const job = await Job.findById(application.job_id);
        if (job && job.filled_positions < job.vacancies) {
          const updatedJob = await Job.updateFilledPositions(application.job_id, 1);
          console.log(`✅ Job updated:`, {
            jobId: updatedJob.id,
            filledPositions: updatedJob.filled_positions,
            vacancies: updatedJob.vacancies,
            status: updatedJob.status
          });
        } else {
          console.log('⚠️ Job vacancies full - not incrementing filled positions');
        }
      } catch (error) {
        console.error('❌ Error updating filled positions:', error);
        // Don't fail the request if this fails
      }

      // Fetch candidate and job details for email
      const { data: candidate } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', application.candidate_id)
        .single();
        
      const { data: job } = await supabase
        .from('jobs')
        .select('id, title, department')
        .eq('id', application.job_id)
        .single();

      if (!candidate || !candidate.email) {
        console.error('❌ Candidate email not found, cannot send congratulations email');
      } else {
        // Generate onboarding token for account conversion
        const crypto = require('crypto');
        const onboardingToken = crypto.randomBytes(32).toString('hex');
        
        // Store the onboarding token in the application
        await supabase
          .from('applications')
          .update({ 
            onboarding_token: onboardingToken,
            onboarding_token_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          })
          .eq('id', id);

        console.log('🎉 Sending congratulations email to hired candidate...');
        console.log('📧 Candidate:', candidate.name, '|', candidate.email);
        console.log('💼 Position:', job?.title);
        
        // Send congratulations email with onboarding link
        try {
          const aiService = require('../services/aiService');
          const emailService = require('../utils/emailService');
          
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const onboardingLink = `${frontendUrl}/onboarding/${onboardingToken}`;
          
          console.log('🌐 Frontend URL:', frontendUrl);
          
          const context = {
            position: job?.title || 'the position',
            company: 'AI-HRMS',
            onboarding_link: onboardingLink,
            start_date: req.body.start_date || 'to be confirmed'
          };

          console.log('🔗 Onboarding link:', onboardingLink);

          const emailResponse = await aiService.generateEmail(
            'offer',
            candidate.name,
            context,
            'professional'
          );

          console.log('📝 Email generated:', {
            success: emailResponse.success,
            hasSubject: !!emailResponse.subject,
            hasBody: !!emailResponse.body
          });

          let emailSubject = emailResponse.subject;
          let emailBody = emailResponse.body;

          // Fallback to manual template if AI fails
          if (!emailBody) {
            console.log('⚠️ Using fallback email template');
            emailSubject = `Congratulations! You've Been Selected for ${context.position}`;
            emailBody = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">🎉 Congratulations, ${candidate.name}!</h2>
                
                <p>We are thrilled to inform you that you have been selected for the position of <strong>${context.position}</strong> at ${context.company}!</p>
                
                <p>Your skills, experience, and performance during the interview process truly impressed us, and we believe you will be a valuable addition to our team.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1f2937; margin-top: 0;">Next Steps: Complete Your Onboarding</h3>
                  <p>To finalize your hiring process and convert your candidate account to an employee account, please click the button below:</p>
                  
                  <a href="${context.onboarding_link}" 
                     style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
                    Complete Onboarding
                  </a>
                  
                  <p style="font-size: 14px; color: #6b7280;">This link will expire in 7 days.</p>
                </div>
                
                <p><strong>Expected Start Date:</strong> ${context.start_date}</p>
                
                <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
                
                <p>We look forward to having you on board!</p>
                
                <p style="margin-top: 30px;">
                  Best regards,<br>
                  <strong>HR Team</strong><br>
                  ${context.company}
                </p>
              </div>
            `;
          }

          await emailService.sendInterviewInvitation(
            candidate.email,
            candidate.name,
            emailSubject,
            emailBody
          );
          console.log('✅ Congratulations email sent successfully to', candidate.email);
        } catch (emailError) {
          console.error('❌ Error sending congratulations email:', emailError.message);
          console.error('Stack:', emailError.stack);
          // Don't fail the request if email fails
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      data: {
        application: updatedApplication
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

// Delete application
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Only admins can delete applications
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await Application.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Application deleted successfully'
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

// Get application statistics
const getApplicationStats = async (req, res) => {
  try {
    const { jobId, status } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    // Admins and HR see all stats, candidates see only their own
    let stats;
    
    if (['admin', 'hr'].includes(userRole)) {
      // Admin/HR: Get all application stats
      stats = await Application.getStats(jobId, status);
    } else if (userRole === 'candidate') {
      // Candidate: Get only their own stats
      const { data: applications } = await supabase
        .from('applications')
        .select('status')
        .eq('candidate_id', userId);
      
      const applicationStats = {
        pending: applications?.filter(a => a.status === 'pending').length || 0,
        reviewed: applications?.filter(a => a.status === 'reviewed').length || 0,
        shortlisted: applications?.filter(a => a.status === 'shortlisted').length || 0,
        rejected: applications?.filter(a => a.status === 'rejected').length || 0,
        hired: applications?.filter(a => a.status === 'hired').length || 0
      };
      
      stats = {
        totalApplications: applications?.length || 0,
        applicationStats
      };
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
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

// Save ATS screening results
const saveATSScreening = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const {
      ats_score,
      ats_recommendation,
      ats_analysis,
      ats_strengths,
      ats_weaknesses,
      ats_matched_skills,
      ats_missing_skills,
      ats_data
    } = req.body;

    console.log('💾 Saving ATS screening for application:', applicationId);

    // Update application with ATS results
    const { data, error } = await supabase
      .from('applications')
      .update({
        ats_score,
        ats_recommendation,
        ats_analysis,
        ats_strengths,
        ats_weaknesses,
        ats_matched_skills,
        ats_missing_skills,
        ats_data,
        ats_screened_at: new Date().toISOString(),
        ats_screened_by: req.user.id
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ ATS screening saved successfully');

    res.status(200).json({
      success: true,
      message: 'ATS screening results saved',
      data: { application: data }
    });
  } catch (error) {
    console.error('❌ Save ATS screening error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save ATS screening',
      error: error.message
    });
  }
};

/**
 * Schedule interview with AI-generated email invitation
 */
const scheduleInterviewWithEmail = async (req, res) => {
  console.log('📧 scheduleInterviewWithEmail called:', {
    applicationId: req.params.id,
    user: req.user?.email,
    body: req.body
  });
  
  try {
    const { id } = req.params;
    const { interview_date, interview_time, interview_location, interview_notes, interview_type, job_title, custom_questions, interview_grace_period_minutes } = req.body;

    console.log('🔍 Looking up application:', id);
    console.log('📝 Custom questions received:', custom_questions?.length || 0);

    // Get application details (without joins to avoid FK issues)
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();

    console.log('📋 Application lookup result:', {
      found: !!application,
      error: appError?.message
    });

    if (appError || !application) {
      console.error('❌ Application not found:', appError);
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        error: appError?.message
      });
    }

    // Fetch candidate separately (candidates are in users table)
    const { data: candidate } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', application.candidate_id)
      .single();

    console.log('👤 Candidate found:', candidate?.name, candidate?.email);

    // Fetch job separately
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, department')
      .eq('id', application.job_id)
      .single();

    console.log('💼 Job found:', job?.title);

    // Attach to application object
    application.candidate = candidate;
    application.job = job;

    // Generate unique interview token
    const crypto = require('crypto');
    const interviewToken = crypto.randomBytes(32).toString('hex');
    
    console.log('🔐 Generated interview token:', interviewToken.substring(0, 10) + '...');
    
    // Update application with interview details
    console.log('💾 Updating application with interview details...');
    
    // Include interview type in notes since column doesn't exist
    const notesWithType = interview_type 
      ? `[${interview_type.toUpperCase()} Interview]\n${interview_notes || ''}`.trim()
      : interview_notes;
    
    console.log('🔄 Scheduling new interview round - resetting interview status to pending');
    
    const { data: updatedApp, error: updateError } = await supabase
      .from('applications')
      .update({
        interview_date,
        interview_time,
        interview_location,
        interview_notes: notesWithType,
        interview_token: interviewToken,
        interview_grace_period_minutes: interview_grace_period_minutes || 10,
        interview_status: 'pending', // Reset status to allow new interview round
        interview_completed_at: null, // Clear previous completion timestamp
        // Note: Status should only be changed to 'shortlisted' after HR manually reviews assessment results
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update application',
        error: updateError.message
      });
    }

    console.log('✅ Application updated successfully');
    
    // Save custom questions using new AssessmentService (supports multi-round)
    if (custom_questions && custom_questions.length > 0) {
      console.log('💾 Saving custom questions to database...');
      console.log(`📝 Application ID: ${id}`);
      console.log(`📝 Interview Type: ${interview_type}`);
      console.log(`📝 Questions to save:`, JSON.stringify(custom_questions, null, 2));
      
      try {
        // Use new AssessmentService for proper multi-round support
        const result = await assessmentService.saveQuestions(id, interview_type, custom_questions);
        console.log(`✅ AssessmentService: Saved ${result.count} ${interview_type} questions`);
      } catch (error) {
        console.error(`❌ AssessmentService error saving ${interview_type} questions:`, error);
        // Fallback to old method if new service fails
        console.log('🔄 Falling back to old interview_questions table...');
        
        // Delete existing questions for this application
        const { error: deleteError } = await supabase
          .from('interview_questions')
          .delete()
          .eq('application_id', id);
        
        if (deleteError) {
          console.log('⚠️ Delete error (may be OK if no existing):', deleteError);
        }
        
        // Insert new questions - using only basic fields that exist in schema
        const questionsToInsert = custom_questions.map((q, index) => ({
          application_id: id,
          question_text: q.question_text || q.question || q.text || q.content,
          question_type: q.question_type || q.type || 'technical',
          difficulty: q.difficulty || 'medium',
          duration: q.duration || q.time_limit || 180,
          time_limit: q.time_limit || q.duration || 60,
          topic: q.topic || null,
          options: q.options ? JSON.stringify(q.options) : null,
          correct_answer: q.correct_answer || null,
          explanation: q.explanation || null,
          question_order: index
        }));
        
        const { data: insertedQuestions, error: questionsError } = await supabase
          .from('interview_questions')
          .insert(questionsToInsert)
          .select();
        
        if (questionsError) {
          console.error('❌ Error saving questions (fallback):', questionsError);
        } else {
          console.log(`✅ Fallback: Saved ${custom_questions.length} questions to interview_questions`);
        }
      }
    }
    
    const emailService = require('../utils/emailService');

    try {
      // Prepare context for AI email generation
      const interviewDateTime = interview_date && interview_time 
        ? `${interview_date} at ${interview_time}` 
        : interview_date || 'To be confirmed';

      // Generate interview link for all assessment types
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const needsLink = ['ai', 'aptitude', 'coding', 'communication', 'faceToFace'].includes(interview_type);
      const interviewLink = needsLink ? `${frontendUrl}/interview/${interviewToken}` : null;

      // Map interview types to display names
      const interviewTypeNames = {
        'ai': 'AI Interview (Technical)',
        'aptitude': 'Aptitude Assessment',
        'coding': 'Coding Challenge',
        'communication': 'Communication Assessment',
        'faceToFace': 'AI Interview',
        'hr': 'HR Interview'
      };

      const context = {
        position: job_title || application.job?.title || 'the position',
        company: 'AI-HRMS',
        interview_date: interviewDateTime,
        interview_location: interview_location || (interview_type === 'hr' ? 'Office' : 'Virtual'),
        interview_type: interviewTypeNames[interview_type] || 'Interview',
        additional_notes: interview_notes || '',
        interview_link: interviewLink
      };

      console.log('🔗 Interview link generated:', interviewLink);

      console.log('🤖 Generating AI interview invitation email...', {
        candidateName: application.candidate.name,
        candidateEmail: application.candidate.email,
        context
      });
      
      let aiEmailResponse;
      try {
        aiEmailResponse = await aiService.generateEmail(
          'interview_invite',
          application.candidate.name,
          context,
          'professional'
        );

        console.log('📧 AI email generated:', {
          success: aiEmailResponse.success,
          subject: aiEmailResponse.subject || aiEmailResponse.data?.subject,
          bodyLength: (aiEmailResponse.body || aiEmailResponse.data?.body)?.length,
          fullResponse: aiEmailResponse
        });
        
        // Handle nested data structure from AI service
        if (aiEmailResponse.data && !aiEmailResponse.subject) {
          console.log('📦 Unwrapping nested data structure');
          aiEmailResponse.subject = aiEmailResponse.data.subject;
          aiEmailResponse.body = aiEmailResponse.data.body;
        }
        
        // Convert plain text to HTML if needed
        if (aiEmailResponse.body && !aiEmailResponse.body.includes('<')) {
          console.log('🔄 Converting plain text to HTML');
          aiEmailResponse.body = aiEmailResponse.body
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => `<p>${line}</p>`)
            .join('\n');
        }
      } catch (aiError) {
        console.error('⚠️ AI service error:', aiError.message);
        console.log('📝 Using fallback email template');
        
        // Fallback template email
        aiEmailResponse = {
          success: true,
          subject: `Interview Invitation - ${context.position}`,
          body: `
            <p>Dear ${application.candidate.name},</p>
            
            <p>We are pleased to invite you for an interview for the position of <strong>${context.position}</strong> at ${context.company}.</p>
            
            <div class="highlight-box">
              <p><strong>Interview Details:</strong></p>
              <p>📅 <strong>Date & Time:</strong> ${context.interview_date}</p>
              <p>📍 <strong>Location:</strong> ${context.interview_location}</p>
              <p>🎯 <strong>Interview Type:</strong> ${context.interview_type}</p>
              ${context.interview_link ? `<p>🔗 <strong>Interview Link:</strong> <a href="${context.interview_link}">${context.interview_link}</a></p>` : ''}
            </div>
            
            ${context.additional_notes ? `<p><strong>Additional Information:</strong><br>${context.additional_notes}</p>` : ''}
            
            <p>Please confirm your availability at your earliest convenience.</p>
            
            <p>We look forward to meeting you!</p>
            
            <p>Best regards,<br><strong>HR Team</strong><br>${context.company}</p>
          `
        };
      }

      if (aiEmailResponse.success && aiEmailResponse.subject && aiEmailResponse.body) {
        // Send the AI-generated email
        console.log('📮 Sending email to:', application.candidate.email);
        const emailResult = await emailService.sendInterviewInvitation(
          application.candidate.email,
          application.candidate.name,
          aiEmailResponse.subject,
          aiEmailResponse.body
        );

        console.log('✅ Email send result:', emailResult);

        return res.status(200).json({
          success: true,
          message: 'Interview scheduled and invitation sent successfully',
          data: {
            application: updatedApp,
            emailSent: emailResult.success,
            emailSubject: aiEmailResponse.subject,
            emailPreview: aiEmailResponse.body ? aiEmailResponse.body.substring(0, 200) + '...' : 'No preview'
          }
        });
      } else {
        console.warn('⚠️ AI email generation incomplete:', {
          hasSubject: !!aiEmailResponse.subject,
          hasBody: !!aiEmailResponse.body,
          response: aiEmailResponse
        });
        // Interview scheduled but email failed
        return res.status(200).json({
          success: true,
          message: 'Interview scheduled but email generation failed',
          data: {
            application: updatedApp,
            emailSent: false,
            error: 'AI email generation failed'
          }
        });
      }
    } catch (emailError) {
      console.error('Email generation/sending error:', emailError);
      // Interview scheduled but email failed
      return res.status(200).json({
        success: true,
        message: 'Interview scheduled but email sending failed',
        data: {
          application: updatedApp,
          emailSent: false,
          error: emailError.message
        }
      });
    }
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Convert candidate account to employee account
const convertToEmployee = async (req, res) => {
  try {
    const { token } = req.params;
    const { start_date, department } = req.body;

    console.log('🔄 Converting candidate to employee with token:', token);

    const { supabase } = require('../config/db');
    
    // Auto-generate employee ID
    const generateEmployeeId = async () => {
      // Get count of existing employees
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee');
      
      // Generate ID like EMP001, EMP002, etc.
      const nextNumber = (count || 0) + 1;
      return `EMP${String(nextNumber).padStart(3, '0')}`;
    };
    
    const employee_id = await generateEmployeeId();
    console.log('🆔 Generated Employee ID:', employee_id);
    
    // Find application with this onboarding token
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        candidate:candidate_id (*),
        job:job_id (*)
      `)
      .eq('onboarding_token', token)
      .eq('status', 'hired')
      .single();

    if (appError || !application) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired onboarding link'
      });
    }

    // Check if token has expired (7 days)
    if (application.onboarding_token_expires && new Date(application.onboarding_token_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Onboarding link has expired. Please contact HR.'
      });
    }

    console.log('✅ Valid onboarding token found for:', application.candidate.name);

    // Update user role from 'candidate' to 'employee'
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        role: 'employee',
        employee_id: employee_id,
        department: department || application.job?.department,
        start_date: start_date
      })
      .eq('id', application.candidate_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to convert account'
      });
    }

    // Clear the onboarding token
    await supabase
      .from('applications')
      .update({ 
        onboarding_token: null,
        onboarding_token_expires: null,
        onboarding_completed: true,
        onboarding_completed_at: new Date()
      })
      .eq('id', application.id);

    console.log('🎉 Successfully converted candidate to employee');

    res.status(200).json({
      success: true,
      message: 'Account successfully converted to employee',
      data: {
        user: updatedUser,
        employee_id: employee_id,
        position: application.job?.title,
        department: department || application.job?.department
      }
    });

  } catch (error) {
    console.error('❌ Error converting to employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Verify onboarding token
const verifyOnboardingToken = async (req, res) => {
  try {
    const { token } = req.params;

    const { supabase } = require('../config/db');
    
    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        *,
        candidate:candidate_id (*),
        job:job_id (*)
      `)
      .eq('onboarding_token', token)
      .eq('status', 'hired')
      .single();

    if (error || !application) {
      return res.status(404).json({
        success: false,
        message: 'Invalid onboarding link'
      });
    }

    // Check if token has expired
    if (application.onboarding_token_expires && new Date(application.onboarding_token_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Onboarding link has expired'
      });
    }

    // Check if already completed
    if (application.onboarding_completed) {
      return res.status(400).json({
        success: false,
        message: 'Onboarding already completed'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        candidateName: application.candidate.name,
        candidateEmail: application.candidate.email,
        position: application.job?.title,
        department: application.job?.department
      }
    });

  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
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
};