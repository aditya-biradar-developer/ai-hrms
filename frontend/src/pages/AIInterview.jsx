import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Video, AlertCircle, CheckCircle, Trophy } from 'lucide-react';
import axios from 'axios';
import GPTStyleAIInterview from '../components/GPTStyleAIInterview';
import AptitudeAssessment from '../components/assessments/AptitudeAssessment';
import CodingChallenge from '../components/assessments/CodingChallenge';
import CommunicationAssessment from '../components/assessments/CommunicationAssessment';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AIInterview() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interviewData, setInterviewData] = useState(null);
  const [timeUntilInterview, setTimeUntilInterview] = useState(null);
  const [canStart, setCanStart] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [interviewResults, setInterviewResults] = useState(null);

  useEffect(() => {
    fetchInterviewDetails();
  }, [token]);

  useEffect(() => {
    if (interviewData) {
      // Call immediately first
      updateCountdown();
      
      // Then set up interval
      const timer = setInterval(() => {
        updateCountdown();
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [interviewData]);

  const fetchInterviewDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/applications/interview/${token}`);
      console.log('📦 Full interview data response:', response.data);
      console.log('📦 Interview data object:', response.data.data);
      
      // Check if interview is already completed
      if (response.data.data?.interview_status === 'completed') {
        console.log('⚠️ Interview already completed!');
        setInterviewCompleted(true);
        setInterviewData(response.data.data);
        setLoading(false);
        return;
      }
      
      setInterviewData(response.data.data);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching interview:', err);
      setError(err.response?.data?.message || 'Invalid or expired interview link');
      setLoading(false);
    }
  };

  const updateCountdown = () => {
    if (!interviewData) return;

    const { interview_date, interview_time } = interviewData;
    
    // Debug: Log raw values
    console.log('📅 Raw interview_date:', interview_date);
    console.log('🕐 Raw interview_time:', interview_time);
    
    // Parse the date and time properly
    if (!interview_time) {
      console.error('❌ No interview_time provided');
      return;
    }
    
    // Extract only the date part (YYYY-MM-DD) from interview_date
    // interview_date might be "2025-10-19" or "2025-10-19T00:00:00"
    let datePart = interview_date;
    if (interview_date.includes('T')) {
      datePart = interview_date.split('T')[0]; // Get only "2025-10-19"
    }
    
    // Ensure time has seconds
    let timeStr = interview_time;
    if (timeStr.length === 5) {
      timeStr = `${timeStr}:00`;
    }
    
    // Create date string in ISO format
    const dateTimeStr = `${datePart}T${timeStr}`;
    console.log('📝 Parsing datetime string:', dateTimeStr);
    
    const interviewDateTime = new Date(dateTimeStr);
    
    // Check if date is valid
    if (isNaN(interviewDateTime.getTime())) {
      console.error('❌ Invalid date created from:', dateTimeStr);
      console.error('❌ interview_date:', interview_date);
      console.error('❌ interview_time:', interview_time);
      return;
    }
    
    const now = new Date();
    const diff = interviewDateTime - now;

    // Allow joining 5 minutes before scheduled time
    const allowJoinTime = new Date(interviewDateTime.getTime() - 5 * 60 * 1000);

    // Debug logging
    console.log('🕐 Interview Time:', interviewDateTime.toLocaleString());
    console.log('🕐 Current Time:', now.toLocaleString());
    console.log('🕐 Can Join After:', allowJoinTime.toLocaleString());
    console.log('🕐 Time Difference (ms):', diff);
    console.log('🕐 Can Start:', now >= allowJoinTime);

    if (now >= allowJoinTime) {
      setCanStart(true);
      setTimeUntilInterview(null);
    } else {
      setCanStart(false);
      setTimeUntilInterview(diff);
    }
  };

  const formatTimeRemaining = (ms) => {
    if (ms <= 0) return 'Interview time!';

    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  const startInterview = () => {
    setInterviewStarted(true);
  };

  const handleInterviewComplete = async (results) => {
    try {
      console.log('🔥 ===== FRONTEND ASSESSMENT COMPLETION =====');
      console.log('🔍 Assessment results received:', results);
      console.log('📋 Interview data:', {
        id: interviewData.id,
        interview_notes: interviewData.interview_notes,
        custom_questions: interviewData.custom_questions?.length || 0
      });
      
      // Determine assessment type from results or interview notes
      let assessmentType = results.assessment_type;
      
      // If no explicit assessment_type, detect from answers structure
      if (!assessmentType) {
        const answerKeys = Object.keys(results.answers || {});
        const hasReadingAnswers = answerKeys.some(key => key.startsWith('Reading_'));
        const hasListeningAnswers = answerKeys.some(key => key.startsWith('Listening_'));
        const hasGrammarAnswers = answerKeys.some(key => key.startsWith('Grammar_'));
        
        if (hasReadingAnswers || hasListeningAnswers || hasGrammarAnswers) {
          assessmentType = 'communication';
        } else if (interviewData.interview_notes?.includes('[COMMUNICATION Interview]')) {
          assessmentType = 'communication';
        } else if (interviewData.interview_notes?.includes('[CODING Interview]')) {
          assessmentType = 'coding';
        } else if (interviewData.interview_notes?.includes('[APTITUDE Interview]')) {
          assessmentType = 'aptitude';
        } else {
          assessmentType = 'aptitude'; // default fallback
        }
      }
      
      console.log('🎯 Assessment type detected:', assessmentType);
      console.log('🔍 Type detection logic:', {
        'results.assessment_type': results.assessment_type,
        'has_COMMUNICATION': interviewData.interview_notes?.includes('[COMMUNICATION Interview]'),
        'has_CODING': interviewData.interview_notes?.includes('[CODING Interview]'),
        'has_APTITUDE': interviewData.interview_notes?.includes('[APTITUDE Interview]'),
        'interview_notes': interviewData.interview_notes
      });
      
      let assessmentData;
      
      if (assessmentType === 'communication') {
        // Communication assessment - use the score calculated by the component
        assessmentData = {
          score: results.score || 0,
          total_questions: results.total_questions || 0,
          time_taken: results.time_taken || 0,
          answers: results.answers || {},
          sections_scores: results.sections_scores || {},
          completed_at: results.completed_at || new Date().toISOString(),
          assessment_type: 'communication'
        };
        console.log('📊 Communication assessment data:', assessmentData);
      } else {
        // Aptitude/Coding assessment - calculate MCQ score
        const totalQuestions = results.total_questions || 0;
        console.log('📊 Total questions:', totalQuestions);
        console.log('📝 Answers received:', results.answers);
        
        let correctAnswers = 0;
        
        // Check each answer against the correct answer
        Object.entries(results.answers || {}).forEach(([questionKey, answerData]) => {
          // Extract the actual answer from the answer object
          const userAnswer = typeof answerData === 'object' ? answerData.answer : answerData;
          console.log(`🔍 Checking question ${questionKey}: user answered "${userAnswer}"`);
          console.log(`📋 Answer data:`, answerData);
          
          // Try to find the question by ID first, then by index
          let question = interviewData.custom_questions?.find(q => q.id === questionKey);
          if (!question) {
            // If not found by ID, try by index
            const questionIndex = parseInt(questionKey);
            question = interviewData.custom_questions?.[questionIndex];
          }
          
          if (question) {
            console.log(`✅ Found question: "${question.question}"`);
            console.log(`🎯 Correct answer: "${question.correct_answer}", User answer: "${userAnswer}"`);
            
            // Check if answer is correct - handle both option letters and values
            let isCorrect = false;
            
            if (question.correct_answer === userAnswer) {
              // Direct match (e.g., "B" === "B")
              isCorrect = true;
            } else if (question.options && question.options[question.correct_answer] === userAnswer) {
              // Match option value (e.g., correct_answer="A" and userAnswer="$13.50" and options.A="$13.50")
              isCorrect = true;
            } else if (question.options && question.options[userAnswer] === question.options[question.correct_answer]) {
              // Match option values (e.g., both resolve to same value)
              isCorrect = true;
            }
            
            if (isCorrect) {
              correctAnswers++;
              console.log('✅ Answer is CORRECT!');
            } else {
              console.log('❌ Answer is WRONG');
              console.log(`🔍 Available options:`, question.options);
            }
          } else {
            console.log(`❌ Question not found for key: ${questionKey}`);
          }
        });
        
        console.log(`📈 Final score calculation: ${correctAnswers} / ${totalQuestions} = ${correctAnswers / totalQuestions * 100}%`);
        const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        
        assessmentData = {
          score: score,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          time_taken: results.time_taken || 0,
          answers: results.answers || {},
          completed_at: results.completed_at || new Date().toISOString(),
          assessment_type: assessmentType
        };
      }

      console.log('📤 Sending assessment data to backend:', assessmentData);

      const response = await axios.post(`${API_URL}/applications/${interviewData.id}/complete-assessment`, assessmentData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setInterviewResults({ ...results, score: assessmentData.score });
        setInterviewCompleted(true);
        setInterviewStarted(false);
      } else {
        throw new Error('Failed to save assessment results');
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('Failed to save assessment results. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Check if assessment is already completed (prevent retakes)
  const isAssessmentCompleted = interviewData?.interview_status === 'completed' && 
    interviewData?.interview_results && 
    (() => {
      try {
        const results = JSON.parse(interviewData.interview_results);
        return results.score !== undefined;
      } catch (e) {
        return false;
      }
    })();
  
  if (interviewCompleted || isAssessmentCompleted) {
    // Check if this is a previously completed interview (has interview_status)
    const isPreviouslyCompleted = interviewData?.interview_status === 'completed';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-2xl p-12 text-center">
            <div className="inline-block bg-green-100 rounded-full p-6 mb-6">
              <CheckCircle className="h-20 w-20 text-green-600" />
            </div>
            
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {isPreviouslyCompleted ? 'Interview Already Completed' : 'Response Submitted Successfully!'}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              {isPreviouslyCompleted 
                ? 'You have already completed this interview.' 
                : 'Thank you for completing the AI interview. Your responses have been recorded.'}
            </p>
            
            {isPreviouslyCompleted && interviewData?.interview_completed_at && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <strong>Completed on:</strong> {new Date(interviewData.interview_completed_at).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-2">What's Next?</h3>
              {isPreviouslyCompleted ? (
                <ul className="space-y-2 text-sm text-gray-700 text-left">
                  <li>✅ Your interview responses have been recorded</li>
                  <li>✅ Our team is reviewing your performance</li>
                  <li>✅ You will receive feedback via email</li>
                  <li>✅ Please wait for further communication from our HR team</li>
                </ul>
              ) : (
                <p className="text-gray-700">
                  Our HR team will carefully review your interview responses and get back to you within <strong>2-3 business days</strong>.
                </p>
              )}
            </div>

            {!isPreviouslyCompleted && (
              <div className="bg-yellow-50 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center justify-center gap-2">
                  <span>📧</span> Check Your Email
                </h3>
                <p className="text-gray-700 text-sm">
                  You will receive an email notification with the next steps in the recruitment process.
                </p>
              </div>
            )}
            
            {isPreviouslyCompleted && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
                <p className="text-sm text-gray-600">
                  If you believe this is an error, please contact our HR team.
                </p>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (interviewStarted) {
    const interviewType = interviewData?.interview_type || interviewData?.interview_notes?.match(/\[(.*?) Interview\]/)?.[1]?.toLowerCase();
    
    // Prepare assessment data with questions mapped correctly
    const assessmentData = {
      ...interviewData,
      questions: interviewData.custom_questions || []
    };
    
    // Route to appropriate assessment component
    if (interviewType === 'aptitude') {
      return <AptitudeAssessment 
        assessmentData={assessmentData} 
        onComplete={handleInterviewComplete} 
        onSubmit={handleInterviewComplete}
        candidateName={interviewData.candidate?.name} 
      />;
    } else if (interviewType === 'coding') {
      return <CodingChallenge assessmentData={assessmentData} onComplete={handleInterviewComplete} candidateName={interviewData.candidate?.name} />;
    } else if (interviewType === 'communication') {
      // Use dedicated Communication Assessment component
      return <CommunicationAssessment 
        assessmentData={assessmentData} 
        onComplete={handleInterviewComplete} 
        candidateName={interviewData.candidate?.name} 
      />;
    } else {
      // Default to AI Interview (faceToFace or ai type)
      return <GPTStyleAIInterview interviewData={interviewData} onComplete={handleInterviewComplete} />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white rounded-full p-4 shadow-lg mb-4">
            <Video className="h-12 w-12 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Interview</h1>
          <p className="text-xl text-gray-600">{interviewData.job.title}</p>
          <p className="text-gray-500">{interviewData.job.department}</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-6">
          {/* Interview Details */}
          <div className="border-b pb-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Interview Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-lg font-medium text-gray-900">
                  {new Date(interviewData.interview_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="text-lg font-medium text-gray-900">{interviewData.interview_time}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-lg font-medium text-gray-900">{interviewData.interview_location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Interview Type</p>
                <p className="text-lg font-medium text-gray-900">
                  {interviewData.interview_notes?.includes('[AI Interview]') ? 'AI Interview' : 'Standard Interview'}
                </p>
              </div>
            </div>
          </div>

          {/* Countdown or Start Button */}
          {!canStart ? (
            <div className="text-center py-8">
              <Clock className="h-16 w-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Interview Starts In</h3>
              <div className="text-5xl font-bold text-indigo-600 mb-4">
                {timeUntilInterview ? formatTimeRemaining(timeUntilInterview) : 'Calculating...'}
              </div>
              <p className="text-gray-600 mb-2">You can join 5 minutes before the scheduled time</p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Make sure you have a stable internet connection and are in a quiet environment
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start!</h3>
              <p className="text-gray-600 mb-6">Your interview is ready. Click below to begin.</p>
              <button
                onClick={startInterview}
                className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Start Interview Now
              </button>
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Ready?</strong> The interview will take approximately 30-45 minutes
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Preparation Tips */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Before You Start</h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Ensure you have a stable internet connection</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Find a quiet place with good lighting</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Have your resume and portfolio ready for reference</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Test your camera and microphone</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Keep a notepad and pen handy</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
