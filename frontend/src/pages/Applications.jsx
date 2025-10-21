import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Briefcase, Plus, Edit, Trash2, Calendar, MapPin, Sparkles, Loader2, Mail, FileText, Eye, Download, Bot, Trophy, Medal, Award, X, Clock, Search, CheckCircle, Volume2, Code } from 'lucide-react';
import { applicationService } from '../services/applicationService';
import { jobService } from '../services/jobService';
import { formatDate, getStatusColor } from '../utils/helpers';
import { APPLICATION_STATUS } from '../utils/constants';
import api from '../services/api';
import axios from 'axios';
import ATSScoreCard from '../components/ATSScoreCard';
import CustomQuestionsModal from '../components/ManualQuestionEntryNew';
import InterviewRoundScheduler from '../components/InterviewRoundScheduler';
import RoundQuestionGenerator from '../components/RoundQuestionGenerator';

const Applications = () => {
  const { user } = useAuth();
  const { isAdmin, isHR, isManager, isCandidate } = useRole();
  const { refreshNotifications } = useNotifications();
  const [applicationsData, setApplicationsData] = useState([]);
  const [jobsData, setJobsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [formData, setFormData] = useState({
    job_id: '',
    resume_url: ''
  });
  const [stats, setStats] = useState({
    totalApplications: 0,
    applicationStats: {
      pending: 0,
      reviewed: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0
    }
  });
  const [aiScreening, setAiScreening] = useState({});
  const [screeningLoading, setScreeningLoading] = useState({});
  const [rankingAll, setRankingAll] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailType, setEmailType] = useState('interview_invite');
  const [emailGenerating, setEmailGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [showATSModal, setShowATSModal] = useState(false);
  const [selectedATSData, setSelectedATSData] = useState(null);
  const [topXCount, setTopXCount] = useState(3);
  const [customMessage, setCustomMessage] = useState('');
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailResults, setEmailResults] = useState(null);
  const [showRoundScheduler, setShowRoundScheduler] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [interviewData, setInterviewData] = useState({
    interview_date: '',
    interview_time: '',
    interview_location: '',
    interview_notes: '',
    interview_grace_period_minutes: 10
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [selectedForInterview, setSelectedForInterview] = useState([]);
  const [showBulkInterviewModal, setShowBulkInterviewModal] = useState(false);
  const [showCustomQuestionsModal, setShowCustomQuestionsModal] = useState(false);
  const [showRoundGenerator, setShowRoundGenerator] = useState(false);
  const [customQuestions, setCustomQuestions] = useState([]);
  const [questionsByApplication, setQuestionsByApplication] = useState({}); // Store questions per application ID
  const [currentApplicationId, setCurrentApplicationId] = useState(null);
  const [currentRoundType, setCurrentRoundType] = useState('aptitude');
  const [expandedRow, setExpandedRow] = useState(null); // Track which row is expanded
  const [recruitmentTab, setRecruitmentTab] = useState('active'); // 'active' or 'completed'

  useEffect(() => {
    fetchApplications();
    fetchJobs();
    fetchStats();
    
    // Check if AI assistant triggered auto-screening
    const urlParams = new URLSearchParams(window.location.search);
    const autoScreen = urlParams.get('autoScreen');
    if (autoScreen === 'true' && (isAdmin || isHR)) {
      // Trigger screening after page loads
      setTimeout(() => {
        handleRankAllCandidates();
      }, 1000);
    }
    
    // Check if AI assistant triggered email modal
    const emailTop = urlParams.get('emailTop');
    if (emailTop && (isAdmin || isHR)) {
      const count = parseInt(emailTop);
      setTopXCount(count);
      // Trigger email modal after screening completes
      setTimeout(() => {
        handleEmailTopCandidates();
      }, 2000);
    }
  }, []);

  // Handle quick apply after jobs data is loaded
  useEffect(() => {
    if (jobsData.length > 0 && isCandidate) {
      const urlParams = new URLSearchParams(window.location.search);
      const jobId = urlParams.get('apply');
      if (jobId) {
        console.log('🚀 Quick apply triggered for job:', jobId);
        handleQuickApply(jobId);
        // Clean up URL after opening modal
        window.history.replaceState({}, '', '/applications');
      }
    }
  }, [jobsData, isCandidate]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      let response;
      
      if (isCandidate) {
        response = await applicationService.getApplicationsByCandidateId(user.id, { limit: 100 });
      } else if (isAdmin || isHR || isManager) {
        response = await applicationService.getAllApplications({ limit: 100 });
      }
      
      const applications = response.data?.applications || [];
      
      // Fetch all interview results once
      let interviewResultsMap = {};
      try {
        const resultResponse = await api.get(`/interview-results`);
        if (resultResponse.data.success && resultResponse.data.data) {
          // Create a map of application_id to interview result
          resultResponse.data.data.forEach(result => {
            interviewResultsMap[result.application_id] = result;
          });
        }
      } catch (error) {
        console.log('Could not fetch interview results:', error.message);
      }
      
      // Add interview scores to applications with completed interviews
      const applicationsWithScores = applications.map(app => {
        // First check for assessment results in interview_results JSON
        if (app.interview_status === 'completed') {
          
          if (app.interview_results) {
            try {
              const results = JSON.parse(app.interview_results);
              
              // Check for new multi-round structure
              if (typeof results === 'object' && !results.score) {
                // New structure: {aptitude: {score: 75}, communication: {score: 85}}
                // Only consider keys that have assessment-like objects (with score property)
                const assessmentTypes = Object.keys(results).filter(key => 
                  typeof results[key] === 'object' && 
                  results[key] !== null && 
                  'score' in results[key]
                );
                
                if (assessmentTypes.length > 0) {
                  // Calculate overall score from all assessment types
                  const scores = assessmentTypes.map(type => results[type].score || 0);
                  const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
                  
                  return {
                    ...app,
                    interview_score: overallScore,
                    interview_performance: overallScore >= 80 ? 'Excellent' : 
                                         overallScore >= 60 ? 'Good' : 
                                         overallScore >= 40 ? 'Average' : 'Poor',
                    assessment_results: results,
                    multi_round_results: results, // Store the full multi-round data
                    assessment_types: assessmentTypes,
                    total_questions: assessmentTypes.reduce((sum, type) => sum + (results[type].total_questions || 0), 0),
                    correct_answers: assessmentTypes.reduce((sum, type) => sum + (results[type].correct_answers || 0), 0)
                  };
                }
              } else if (results.score !== undefined) {
                // Check if this is actually a communication assessment stored incorrectly
                const answerKeys = Object.keys(results.answers || {});
                const hasReadingAnswers = answerKeys.some(key => key.startsWith('Reading_'));
                const hasListeningAnswers = answerKeys.some(key => key.startsWith('Listening_'));
                const hasGrammarAnswers = answerKeys.some(key => key.startsWith('Grammar_'));
                
                if (hasReadingAnswers || hasListeningAnswers || hasGrammarAnswers) {
                  // This is a communication assessment stored as legacy format - fix it
                  const readingAnswers = answerKeys.filter(key => key.startsWith('Reading_'));
                  const listeningAnswers = answerKeys.filter(key => key.startsWith('Listening_'));
                  const grammarAnswers = answerKeys.filter(key => key.startsWith('Grammar_'));
                  
                  const readingCompleted = readingAnswers.filter(key => 
                    results.answers[key]?.type === 'audio'
                  ).length;
                  const listeningCompleted = listeningAnswers.filter(key => 
                    results.answers[key]?.type === 'audio'
                  ).length;
                  
                  const readingScore = readingAnswers.length > 0 ? (readingCompleted / readingAnswers.length) * 100 : 0;
                  const listeningScore = listeningAnswers.length > 0 ? (listeningCompleted / listeningAnswers.length) * 100 : 0;
                  const grammarScore = grammarAnswers.length > 0 ? 100 : 0; // Assume completed if answered
                  
                  let overallScore = 0;
                  let sectionsCount = 0;
                  if (readingAnswers.length > 0) { overallScore += readingScore; sectionsCount++; }
                  if (listeningAnswers.length > 0) { overallScore += listeningScore; sectionsCount++; }
                  if (grammarAnswers.length > 0) { overallScore += grammarScore; sectionsCount++; }
                  
                  const finalScore = sectionsCount > 0 ? Math.round(overallScore / sectionsCount) : 0;
                  
                  // Create corrected multi-round structure
                  const correctedResults = {
                    communication: {
                      score: finalScore,
                      total_questions: answerKeys.length,
                      answers: results.answers,
                      sections_scores: {
                        reading: { score: Math.round(readingScore), completed: readingCompleted, total: readingAnswers.length },
                        listening: { score: Math.round(listeningScore), completed: listeningCompleted, total: listeningAnswers.length },
                        grammar: { score: Math.round(grammarScore), completed: grammarAnswers.length, total: grammarAnswers.length }
                      },
                      time_taken: results.time_taken,
                      completed_at: new Date().toISOString()
                    }
                  };
                  
                  return {
                    ...app,
                    interview_score: finalScore,
                    interview_performance: finalScore >= 80 ? 'Excellent' : 
                                         finalScore >= 60 ? 'Good' : 
                                         finalScore >= 40 ? 'Average' : 'Poor',
                    assessment_results: results,
                    multi_round_results: correctedResults,
                    assessment_types: ['communication'],
                    total_questions: answerKeys.length,
                    correct_answers: readingCompleted + listeningCompleted + grammarAnswers.length
                  };
                }
                // Legacy single assessment structure
                return {
                  ...app,
                  interview_score: results.score,
                  interview_performance: results.score >= 80 ? 'Excellent' : 
                                       results.score >= 60 ? 'Good' : 
                                       results.score >= 40 ? 'Average' : 'Poor',
                  assessment_results: results,
                  total_questions: results.total_questions,
                  correct_answers: results.correct_answers,
                  time_taken: results.time_taken
                };
              }
            } catch (e) {
              console.error('Error parsing interview_results:', e);
            }
          }
          
          // Check if we have assessment_score column (new database structure)
          if (app.assessment_score !== undefined && app.assessment_score !== null) {
            return {
              ...app,
              interview_score: app.assessment_score,
              interview_performance: app.assessment_score >= 80 ? 'Excellent' : 
                                   app.assessment_score >= 60 ? 'Good' : 
                                   app.assessment_score >= 40 ? 'Average' : 'Poor',
              assessment_results: {
                score: app.assessment_score,
                total_questions: app.assessment_total_questions,
                correct_answers: app.assessment_correct_answers,
                time_taken: app.assessment_time_taken,
                assessment_type: app.assessment_type
              },
              total_questions: app.assessment_total_questions,
              correct_answers: app.assessment_correct_answers,
              time_taken: app.assessment_time_taken
            };
          }
        }
        
        // Then check for traditional interview results
        if (app.interview_status === 'completed' && interviewResultsMap[app.id]) {
          const result = interviewResultsMap[app.id];
          return {
            ...app,
            interview_score: result.overall_score,
            interview_performance: result.performance_level,
            interview_results: result
          };
        }
        
        return app;
      });
      
      setApplicationsData(applicationsWithScores);
      
      // Load saved ATS scores from database
      const savedScores = {};
      applicationsWithScores.forEach(app => {
        if (app.ats_score && app.ats_score > 0) {
          // Try to load full ATS data from JSON first (new format)
          if (app.ats_data) {
            try {
              savedScores[app.id] = JSON.parse(app.ats_data);
            } catch (e) {
              console.error('Failed to parse ats_data:', e);
              // Fall back to legacy format below
            }
          }
          
          // If no JSON data, use legacy format
          if (!savedScores[app.id]) {
            savedScores[app.id] = {
              match_score: app.ats_score,
              recommendation: app.ats_recommendation,
              analysis: app.ats_analysis,
              strengths: app.ats_strengths,
              gaps: app.ats_weaknesses,
              skill_analysis: {
                matched_skills: app.ats_matched_skills || [],
                missing_skills: app.ats_missing_skills || [],
                total_skills_found: (app.ats_matched_skills?.length || 0) + (app.ats_missing_skills?.length || 0),
                skill_match_percentage: 0 // Will be calculated
              },
              keyword_match: { score: 0 },
              experience_analysis: { score: 0 },
              education_verification: { score: 0 },
              ai_insights: { score: 0 }
            };
          }
        }
      });
      
      if (Object.keys(savedScores).length > 0) {
        setAiScreening(savedScores);
        console.log(`✅ Loaded ${Object.keys(savedScores).length} saved ATS scores from database`);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplicationsData([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await jobService.getAllJobs({ limit: 100 });
      setJobsData(response.data?.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobsData([]); // Set empty array on error
    }
  };

  const fetchStats = async () => {
    try {
      const response = await applicationService.getApplicationStats();
      setStats(response.data?.stats || {
        totalApplications: 0,
        applicationStats: {
          pending: 0,
          reviewed: 0,
          shortlisted: 0,
          rejected: 0,
          hired: 0
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep default stats on error
    }
  };

  const handleQuickApply = async (jobId) => {
    const job = jobsData.find(j => j.id === jobId);
    if (job) {
      setSelectedJob(job);
      setFormData({ ...formData, job_id: jobId });
      setShowApplicationForm(true);
    }
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    try {
      const applicationData = {
        ...formData,
        candidate_id: user.id
      };
      
      console.log(' Submitting application:', applicationData);
      
      const response = await applicationService.createApplication(applicationData);
      console.log(' Application submitted:', response);
      
      setShowApplicationForm(false);
      setSelectedJob(null);
      fetchApplications();
      fetchStats();
      
      // Reset form
      setFormData({
        job_id: '',
        resume_url: ''
      });
      
      alert('Application submitted successfully!');
    } catch (error) {
      console.error(' Error submitting application:', error);
      console.error('Error response:', error.response?.data);
      alert(`Failed to submit application: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleUpdateStatus = async (applicationId, newStatus) => {
    try {
      await applicationService.updateApplication(applicationId, { status: newStatus });
      fetchApplications();
      fetchStats();
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const handleScheduleInterview = async () => {
    if (!selectedApplication) return;
    
    if (!interviewData.interview_date) {
      alert('Please select an interview date');
      return;
    }

    try {
      setLoading(true);
      
      // Get questions for THIS application
      const appQuestions = questionsByApplication[selectedApplication.id] || customQuestions || [];
      
      // Debug logging
      console.log('🔍 Scheduling interview with:', {
        applicationId: selectedApplication.id,
        interviewType: interviewData.interview_type,
        customQuestionsCount: appQuestions.length,
        customQuestions: appQuestions,
        allStoredQuestions: questionsByApplication
      });
      
      // Add round type tag to notes
      const roundTypeTag = interviewData.interview_type === 'aptitude' ? '[APTITUDE Interview]\n' :
                          interviewData.interview_type === 'coding' ? '[CODING Interview]\n' :
                          interviewData.interview_type === 'communication' ? '[COMMUNICATION Interview]\n' :
                          interviewData.interview_type === 'faceToFace' ? '[AI Interview]\n' :
                          interviewData.interview_type === 'hr' ? '[HR Interview]\n' : '';
      
      const notesWithTag = roundTypeTag + (interviewData.interview_notes || '');
      
      // Use new combined API endpoint that schedules interview AND sends AI email
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/applications/${selectedApplication.id}/schedule-interview`,
        {
          ...interviewData,
          interview_notes: notesWithTag,
          job_title: selectedApplication.job_title || selectedApplication.job?.title,
          candidate_name: selectedApplication.candidate_name,
          candidate_email: selectedApplication.candidate_email,
          custom_questions: appQuestions.length > 0 ? appQuestions : undefined
        },
        {
          timeout: 30000 // 30 second timeout for email generation
        }
      );

      if (response.data.success) {
        const emailStatus = response.data.data.emailSent ? 
          '✅ Interview invitation email sent successfully!' : 
          '⚠️ Interview scheduled but email sending failed.';
        
        alert(`Interview scheduled successfully!\n${emailStatus}`);
        
        console.log('📧 Email Preview:', response.data.data.emailPreview);
        console.log('📬 Subject:', response.data.data.emailSubject);
        
        setShowInterviewModal(false);
        setSelectedApplication(null);
        setInterviewData({
          interview_date: '',
          interview_time: '',
          interview_location: '',
          interview_notes: '',
          interview_grace_period_minutes: 10
        });
        setCustomQuestions([]);
        fetchApplications();
      }
      
      refreshNotifications();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Failed to schedule interview: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleRound = async (roundData) => {
    if (!selectedApplication) return;

    try {
      setLoading(true);
      
      console.log('📅 Scheduling round with data:', {
        roundType: roundData.round_type,
        questionsCount: roundData.custom_questions?.length || 0
      });
      
      // Use existing schedule-interview endpoint
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/applications/${selectedApplication.id}/schedule-interview`,
        {
          interview_date: roundData.interview_date,
          interview_time: roundData.interview_time,
          interview_location: roundData.interview_location || 'Virtual Assessment',
          interview_notes: roundData.interview_notes || '',
          interview_type: roundData.round_type,
          interview_grace_period_minutes: roundData.interview_grace_period_minutes || 10,
          job_title: selectedApplication.job_title || selectedApplication.job?.title,
          candidate_name: selectedApplication.candidate_name,
          candidate_email: selectedApplication.candidate_email,
          custom_questions: roundData.custom_questions
        },
        {
          timeout: 30000
        }
      );

      if (response.data.success) {
        const roundName = roundData.round_type.charAt(0).toUpperCase() + roundData.round_type.slice(1);
        const questionCount = roundData.custom_questions?.length || 0;
        alert(
          `✅ ${roundName} round scheduled successfully!\n` +
          `📧 Assessment invitation sent to candidate.\n` +
          (questionCount > 0 ? `📝 ${questionCount} questions configured.` : '')
        );
        
        setShowRoundScheduler(false);
        setSelectedApplication(null);
        fetchApplications();
      }
      
      refreshNotifications();
    } catch (error) {
      console.error('Error scheduling round:', error);
      alert('Failed to schedule round: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkScheduleInterview = async () => {
    // Filter out hired and rejected candidates
    const validSelections = selectedForInterview.filter(appId => {
      const app = applicationsData.find(a => a.id === appId);
      return app && app.status !== 'hired' && app.status !== 'rejected';
    });

    if (validSelections.length === 0) {
      alert('Please select at least one active candidate. Hired and rejected candidates cannot be scheduled for interviews.');
      return;
    }

    // Update selection to only valid candidates
    setSelectedForInterview(validSelections);

    if (!interviewData.interview_date) {
      alert('Please select an interview date');
      return;
    }

    try {
      setLoading(true);
      
      console.log('📅 Bulk scheduling with:', {
        candidatesCount: validSelections.length,
        interviewType: interviewData.interview_type,
        questionsCount: customQuestions.length,
        hasQuestions: customQuestions.length > 0
      });
      
      // Get application details for selected candidates (excluding hired/rejected)
      const selectedApps = applicationsData.filter(app => 
        validSelections.includes(app.id) && 
        app.status !== 'hired' && 
        app.status !== 'rejected'
      );

      // Schedule interview AND send AI email for all selected candidates
      const promises = selectedApps.map(app =>
        axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/applications/${app.id}/schedule-interview`,
          {
            ...interviewData,
            job_title: app.job_title || app.job?.title,
            interview_type: interviewData.interview_type || 'hr',
            custom_questions: customQuestions.length > 0 ? customQuestions : undefined
          },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        )
      );
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const emailsSent = results.filter(r => 
        r.status === 'fulfilled' && r.value?.data?.data?.emailSent
      ).length;
      
      alert(
        `✅ Interview scheduled for ${successful} candidate(s)\n` +
        `📧 AI invitation emails sent to ${emailsSent} candidate(s)\n` +
        (customQuestions.length > 0 ? `📝 ${customQuestions.length} custom questions added\n` : '') +
        (failed > 0 ? `⚠️ Failed: ${failed}` : '')
      );
      
      setShowBulkInterviewModal(false);
      setSelectedForInterview([]);
      setCustomQuestions([]);
      setInterviewData({
        interview_date: '',
        interview_time: '',
        interview_location: '',
        interview_notes: '',
        interview_type: 'ai'
      });
      fetchApplications();
      refreshNotifications();
    } catch (error) {
      console.error('Error scheduling bulk interviews:', error);
      alert('Failed to schedule interviews: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewApplication = (application) => {
    // In a real application, this would open a detailed view modal
    alert(`Application Details:\n\nPosition: ${application.job_id}\nStatus: ${application.status}\nApplied: ${formatDate(application.created_at)}\n\nResume: ${application.resume_url || 'Not provided'}`);
  };

  // Helper function to determine the appropriate status display
  const getDisplayStatus = (application) => {
    // Only show 'Under Review' if assessment is completed AND there's no next interview scheduled
    // If there's a new interview scheduled (interview_token exists), then HR has reviewed and moved forward
    if (application.interview_status === 'completed' && 
        application.interview_results && 
        application.status === 'shortlisted' &&
        !application.interview_token) {
      return 'Under Review';
    }
    
    // For all other cases, show the actual status
    return application.status;
  };

  // Helper function to get appropriate status color
  const getDisplayStatusColor = (application) => {
    const displayStatus = getDisplayStatus(application);
    
    if (displayStatus === 'Under Review') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    
    return getStatusColor(application.status);
  };

  const handleAIScreening = async (application) => {
    try {
      setScreeningLoading(prev => ({ ...prev, [application.id]: true }));
      
      console.log('🤖 Starting AI screening for application:', application.id);
      
      // Check if resume is provided and valid
      const hasValidResume = application.resume_url && 
                            application.resume_url.trim() !== '' && 
                            (application.resume_url.startsWith('http://') || 
                             application.resume_url.startsWith('https://') ||
                             application.resume_url.startsWith('file://') ||
                             application.resume_url.includes('.pdf') ||
                             application.resume_url.includes('.docx') ||
                             application.resume_url.includes('.doc'));
      
      if (!hasValidResume) {
        console.log('⚠️ No valid resume provided for this application');
        console.log('Resume URL:', application.resume_url);
        
        // Set a low score for applications without valid resume
        setAiScreening(prev => ({
          ...prev,
          [application.id]: {
            match_score: 0,
            recommendation: 'No Resume Provided',
            analysis: 'Cannot evaluate candidate without valid resume URL',
            strengths: 'N/A',
            gaps: application.resume_url ? 'Invalid resume URL format' : 'Resume not submitted',
            candidate_id: application.candidate_id,
            job_title: 'N/A'
          }
        }));
        
        setScreeningLoading(prev => ({ ...prev, [application.id]: false }));
        return;
      }
      
      console.log('✅ Valid resume URL found:', application.resume_url);
      
      // Get job details for this application
      const job = jobsData.find(j => j.id === application.job_id);
      
      if (!job) {
        alert('Job details not found for this application');
        return;
      }
      
      // Use actual job description
      const jobDescription = `
        Position: ${job.title || 'Not specified'}
        Department: ${job.department || 'Not specified'}
        Required Skills: ${job.required_skills?.join(', ') || 'Not specified'}
        Experience Level: ${job.experience_level || 'Not specified'}
        Description: ${job.description || 'Not specified'}
      `;
      
      console.log('📄 Screening candidate:', application.candidate_id?.slice(0, 8));
      console.log('📋 For job:', job.title);
      console.log('📎 Resume URL:', application.resume_url);
      
      // Use comprehensive ATS screening endpoint - call AI service directly
      const AI_SERVICE_URL = 'http://localhost:5001/api/ai';
      const response = await axios.post(`${AI_SERVICE_URL}/resume/screen-comprehensive`, {
        resume_url: application.resume_url,
        job_description: jobDescription,
        job_title: job.title
      });
      
      console.log('✅ Comprehensive ATS Screening result:', response.data);
      
      // Check if screening was successful
      if (!response.data.success || !response.data.data) {
        throw new Error('AI screening returned invalid response');
      }
      
      const atsResult = response.data.data;
      
      // Prepare screening data
      const screeningData = {
        match_score: atsResult.ats_score,
        recommendation: atsResult.recommendation,
        analysis: atsResult.ai_insights?.analysis || 'Comprehensive ATS analysis completed',
        strengths: atsResult.strengths?.join('\n• ') || 'N/A',
        gaps: atsResult.gaps?.join('\n• ') || 'N/A',
        skill_analysis: atsResult.skill_analysis,
        keyword_match: atsResult.keyword_match,
        experience_analysis: atsResult.experience_analysis,
        education_verification: atsResult.education_verification,
        ai_insights: atsResult.ai_insights,
        interview_questions: atsResult.interview_questions,
        candidate_id: application.candidate_id,
        job_title: job.title
      };
      
      // Store in state
      setAiScreening(prev => ({
        ...prev,
        [application.id]: screeningData
      }));
      
      // Save to database permanently
      try {
        await api.post(`/applications/${application.id}/ats-screening`, {
          ats_score: atsResult.ats_score,
          ats_recommendation: atsResult.recommendation,
          ats_analysis: atsResult.ai_insights?.analysis || 'Comprehensive ATS analysis completed',
          ats_strengths: atsResult.strengths?.join('\n• ') || 'N/A',
          ats_weaknesses: atsResult.gaps?.join('\n• ') || 'N/A',
          ats_matched_skills: atsResult.skill_analysis?.matched_skills || [],
          ats_missing_skills: atsResult.skill_analysis?.missing_skills || [],
          ats_data: JSON.stringify(screeningData) // Save full data as JSON
        });
        console.log('✅ ATS screening saved to database');
      } catch (saveError) {
        console.error('⚠️ Failed to save ATS screening to database:', saveError);
        // Continue anyway - data is in state
      }
      
    } catch (error) {
      console.error('❌ AI screening failed:', error);
      
      // Get job title safely
      const job = jobsData.find(j => j.id === application.job_id);
      const jobTitle = job?.title || 'Unknown';
      
      // Store error result with 0 score
      setAiScreening(prev => ({
        ...prev,
        [application.id]: {
          match_score: 0,
          recommendation: 'Screening Failed',
          analysis: error.response?.data?.error || error.message || 'Failed to screen resume',
          strengths: 'N/A',
          gaps: 'Error during screening process',
          candidate_id: application.candidate_id,
          job_title: jobTitle
        }
      }));
      
      // Show error to user
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      console.error('Error details:', errorMsg);
      console.error('Full error response:', error.response?.data);
      
      // Don't show alert during batch ranking
      if (!rankingAll) {
        alert('AI screening failed: ' + errorMsg);
      }
    } finally {
      setScreeningLoading(prev => ({ ...prev, [application.id]: false }));
    }
  };

  const handleRankAllCandidates = async () => {
    // Only rank active recruitment candidates (exclude hired/rejected)
    const activeApplications = applicationsData.filter(
      app => app.status !== 'hired' && app.status !== 'rejected'
    );

    if (activeApplications.length === 0) {
      alert('No active applications to rank. Hired and rejected candidates are excluded.');
      return;
    }

    const confirmed = window.confirm(
      `This will screen ${activeApplications.length} active candidate(s) with AI. ` +
      `(Hired and rejected candidates will be excluded)\n\nThis may take a few minutes. Continue?`
    );

    if (!confirmed) return;

    try {
      setRankingAll(true);
      console.log(`🤖 Starting AI ranking for ${activeApplications.length} active candidates...`);

      // Screen only active applications
      for (const application of activeApplications) {
        // Skip if already screened
        if (aiScreening[application.id]) {
          console.log(`⏭️ Skipping ${application.id.slice(0, 8)} - already screened`);
          continue;
        }

        await handleAIScreening(application);
        
        // Small delay to avoid overwhelming the AI service
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('✅ All active candidates ranked!');
      setShowRankings(true);
      setRecruitmentTab('active'); // Switch to active tab to see rankings
      alert(`All ${activeApplications.length} active candidate(s) have been screened and ranked!`);

    } catch (error) {
      console.error('❌ Ranking failed:', error);
      alert('Failed to rank all candidates: ' + error.message);
    } finally {
      setRankingAll(false);
    }
  };

  // Filter applications based on search and filters
  const getFilteredApplications = (apps) => {
    return apps.filter(app => {
      // Recruitment tab filter (only for HR/Admin, candidates see all)
      let tabMatch = true;
      if (!isCandidate) {
        const isCompleted = app.status === 'hired' || app.status === 'rejected';
        tabMatch = recruitmentTab === 'active' ? !isCompleted : isCompleted;
      }

      // Search filter (candidate name or email)
      const searchMatch = searchTerm === '' || 
        (app.candidate_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.candidate_email || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === 'all' || app.status === statusFilter;

      // Position filter
      const job = jobsData.find(j => j.id === app.job_id);
      const positionMatch = positionFilter === 'all' || 
        (app.job_title === positionFilter) ||
        (job?.title === positionFilter);

      return tabMatch && searchMatch && statusMatch && positionMatch;
    });
  };

  // Get ranked applications (sorted by AI score)
  const getRankedApplications = () => {
    return applicationsData
      .map(app => ({
        ...app,
        aiScore: aiScreening[app.id]?.match_score || 0,
        aiRecommendation: aiScreening[app.id]?.recommendation || 'Not Screened'
      }))
      .sort((a, b) => b.aiScore - a.aiScore);
  };

  const handleEmailTopCandidates = () => {
    // Get top X candidates from rankings
    const ranked = getRankedApplications();
    const topX = ranked.slice(0, topXCount).filter(app => app.aiScore > 0);
    
    if (topX.length === 0) {
      alert('No screened candidates to email. Please run AI screening first.');
      return;
    }
    
    setSelectedCandidates(topX);
    setShowEmailModal(true);
    setEmailResults(null);
  };

  const handleSendRealEmails = async () => {
    if (selectedCandidates.length === 0) {
      alert('No candidates selected');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send REAL emails to ${selectedCandidates.length} candidates?\n\nThis will send actual emails to their email addresses.`
    );

    if (!confirmed) return;

    try {
      setSendingEmails(true);
      
      // Prepare candidate data with email addresses
      const candidatesWithEmails = selectedCandidates.map(app => {
        const screeningData = aiScreening[app.id];
        return {
          id: app.id,
          name: app.candidate_name || 'Candidate',
          email: app.candidate_email || 'candidate@example.com', // Get from application
          job_title: app.job_title || screeningData?.job_title || 'Position',
          ats_score: screeningData?.match_score || app.aiScore || 0,
          matched_skills: screeningData?.skill_analysis?.matched_skills || []
        };
      });

      // Send emails via backend
      const response = await api.post('/emails/send-to-candidates', {
        candidates: candidatesWithEmails,
        emailType: emailType,
        customMessage: customMessage,
        jobTitle: candidatesWithEmails[0]?.job_title || 'Position'
      });

      setEmailResults(response.data.data);
      alert(`✅ Emails sent successfully!\n\nSent: ${response.data.data.sent}\nFailed: ${response.data.data.failed}`);
      
    } catch (error) {
      console.error('❌ Failed to send emails:', error);
      alert('Failed to send emails: ' + (error.response?.data?.message || error.message));
    } finally {
      setSendingEmails(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (selectedCandidates.length === 0) return;

    try {
      setEmailGenerating(true);
      
      const firstCandidate = selectedCandidates[0];
      const job = jobsData.find(j => j.id === firstCandidate.job_id);
      
      const response = await api.post('/ai/email/generate', {
        type: emailType,
        recipient_name: 'Candidate',
        context: {
          position: job?.title || 'Position',
          date: 'TBD',
          time: 'TBD'
        },
        tone: 'professional'
      });

      setGeneratedEmail(response.data.data);
      console.log('✅ Email generated:', response.data);
      
    } catch (error) {
      console.error('❌ Email generation failed:', error);
      alert('Failed to generate email: ' + (error.response?.data?.message || error.message));
    } finally {
      setEmailGenerating(false);
    }
  };

  // Generate mock resume based on candidate ID (for demo)
  // In production, replace this with actual resume parsing
  const generateMockResumeForCandidate = (candidateId, application, resumeUrl) => {
    // Use BOTH candidate ID AND resume URL for better variation
    // This ensures each unique resume URL gets a different profile
    const combinedString = candidateId + (resumeUrl || '');
    const hash = combinedString.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
    const level = hash % 5; // 5 different levels
    
    console.log(`📄 Generating mock resume - Hash: ${hash}, Level: ${level}, URL: ${resumeUrl?.slice(0, 30)}`);
    
    const mockProfiles = [
      {
        name: 'Junior Developer',
        experience: '1 year',
        skills: 'HTML, CSS, JavaScript (basic)',
        projects: 'Built 2 small personal projects',
        education: 'Bachelor in Computer Science (2023)',
        strengths: 'Eager to learn, good communication',
        weaknesses: 'Limited production experience, no framework expertise',
        description: 'Recent graduate with basic web development skills. Completed bootcamp training. Looking for first professional role to grow skills.'
      },
      {
        name: 'Junior+ Developer',
        experience: '2 years',
        skills: 'HTML, CSS, JavaScript, React (learning), Git',
        projects: 'Worked on 3 company projects as junior team member',
        education: 'Bachelor in Computer Science (2022)',
        strengths: 'Fast learner, team player, responsive design basics',
        weaknesses: 'Limited backend knowledge, no TypeScript experience',
        description: 'Junior developer with 2 years experience. Familiar with React basics. Contributed to frontend features. Seeking to advance skills.'
      },
      {
        name: 'Mid-Level Developer',
        experience: '4 years',
        skills: 'React, Vue.js, JavaScript, TypeScript, Node.js, MongoDB, REST APIs',
        projects: 'Led 5+ frontend projects, built 3 full-stack applications',
        education: 'Bachelor in Computer Science (2020)',
        strengths: 'Strong React skills, API integration, responsive design, testing',
        weaknesses: 'Limited DevOps experience, no cloud certifications',
        description: 'Solid mid-level developer with 4 years experience. Strong React and TypeScript skills. Built multiple production applications. Good problem-solving abilities.'
      },
      {
        name: 'Senior Developer',
        experience: '6 years',
        skills: 'React, Angular, TypeScript, Node.js, PostgreSQL, AWS, Docker, CI/CD, GraphQL',
        projects: 'Led 10+ major projects, architected 5 applications, mentored 8 developers',
        education: 'Master in Computer Science (2018)',
        strengths: 'Expert in React ecosystem, cloud deployment, system architecture, team leadership',
        weaknesses: 'None significant for this role',
        description: 'Senior developer with 6 years experience. Expert in modern frontend frameworks. Led multiple high-impact projects. Strong architecture and mentoring skills. AWS certified.'
      },
      {
        name: 'Expert/Lead Developer',
        experience: '9 years',
        skills: 'React, Vue, Angular, TypeScript, Node.js, Python, Microservices, Kubernetes, AWS/Azure, GraphQL, System Design',
        projects: 'Architected 15+ enterprise applications, led teams of 5-12 developers, delivered $2M+ projects',
        education: 'Master in Computer Science (2015), AWS Solutions Architect',
        strengths: 'Full-stack expertise, system architecture, team leadership, technical strategy, performance optimization',
        weaknesses: 'None',
        description: 'Expert full-stack developer with 9 years experience. Led multiple enterprise projects. Strong technical leadership and architecture skills. Proven track record of delivering complex systems. Excellent mentor and communicator.'
      }
    ];
    
    const profile = mockProfiles[level];
    
    return `
CANDIDATE PROFILE

Name: ${profile.name}
Candidate ID: ${candidateId.slice(0, 8)}
Total Experience: ${profile.experience}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TECHNICAL SKILLS
${profile.skills}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROFESSIONAL EXPERIENCE
${profile.description}

Project Portfolio: ${profile.projects}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EDUCATION
${profile.education}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRENGTHS
${profile.strengths}

AREAS FOR GROWTH
${profile.weaknesses}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Application Date: ${formatDate(application.created_at)}
Current Status: ${application.status}
    `;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse h-96">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 rounded-lg">
              <FileText className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
              <p className="text-gray-600">
                {isCandidate ? 'Track your job applications' : 'Manage job applications'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          {(isAdmin || isHR || isManager) && applicationsData.length > 0 && (
            <>
              <Button
                onClick={handleRankAllCandidates}
                disabled={rankingAll}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
              >
                {rankingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ranking...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Rank All Candidates
                  </>
                )}
              </Button>
              {Object.keys(aiScreening).length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowRankings(!showRankings)}
                  >
                    {showRankings ? 'Show All' : 'Show Rankings'}
                  </Button>
                </>
              )}
              {selectedForInterview.length > 0 && (() => {
                // Filter out hired candidates from selection
                const nonHiredSelected = selectedForInterview.filter(appId => {
                  const app = applicationsData.find(a => a.id === appId);
                  return app && app.status !== 'hired';
                });
                
                return nonHiredSelected.length > 0 && (
                  <Button
                    onClick={() => setShowBulkInterviewModal(true)}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Schedule Interview & Send AI Invitation ({nonHiredSelected.length})
                  </Button>
                );
              })()}
            </>
          )}
          {isCandidate && (
            <Button onClick={() => setShowApplicationForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Application
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Section for HR/Admin */}
      {(isAdmin || isHR || isManager) && applicationsData.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search candidate name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
                <option value="hired">Hired</option>
              </select>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Positions</option>
                {[...new Set(applicationsData.map(app => {
                  const job = jobsData.find(j => j.id === app.job_id);
                  return app.job_title || job?.title || 'Unknown';
                }))].sort().map((position, index) => (
                  <option key={index} value={position}>
                    {position}
                  </option>
                ))}
              </select>
              {(searchTerm || statusFilter !== 'all' || positionFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPositionFilter('all');
                  }}
                  className="text-gray-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards removed */}

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Application Records</CardTitle>
              <CardDescription>
                {isCandidate ? 'Your job applications' : showRankings ? 'Candidates ranked by AI score' : 'All job applications'}
                {(searchTerm || statusFilter !== 'all' || positionFilter !== 'all') && (
                  <span className="ml-2 text-blue-600">
                    • Showing {getFilteredApplications(showRankings ? getRankedApplications() : applicationsData).length} of {applicationsData.length}
                  </span>
                )}
              </CardDescription>
            </div>
            {showRankings && Object.keys(aiScreening).length > 0 && (
              <div className="text-sm text-purple-600 font-medium">
                🏆 Showing {Object.keys(aiScreening).length} screened candidates
              </div>
            )}
          </div>
          
          {/* Recruitment Status Tabs */}
          {!isCandidate && (
            <div className="flex gap-2 mt-4 border-b">
              <button
                onClick={() => {
                  setRecruitmentTab('active');
                  setStatusFilter('all');
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  recruitmentTab === 'active'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Active Recruitment</span>
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    {applicationsData.filter(app => app.status !== 'hired' && app.status !== 'rejected').length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => {
                  setRecruitmentTab('completed');
                  setStatusFilter('all');
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  recruitmentTab === 'completed'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Completed</span>
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                    {applicationsData.filter(app => app.status === 'hired' || app.status === 'rejected').length}
                  </span>
                </div>
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {applicationsData.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
              <p className="text-gray-500 mb-4">
                {isCandidate ? 'You haven\'t applied to any jobs yet' : 'No applications have been submitted yet'}
              </p>
              {isCandidate && (
                <Button onClick={() => setShowApplicationForm(true)}>
                  Apply for a Job
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {(isAdmin || isHR || isManager) && <TableHead className="w-12">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selectedForInterview.length === applicationsData.length && applicationsData.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedForInterview(applicationsData.map(app => app.id));
                        } else {
                          setSelectedForInterview([]);
                        }
                      }}
                    />
                  </TableHead>}
                  {(isAdmin || isHR || isManager) && <TableHead>Candidate</TableHead>}
                  {isCandidate && <TableHead>Position</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Resume</TableHead>
                  {!isCandidate && <TableHead>Score</TableHead>}
                  {!isCandidate && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredApplications(showRankings ? getRankedApplications() : applicationsData).map((application, index) => (
                  <React.Fragment key={application.id}>
                    <TableRow className={showRankings && index < 3 ? 'bg-purple-50 border-l-4 border-purple-500' : ''}>
                      {(isAdmin || isHR || isManager) && (
                        <TableCell>
                          {application.status === 'hired' ? (
                            <div className="flex items-center justify-center" title="Hired candidates - recruitment completed">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                          ) : application.status === 'rejected' ? (
                            <div className="flex items-center justify-center" title="Rejected candidates - recruitment completed">
                              <X className="h-4 w-4 text-red-500" />
                            </div>
                          ) : (
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedForInterview.includes(application.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedForInterview([...selectedForInterview, application.id]);
                                } else {
                                  setSelectedForInterview(selectedForInterview.filter(id => id !== application.id));
                                }
                              }}
                            />
                          )}
                        </TableCell>
                      )}
                    {isCandidate && (
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {jobsData.find(j => j.id === application.job_id)?.title || 'Unknown Position'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {jobsData.find(j => j.id === application.job_id)?.department || 'N/A'}
                          </div>
                          {application.interview_date && (
                            <div className="flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3 text-green-600" />
                              <span className="text-xs font-medium text-green-600 cursor-pointer hover:underline"
                                onClick={() => setExpandedRow(expandedRow === application.id ? null : application.id)}>
                                Interview: {new Date(application.interview_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                                {application.interview_time && ` at ${application.interview_time}`}
                                <span className="ml-1">{expandedRow === application.id ? '▼' : '▶'}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {(isAdmin || isHR || isManager) && (
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {(application.candidate_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{application.candidate_name || 'Unknown Candidate'}</div>
                            {application.candidate_email && (
                              <div className="text-sm text-gray-500">{application.candidate_email}</div>
                            )}
                            <div className="text-sm text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                              <Briefcase className="w-3 h-3" />
                              {jobsData.find(j => j.id === application.job_id)?.title || 'Position Unknown'}
                            </div>
                            {application.interview_date && (
                              <div className="flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3 text-green-600" />
                                <span className="text-xs font-medium text-green-600 cursor-pointer hover:underline"
                                  onClick={() => setExpandedRow(expandedRow === application.id ? null : application.id)}>
                                  Interview: {new Date(application.interview_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                  {application.interview_time && ` at ${application.interview_time}`}
                                  <span className="ml-1">{expandedRow === application.id ? '▼' : '▶'}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${getDisplayStatusColor(application)}`}>
                        {getDisplayStatus(application)}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(application.created_at)}</TableCell>
                    <TableCell>
                      {application.resume_url ? (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(application.resume_url, '_blank')}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-400">No resume</span>
                      )}
                    </TableCell>
                    {!isCandidate && (
                      <TableCell>
                        {application.interview_status === 'completed' && application.interview_score !== undefined ? (
                          // Show interview score if interview is completed
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:opacity-80"
                            onClick={() => setExpandedRow(expandedRow === application.id ? null : application.id)}
                            title="Click to view details"
                          >
                            <Trophy className="h-4 w-4 text-purple-600" />
                            <span className={`font-bold text-2xl ${
                              application.interview_score >= 80 ? 'text-green-600' :
                              application.interview_score >= 60 ? 'text-blue-600' :
                              application.interview_score >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {application.interview_score}
                            </span>
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        ) : aiScreening[application.id] ? (
                          // Show AI screening score
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:opacity-80"
                            onClick={() => setExpandedRow(expandedRow === application.id ? null : application.id)}
                            title="Click to view AI screening details"
                          >
                            <span className={`font-bold text-2xl ${
                              aiScreening[application.id].match_score >= 80 ? 'text-green-600' :
                              aiScreening[application.id].match_score >= 60 ? 'text-blue-600' :
                              aiScreening[application.id].match_score >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {aiScreening[application.id].match_score}
                            </span>
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                    )}
                    {!isCandidate && (<TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        {(isAdmin || isHR || isManager) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAIScreening(application)}
                              disabled={screeningLoading[application.id] || application.interview_status === 'completed'}
                              className={`${
                                application.interview_status === 'completed' 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
                              }`}
                              title={application.interview_status === 'completed' 
                                ? 'Interview completed - AI screening not needed' 
                                : 'AI Screen Candidate'}
                            >
                              {screeningLoading[application.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Bot className="h-4 w-4" />
                              )}
                            </Button>
                            {(aiScreening[application.id] || application.interview_results) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedATSData({
                                    ...aiScreening[application.id],
                                    candidateName: application.candidate_name || 'Candidate',
                                    // Add interview results data
                                    interview_results: application.interview_results,
                                    interview_score: application.interview_score,
                                    interview_performance: application.interview_performance,
                                    interview_status: application.interview_status
                                  });
                                  setShowATSModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                title="View Complete Overview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {application.status === 'hired' ? (
                              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-lg">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-semibold text-green-700">Hired</span>
                                <span className="text-xs text-green-600">(Final)</span>
                              </div>
                            ) : application.status === 'rejected' ? (
                              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 border border-red-300 rounded-lg">
                                <X className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-semibold text-red-700">Rejected</span>
                                <span className="text-xs text-red-600">(Final)</span>
                              </div>
                            ) : (
                              <div className="relative">
                                <select
                                  value={application.status}
                                  onChange={(e) => handleUpdateStatus(application.id, e.target.value)}
                                  className="text-xs border rounded px-2 py-1"
                                  title={application.interview_status === 'completed' && application.interview_results ? 
                                    "Assessment completed. Update status based on review results." : 
                                    "Update application status"}
                                >
                                <option value={APPLICATION_STATUS.PENDING}>Pending</option>
                                <option value={APPLICATION_STATUS.REVIEWED}>Reviewed</option>
                                <option value={APPLICATION_STATUS.SHORTLISTED}>Shortlisted</option>
                                <option value={APPLICATION_STATUS.INTERVIEWED}>Interviewed</option>
                                <option value={APPLICATION_STATUS.REJECTED}>Rejected</option>
                                <option value={APPLICATION_STATUS.HIRED}>Hired</option>
                              </select>
                              </div>
                            )}
                            </>
                          )}
                        </div>
                      </TableCell>)}
                    </TableRow>
                    
                    {/* Expanded Row for Interview & Screening Details */}
                    {expandedRow === application.id && (application.interview_date || aiScreening[application.id]) && (
                      <TableRow>
                        <TableCell colSpan={isCandidate ? 4 : 7} className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500">
                          <div className="p-4 space-y-4">
                            
                            {/* AI Screening Section */}
                            {(isAdmin || isHR || isManager) && aiScreening[application.id] && (
                              <div className="bg-white rounded-lg p-4 border border-blue-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <Bot className="w-5 h-5 text-blue-600" />
                                  <h4 className="font-semibold text-gray-900">AI Screening Results</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center">
                                    <p className="text-sm text-gray-500 mb-1">Match Score</p>
                                    <p className={`text-3xl font-bold ${
                                      aiScreening[application.id].match_score >= 80 ? 'text-green-600' :
                                      aiScreening[application.id].match_score >= 60 ? 'text-blue-600' :
                                      aiScreening[application.id].match_score >= 40 ? 'text-yellow-600' :
                                      'text-red-600'
                                    }`}>
                                      {aiScreening[application.id].match_score}%
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-gray-500 mb-1">Recommendation</p>
                                    <p className="text-lg font-semibold text-blue-700">
                                      {aiScreening[application.id].recommendation || 'N/A'}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-gray-500 mb-1">Skills Match</p>
                                    <p className="text-lg font-semibold text-gray-700">
                                      {aiScreening[application.id].skill_analysis?.skill_match_percentage || 0}%
                                    </p>
                                  </div>
                                </div>
                                {aiScreening[application.id].strengths && Array.isArray(aiScreening[application.id].strengths) && aiScreening[application.id].strengths.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-blue-200">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Key Strengths:</p>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                      {aiScreening[application.id].strengths.slice(0, 2).map((strength, idx) => (
                                        <li key={idx}>✓ {strength}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Individual Assessment Results - Show each assessment type separately like AI Screening */}
                            {!isCandidate && application.interview_status === 'completed' && application.multi_round_results && 
                             Object.entries(application.multi_round_results)
                               .filter(([key, value]) => 
                                 typeof value === 'object' && 
                                 value !== null && 
                                 'score' in value &&
                                 ['aptitude', 'communication', 'coding'].includes(key)
                               )
                               .map(([assessmentType, results]) => (
                              <div key={assessmentType} className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-300 mb-4">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                  {assessmentType === 'aptitude' ? (
                                    <>
                                      <Bot className="w-5 h-5 text-purple-600" />
                                      Aptitude Assessment - Completed
                                    </>
                                  ) : assessmentType === 'communication' ? (
                                    <>
                                      <Volume2 className="w-5 h-5 text-blue-600" />
                                      Communication Assessment - Completed
                                    </>
                                  ) : assessmentType === 'coding' ? (
                                    <>
                                      <Code className="w-5 h-5 text-green-600" />
                                      Coding Challenge - Completed
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="w-5 h-5 text-gray-600" />
                                      {assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)} Assessment - Completed
                                    </>
                                  )}
                                </h3>
                                
                                <div className="bg-white rounded-lg p-4 shadow-sm">
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                      <p className="text-sm text-gray-500 mb-1">Overall Score</p>
                                      <p className={`text-3xl font-bold ${
                                        results.score >= 80 ? 'text-green-600' :
                                        results.score >= 60 ? 'text-blue-600' :
                                        results.score >= 40 ? 'text-yellow-600' :
                                        'text-red-600'
                                      }`}>
                                        {results.score}%
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-sm text-gray-500 mb-1">Performance Level</p>
                                      <p className="text-lg font-semibold text-purple-700">
                                        {results.score >= 80 ? 'Excellent' : 
                                         results.score >= 60 ? 'Good' : 
                                         results.score >= 40 ? 'Average' : 'Poor'}
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-sm text-gray-500 mb-1">
                                        {results.total_questions ? 'Questions' : 
                                         results.sections_scores ? 'Sections' : 'Status'}
                                      </p>
                                      <p className="text-lg font-semibold text-gray-700">
                                        {results.total_questions || 
                                         (results.sections_scores ? Object.keys(results.sections_scores).length : 'Completed')}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Assessment-specific details */}
                                  {results.total_questions && (
                                    <div className="mt-3 pt-3 border-t border-purple-200">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="text-gray-500">Correct Answers:</span>
                                          <span className="ml-2 font-semibold text-green-600">
                                            {results.correct_answers || 0} / {results.total_questions}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Time Taken:</span>
                                          <span className="ml-2 font-semibold text-blue-600">
                                            {Math.floor((results.time_taken || 0) / 60)}m {((results.time_taken || 0) % 60)}s
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Communication assessment section breakdown */}
                                  {results.sections_scores && (
                                    <div className="mt-3 pt-3 border-t border-purple-200">
                                      <p className="text-sm font-medium text-gray-700 mb-2">Section Breakdown:</p>
                                      <div className="grid grid-cols-3 gap-3">
                                        {Object.entries(results.sections_scores).map(([section, data]) => (
                                          <div key={section} className="text-center bg-gray-50 rounded p-2">
                                            <p className="text-xs text-gray-500 capitalize">{section}</p>
                                            <p className="text-lg font-semibold text-purple-600">{data.score}%</p>
                                            <p className="text-xs text-gray-600">
                                              {data.correct ? `${data.correct}/${data.total}` : 
                                               data.completed !== undefined ? `${data.completed}/${data.total}` : 
                                               'Completed'}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            {/* Candidate view - show only basic completion message when status is still pending */}
                            {isCandidate && application.interview_status === 'completed' && application.interview_results && 
                             !['shortlisted', 'rejected', 'hired'].includes(application.status) && (
                              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-300">
                                <div className="text-center">
                                  <div className="flex items-center justify-center gap-2 mb-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  </div>
                                  <p className="text-lg font-semibold text-gray-900 mb-2">
                                    {application.interview_notes?.includes('[APTITUDE Interview]') ? 'Aptitude Assessment' : 
                                     application.interview_notes?.includes('[CODING Interview]') ? 'Coding Assessment' :
                                     application.interview_notes?.includes('[HR Interview]') ? 'HR Interview' :
                                     'Assessment'} Completed Successfully
                                  </p>
                                  <p className="text-sm text-gray-600 mb-4">
                                    Thank you for completing the {application.interview_notes?.includes('[APTITUDE Interview]') ? 'aptitude assessment' : 
                                                                 application.interview_notes?.includes('[CODING Interview]') ? 'coding assessment' :
                                                                 application.interview_notes?.includes('[HR Interview]') ? 'HR interview' :
                                                                 'assessment'}. Our HR team will review your responses and get back to you with the next steps within 2-3 business days.
                                  </p>
                                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                                    <p className="text-xs text-gray-500">
                                      You will receive an email notification regarding your application status and any next steps.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Current/Upcoming Interview Details Section */}
                            {application.interview_date && (
                              <div className={`bg-white rounded-lg p-4 border ${
                                application.interview_notes?.includes('[HR Interview]') || application.interview_notes?.toLowerCase().includes('hr') 
                                  ? 'border-blue-300' 
                                  : 'border-green-200'
                              }`}>
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                  {application.interview_notes?.includes('[HR Interview]') || application.interview_notes?.toLowerCase().includes('hr') ? (
                                    <>
                                      <Trophy className="w-5 h-5 text-blue-600" />
                                      HR Interview {(application.status === 'hired' || application.status === 'rejected') ? '- Completed' : '- Scheduled'}
                                    </>
                                  ) : (
                                    <>
                                      <Calendar className="w-5 h-5 text-green-600" />
                                      Interview Details
                                    </>
                                  )}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">Date</p>
                                <p className="text-base font-medium text-gray-900">
                                  {new Date(application.interview_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              {application.interview_time && (
                                <div>
                                  <p className="text-sm text-gray-500">Time</p>
                                  <p className="text-base font-medium text-gray-900">{application.interview_time}</p>
                                </div>
                              )}
                              {application.interview_location && (
                                <div>
                                  <p className="text-sm text-gray-500">Location</p>
                                  <p className="text-base font-medium text-gray-900">{application.interview_location}</p>
                                </div>
                              )}
                              
                              {/* Show status for HR interview */}
                              {(isAdmin || isHR || isManager) && !application.interview_results && (
                                <div>
                                  <p className="text-sm text-gray-500">Status</p>
                                  <p className="text-base font-medium">
                                    {application.status === 'hired' ? (
                                      <span className="text-green-600 font-semibold">✓ Completed - Hired</span>
                                    ) : application.status === 'rejected' ? (
                                      <span className="text-red-600 font-semibold">✓ Completed - Rejected</span>
                                    ) : (
                                      <span className="text-orange-600 font-semibold">⏳ Scheduled</span>
                                    )}
                                  </p>
                                </div>
                              )}
                              
                              {application.interview_notes && (
                                <div className="col-span-2">
                                  <p className="text-sm text-gray-500">Notes</p>
                                  <p className="text-sm text-gray-700 bg-white p-2 rounded mt-1">
                                    {application.interview_notes
                                      .replace('[AI Interview]\n', '')
                                      .replace('[AI INTERVIEW]\n', '')
                                      .replace('[HR Interview]\n', '')
                                      .replace('[HR INTERVIEW]\n', '')}
                                  </p>
                                </div>
                              )}
                              
                              {/* For Candidates: Show Start Assessment/Interview button */}
                              {isCandidate && application.interview_token && (
                                <div className="col-span-2">
                                  <div className={`border rounded-lg p-4 ${
                                    application.interview_notes?.includes('[APTITUDE Interview]') ? 'bg-purple-50 border-purple-200' :
                                    application.interview_notes?.includes('[CODING Interview]') ? 'bg-green-50 border-green-200' :
                                    application.interview_notes?.includes('[COMMUNICATION Interview]') ? 'bg-blue-50 border-blue-200' :
                                    'bg-blue-50 border-blue-200'
                                  }`}>
                                    <p className="text-sm font-medium text-gray-700 mb-3">
                                      {application.interview_notes?.includes('[APTITUDE Interview]') ? 'Ready to Start Your Aptitude Assessment?' :
                                       application.interview_notes?.includes('[CODING Interview]') ? 'Ready to Start Your Coding Challenge?' :
                                       application.interview_notes?.includes('[COMMUNICATION Interview]') ? 'Ready to Start Your Communication Assessment?' :
                                       'Ready to Start Your Interview?'}
                                    </p>
                                    <a
                                      href={`http://localhost:3000/interview/${application.interview_token}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`inline-flex items-center justify-center gap-2 text-white px-6 py-3 rounded-lg transition-all shadow-md hover:shadow-lg font-semibold ${
                                        application.interview_notes?.includes('[APTITUDE Interview]') ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' :
                                        application.interview_notes?.includes('[CODING Interview]') ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700' :
                                        application.interview_notes?.includes('[COMMUNICATION Interview]') ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' :
                                        'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                                      }`}
                                    >
                                      <Bot className="w-5 h-5" />
                                      {application.interview_notes?.includes('[APTITUDE Interview]') ? 'Start Aptitude Test' :
                                       application.interview_notes?.includes('[CODING Interview]') ? 'Start Coding Challenge' :
                                       application.interview_notes?.includes('[COMMUNICATION Interview]') ? 'Start Communication Test' :
                                       'Join AI Interview'}
                                    </a>
                                    <p className="text-xs text-gray-600 mt-2">
                                      💡 Make sure you have a stable internet connection and a quiet environment
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Show completion message for candidates based on status */}
                              {isCandidate && application.interview_status === 'completed' && (
                                <div className="col-span-2">
                                  {application.status === 'rejected' ? (
                                    <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                                      <p className="text-sm text-red-800 font-medium">
                                        ❌ Application Rejected
                                      </p>
                                      <p className="text-xs text-red-600 mt-1">
                                        Thank you for your time. We encourage you to apply for future opportunities.
                                      </p>
                                    </div>
                                  ) : application.status === 'shortlisted' && 
                                       !(application.interview_status === 'completed' && application.interview_results) ? (
                                    // This message only shows when HR manually sets status to 'shortlisted' after reviewing assessment
                                    // NOT when it's just from initial interview scheduling
                                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                                      <p className="text-sm text-blue-800 font-medium">
                                        🎉 Congratulations! You've been shortlisted for the next round
                                      </p>
                                      <p className="text-xs text-blue-600 mt-1">
                                        Check above for your next interview schedule. Good luck!
                                      </p>
                                    </div>
                                  ) : application.status === 'hired' ? (
                                    <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                                      <p className="text-sm text-green-800 font-medium">
                                        🎊 Congratulations! You've been selected for the position
                                      </p>
                                      <p className="text-xs text-green-600 mt-1">
                                        Welcome to the team! HR will contact you with onboarding details.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                                      <p className="text-sm text-yellow-800 font-medium">
                                        ✓ {application.interview_notes?.includes('[APTITUDE Interview]') ? 'Aptitude Assessment' : 
                                           application.interview_notes?.includes('[CODING Interview]') ? 'Coding Assessment' :
                                           application.interview_notes?.includes('[HR Interview]') ? 'HR Interview' :
                                           'Assessment'} completed. Please wait for results.
                                      </p>
                                      <p className="text-xs text-yellow-600 mt-1">
                                        Your {application.interview_notes?.includes('[APTITUDE Interview]') ? 'assessment' : 
                                             application.interview_notes?.includes('[CODING Interview]') ? 'assessment' :
                                             application.interview_notes?.includes('[HR Interview]') ? 'interview' :
                                             'submission'} is under review. We'll notify you once a decision is made.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* For HR: Show interview link for sharing - For all assessment types */}
                              {(isAdmin || isHR || isManager) && application.interview_token && (
                                application.interview_notes?.includes('[AI Interview]') || 
                                application.interview_notes?.includes('[APTITUDE Interview]') ||
                                application.interview_notes?.includes('[CODING Interview]') ||
                                application.interview_notes?.includes('[COMMUNICATION Interview]')
                              ) && (
                                <div className="col-span-2">
                                  <p className="text-sm text-gray-500 mb-2">Interview Link (for candidate)</p>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={`http://localhost:3000/interview/${application.interview_token}`}
                                      readOnly
                                      className="flex-1 text-sm bg-white border border-gray-300 rounded px-3 py-2 text-gray-600"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        navigator.clipboard.writeText(`http://localhost:3000/interview/${application.interview_token}`);
                                        alert('Interview link copied to clipboard!');
                                      }}
                                      className="bg-gray-600 hover:bg-gray-700"
                                    >
                                      Copy
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                              </div>
                            )}
                            
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Application Form Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Apply for Position</CardTitle>
              <CardDescription>
                {selectedJob ? `Applying for: ${selectedJob.title}` : 'Select a position to apply'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitApplication} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="job_id">Position</Label>
                  <select
                    id="job_id"
                    value={formData.job_id}
                    onChange={(e) => {
                      const job = jobsData.find(j => j.id === e.target.value);
                      setSelectedJob(job);
                      setFormData({...formData, job_id: e.target.value});
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    required
                  >
                    <option value="">Select a position</option>
                    {jobsData
                      .filter(job => job.status === 'open' || !job.status) // Only show open positions
                      .map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title} - {job.department}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resume_url">Resume URL</Label>
                  <Input
                    id="resume_url"
                    type="url"
                    value={formData.resume_url}
                    onChange={(e) => setFormData({...formData, resume_url: e.target.value})}
                    placeholder="https://example.com/resume.pdf"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">
                    Submit Application
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowApplicationForm(false);
                      setSelectedJob(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

{/* Email Modal */}
{showEmailModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Mail className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <CardTitle>Email Top Candidates</CardTitle>
            <CardDescription>
              Generate AI-powered emails for the top {selectedCandidates.length} candidates
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Candidates */}
        <div>
          <Label>Selected Candidates:</Label>
          <div className="mt-2 space-y-2">
            {selectedCandidates.map((candidate, index) => (
              <div key={candidate.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">#{index + 1} - {candidate.candidate_name || 'Unknown'}</span>
                  <span className="ml-2 text-sm text-gray-600">Score: {candidate.aiScore}%</span>
                  {candidate.candidate_email && (
                    <div className="text-xs text-gray-500 mt-1">{candidate.candidate_email}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Type */}
        <div>
          <Label htmlFor="emailType">Email Type</Label>
          <select
            id="emailType"
            value={emailType}
            onChange={(e) => setEmailType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="interview_invite">Interview Invitation</option>
            <option value="offer">Job Offer</option>
            <option value="rejection">Rejection (Polite)</option>
            <option value="reminder">Application Reminder</option>
          </select>
        </div>

        {/* Custom Message */}
        <div>
          <Label htmlFor="customMessage">Custom Message (Optional)</Label>
          <textarea
            id="customMessage"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Add any additional information you want to include in the email..."
          />
        </div>

        {/* Send Real Emails Button */}
        <Button
          onClick={handleSendRealEmails}
          disabled={sendingEmails}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
        >
          {sendingEmails ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Emails...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Send Real Emails to {selectedCandidates.length} Candidates
            </>
          )}
        </Button>

        {/* Email Results */}
        {emailResults && (
          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-700 mb-2">✅ Email Results</h3>
            <div className="space-y-1 text-sm">
              <p>Total: {emailResults.total}</p>
              <p className="text-green-600">✓ Sent: {emailResults.sent}</p>
              {emailResults.failed > 0 && (
                <p className="text-red-600">✗ Failed: {emailResults.failed}</p>
              )}
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-xs text-gray-500 mb-2">Or preview email template first:</p>
          <Button
            onClick={handleGenerateEmail}
            disabled={emailGenerating}
            variant="outline"
            className="w-full"
          >
            {emailGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Preview...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Preview Email Template
              </>
            )}
          </Button>
        </div>

        {/* Generated Email Preview */}
        {generatedEmail && (
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold">Generated Email:</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Subject:</Label>
                <p className="font-medium">{generatedEmail.subject}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Body:</Label>
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">
                  {generatedEmail.body}
                </pre>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <Button className="flex-1" onClick={() => {
                navigator.clipboard.writeText(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`);
                alert('Email copied to clipboard!');
              }}>
                Copy to Clipboard
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => {
                alert('In production, this would send emails to all selected candidates');
              }}>
                Send to All
              </Button>
            </div>
          </div>
        )}

        {/* Close Button */}
        <Button
          variant="outline"
          onClick={() => {
            setShowEmailModal(false);
            setGeneratedEmail(null);
          }}
          className="w-full"
        >
          Close
        </Button>
      </CardContent>
    </Card>
  </div>
)}

{/* Complete Overview Modal - AI Screening + Interview Results */}
{showATSModal && selectedATSData && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Eye className="w-6 h-6 text-blue-600" />
          Complete Candidate Overview
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowATSModal(false);
            setSelectedATSData(null);
          }}
          className="hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="p-6 space-y-6">
        
        {/* AI Screening Section */}
        {selectedATSData.match_score && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              AI Screening Results
            </h3>
            <ATSScoreCard 
              screeningData={selectedATSData} 
              candidateName={selectedATSData.candidateName}
            />
          </div>
        )}
        
        {/* Interview Results Section */}
        {selectedATSData.interview_results && selectedATSData.interview_status === 'completed' && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              Interview Performance
            </h3>
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6">
              {/* Overall Score Section */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-500 mb-2">Overall Score</p>
                  <p className={`text-5xl font-bold ${
                    selectedATSData.interview_score >= 80 ? 'text-green-600' :
                    selectedATSData.interview_score >= 60 ? 'text-blue-600' :
                    selectedATSData.interview_score >= 40 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {selectedATSData.interview_score}%
                  </p>
                </div>
                <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-500 mb-2">Performance Level</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {selectedATSData.interview_performance || 'N/A'}
                  </p>
                </div>
                <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-500 mb-2">Questions Answered</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {selectedATSData.interview_results.question_scores?.length || 0}
                  </p>
                </div>
              </div>
              
              {/* Key Strengths */}
              {selectedATSData.interview_results.strengths && Array.isArray(selectedATSData.interview_results.strengths) && selectedATSData.interview_results.strengths.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <span className="text-xl">✓</span> Key Strengths Identified
                  </h4>
                  <ul className="grid grid-cols-2 gap-2">
                    {selectedATSData.interview_results.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-600 font-bold">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Question Details with Answers and Evaluation */}
              {selectedATSData.interview_results.question_scores && selectedATSData.interview_results.question_scores.length > 0 && (
                <div className="mt-4 space-y-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Interview Questions & Responses</h4>
                  {selectedATSData.interview_results.question_scores.map((qs, idx) => (
                    <div key={idx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {/* Question Header */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 border-b">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="text-xs font-semibold text-blue-600 uppercase">Question {idx + 1}</span>
                            <p className="text-base font-semibold text-gray-900 mt-1">{qs.question}</p>
                            {qs.type && (
                              <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                {qs.type}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 text-right">
                            <div className={`text-2xl font-bold ${
                              qs.score >= 80 ? 'text-green-600' :
                              qs.score >= 60 ? 'text-blue-600' :
                              qs.score >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {qs.score}%
                            </div>
                            <div className="text-xs text-gray-500">Score</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Code Snippet if exists */}
                      {qs.code && (
                        <div className="px-4 py-3 bg-gray-50 border-b">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Code Snippet:</p>
                          <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
                            <code>{qs.code}</code>
                          </pre>
                        </div>
                      )}
                      
                      {/* Candidate Answer */}
                      <div className="px-4 py-3 border-b">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Candidate's Answer:</p>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {qs.answer || 'No answer provided'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Assessment */}
                      <div className="px-4 py-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          Assessment:
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {qs.feedback || qs.evaluation || 'No evaluation available'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Hiring Assessment Summary */}
              {selectedATSData.interview_results.feedback && (
                <div className="mt-4 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-blue-600" />
                    Hiring Assessment Summary
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selectedATSData.interview_results.feedback}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Show message if no data available */}
        {!selectedATSData.match_score && !selectedATSData.interview_results && (
          <div className="text-center py-8 text-gray-500">
            <p>No screening or interview data available for this candidate.</p>
          </div>
        )}
        
      </div>
    </div>
  </div>
)}

{/* Bulk Interview Scheduling Modal */}
{showBulkInterviewModal && (() => {
  // Calculate valid candidate count (exclude hired/rejected)
  const validCandidateCount = applicationsData.filter(
    app => selectedForInterview.includes(app.id) && 
           app.status !== 'hired' && 
           app.status !== 'rejected'
  ).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Schedule Interview & Send AI Invitation</h2>
            <p className="text-sm text-gray-600 mt-1">For {validCandidateCount} selected candidate(s)</p>
          </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowBulkInterviewModal(false);
            setInterviewData({
              interview_date: '',
              interview_time: '',
              interview_location: '',
              interview_notes: '',
              interview_type: 'hr'
            });
          }}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Selected Candidates List */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            Selected Candidates ({applicationsData.filter(app => selectedForInterview.includes(app.id) && app.status !== 'hired' && app.status !== 'rejected').length})
          </h3>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {applicationsData
              .filter(app => selectedForInterview.includes(app.id) && app.status !== 'hired' && app.status !== 'rejected')
              .map(app => {
                // Get actual job title from jobs data
                const job = jobsData.find(j => j.id === app.job_id);
                const jobTitle = app.job_title || job?.title || 'Unknown Position';
                
                return (
                  <div key={app.id} className="text-sm text-blue-700 flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                      {(app.candidate_name || 'U').charAt(0).toUpperCase()}
                    </span>
                    {app.candidate_name || 'Unknown'} - {jobTitle}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Same Date/Time for All */}
        <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">AI-Powered Interview Invitations</p>
              <p className="text-xs text-gray-600 mt-1">
                Same interview details + AI-generated professional emails will be sent to all candidates
              </p>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="bulk_interview_date">Interview Date *</Label>
          <Input
            id="bulk_interview_date"
            type="date"
            value={interviewData.interview_date}
            onChange={(e) => setInterviewData({ ...interviewData, interview_date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="bulk_interview_time">Interview Time</Label>
          <Input
            id="bulk_interview_time"
            type="time"
            value={interviewData.interview_time}
            onChange={(e) => setInterviewData({ ...interviewData, interview_time: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-lg font-semibold mb-3">Select Interview Round *</Label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              { id: 'aptitude', name: 'Aptitude Assessment', icon: '🧠', desc: 'MCQ tests - logical, quantitative & verbal', color: 'from-purple-500 to-indigo-600' },
              { id: 'coding', name: 'Coding Challenge', icon: '💻', desc: 'DSA problems with live code editor', color: 'from-green-500 to-teal-600' },
              { id: 'communication', name: 'Communication Assessment', icon: '💬', desc: 'Voice-based speaking & listening', color: 'from-blue-500 to-cyan-600' },
              { id: 'faceToFace', name: 'AI Interview', icon: '🎥', desc: 'Interactive AI interviewer', color: 'from-orange-500 to-red-600' },
              { id: 'hr', name: 'HR Round', icon: '👥', desc: 'Human interview at office', color: 'from-gray-500 to-slate-600' }
            ].map(round => (
              <div
                key={round.id}
                onClick={() => setInterviewData({ ...interviewData, interview_type: round.id })}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                  interviewData.interview_type === round.id
                    ? `border-blue-500 bg-gradient-to-br ${round.color} text-white shadow-lg`
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{round.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm ${interviewData.interview_type === round.id ? 'text-white' : 'text-gray-900'}`}>
                      {round.name}
                    </h3>
                    <p className={`text-xs mt-1 ${interviewData.interview_type === round.id ? 'text-white/90' : 'text-gray-600'}`}>
                      {round.desc}
                    </p>
                  </div>
                  {interviewData.interview_type === round.id && (
                    <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            All {validCandidateCount} candidates will receive same interview type
          </p>
        </div>

        <div>
          <Label htmlFor="bulk_interview_location">Interview Location</Label>
          <Input
            id="bulk_interview_location"
            type="text"
            placeholder="e.g., Office, Virtual (Zoom), Phone"
            value={interviewData.interview_location}
            onChange={(e) => setInterviewData({ ...interviewData, interview_location: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="bulk_interview_notes">Additional Notes</Label>
          <textarea
            id="bulk_interview_notes"
            rows="3"
            placeholder="Any special instructions or information for all candidates..."
            value={interviewData.interview_notes}
            onChange={(e) => setInterviewData({ ...interviewData, interview_notes: e.target.value })}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Round-Specific Configuration for Bulk */}
        {interviewData.interview_type === 'aptitude' && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Aptitude Test Configuration</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {customQuestions.length > 0 
                ? `✅ ${customQuestions.length} questions configured • Same questions for all ${validCandidateCount} candidates`
                : `Configure MCQ questions with topic-wise difficulty levels for all ${validCandidateCount} candidates`}
            </p>
            <Button
              onClick={() => {
                setCurrentRoundType('aptitude');
                setShowRoundGenerator(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {customQuestions.length > 0 ? 'Edit Aptitude Questions' : 'Generate Aptitude Questions with AI'}
            </Button>
          </div>
        )}

        {interviewData.interview_type === 'coding' && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Coding Challenge Setup</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {customQuestions.length > 0 
                ? `✅ ${customQuestions.length} problems configured • Same for all ${validCandidateCount} candidates`
                : `Generate DSA problems for all ${validCandidateCount} candidates`}
            </p>
            <Button
              onClick={() => {
                setCurrentRoundType('coding');
                setShowRoundGenerator(true);
              }}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {customQuestions.length > 0 ? 'Edit Coding Problems' : 'Generate Coding Problems with AI'}
            </Button>
          </div>
        )}

        {interviewData.interview_type === 'communication' && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Communication Assessment Setup</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {customQuestions.length > 0 
                ? `✅ ${customQuestions.length} challenges configured • Same for all ${validCandidateCount} candidates`
                : `Create voice-based challenges for all ${validCandidateCount} candidates`}
            </p>
            <Button
              onClick={() => {
                setCurrentRoundType('communication');
                setShowRoundGenerator(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {customQuestions.length > 0 ? 'Edit Communication Challenges' : 'Generate Communication Challenges with AI'}
            </Button>
          </div>
        )}

        {interviewData.interview_type === 'faceToFace' && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">AI Interview Questions</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {customQuestions.length > 0 
                ? `✅ ${customQuestions.length} questions • Same AI interview for all ${validCandidateCount} candidates`
                : `Generate interview questions for all ${validCandidateCount} candidates`}
            </p>
            <Button
              onClick={() => {
                setCurrentRoundType('faceToFace');
                setShowRoundGenerator(true);
              }}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {customQuestions.length > 0 ? 'Edit Interview Questions' : 'Generate Interview Questions with AI'}
            </Button>
          </div>
        )}

        {interviewData.interview_type === 'hr' && (
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">HR Round Details</h3>
            </div>
            <p className="text-sm text-gray-600">
              Human-conducted interviews for all {validCandidateCount} candidates. No AI generation needed.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleBulkScheduleInterview}
            className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing {validCandidateCount} Invitations...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Schedule & Send to {validCandidateCount} Candidate(s)
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowBulkInterviewModal(false);
              setInterviewData({
                interview_date: '',
                interview_time: '',
                interview_location: '',
                interview_notes: '',
                interview_type: 'hr'
              });
            }}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </div>
  );
})()}

{/* Custom Questions Modal */}
<CustomQuestionsModal
  isOpen={showCustomQuestionsModal}
  onClose={() => setShowCustomQuestionsModal(false)}
  onSave={(questions) => {
    setCustomQuestions(questions);
    setShowCustomQuestionsModal(false);
  }}
  applicationId={currentApplicationId}
/>

{/* Interview Round Scheduler Modal */}
{showRoundScheduler && selectedApplication && (
  <InterviewRoundScheduler
    selectedApplication={selectedApplication}
    onClose={() => {
      setShowRoundScheduler(false);
      setSelectedApplication(null);
    }}
    onSchedule={handleScheduleRound}
    loading={loading}
  />
)}

{/* Round-Specific Question Generator Modal */}
{showRoundGenerator && (
  <RoundQuestionGenerator
    isOpen={showRoundGenerator}
    onClose={() => setShowRoundGenerator(false)}
    onSave={(questions) => {
      console.log('💾 Saving questions from generator:', {
        count: questions.length,
        questions: questions,
        applicationId: currentApplicationId
      });
      
      // Store questions for THIS specific application
      setQuestionsByApplication(prev => ({
        ...prev,
        [currentApplicationId]: questions
      }));
      
      // Also set to customQuestions for backward compatibility
      setCustomQuestions(questions);
      console.log('✅ Questions saved to state for application:', currentApplicationId);
      setShowRoundGenerator(false);
    }}
    roundType={currentRoundType}
    jobTitle={selectedApplication?.job_title || 'Software Developer'}
    applicationId={currentApplicationId}
  />
)}

</div>
);
};

export default Applications;