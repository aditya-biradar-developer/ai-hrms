import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, Code, CheckCircle, Clock } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';

export default function AIInterviewInterface({ interviewData, onComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState(null);
  
  const videoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const textareaRef = useRef(null);

  useEffect(() => {
    initializeInterview();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (currentQuestion?.code) {
      Prism.highlightAll();
    }
    
    // Focus textarea for write mode questions
    if (currentQuestion?.answer_mode === 'write' && textareaRef.current) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.click();
          console.log('✅ Textarea focused via ref');
        }
      }, 100);
    }
  }, [currentQuestion]);

  const initializeInterview = async () => {
    try {
      // Get camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = stream;
      }

      // Speech recognition will be created fresh for each question
      // This prevents state issues between questions
      console.log('✅ Speech recognition ready (will initialize per question)');

      // Fetch interview questions
      await fetchQuestions();
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing interview:', error);
      alert('Please allow camera and microphone access to continue');
    }
  };

  const fetchQuestions = async () => {
    try {
      // First, check if interview is already completed
      const token = window.location.pathname.split('/').pop();
      console.log('🎫 Interview token:', token);
      
      const interviewResponse = await fetch(`http://localhost:5000/api/applications/interview/${token}`);
      const interviewData = await interviewResponse.json();
      
      if (interviewData.success && interviewData.data?.interview_status === 'completed') {
        console.log('⚠️ Interview already completed!');
        setInterviewCompleted(true);
        setCompletedAt(interviewData.data.interview_completed_at);
        setLoading(false);
        return;
      }
      
      // If not completed, try to fetch custom questions from recruitment team
      console.log('🔍 Checking for custom interview questions...');
      
      const customQuestionsResponse = await fetch(`http://localhost:5000/api/interview-questions/token/${token}`);
      console.log('📡 Custom questions response status:', customQuestionsResponse.status);
      
      const customData = await customQuestionsResponse.json();
      console.log('📦 Custom questions data:', customData);
      console.log('✅ Has custom questions?', customData.has_custom_questions);
      console.log('📊 Questions count:', customData.data?.length);
      
      if (customData.success && customData.has_custom_questions && customData.data && customData.data.length > 0) {
        console.log(`✅ USING ${customData.data.length} CUSTOM QUESTIONS FROM HR TEAM`);
        console.log('📝 Questions:', customData.data);
        
        // Format custom questions for interview
        const formattedQuestions = customData.data.map(q => ({
          text: q.question_text,
          type: q.question_type,
          duration: q.duration || 180,
          code: q.code_snippet || null,
          language: q.code_language || 'javascript',
          answer_mode: q.answer_mode || 'write'  // Default to 'write' (more reliable than voice)
        }));
        
        console.log('✅ Formatted questions:', formattedQuestions);
        
        setQuestions(formattedQuestions);
        const totalDuration = formattedQuestions.reduce((sum, q) => sum + q.duration, 0);
        setTimeLeft(totalDuration);
        console.log('✅ Custom questions loaded successfully!');
        return;
      }
      
      // If no custom questions, generate AI questions
      console.log('📝 No custom questions found, generating AI questions from AI service...');
      const response = await fetch(`http://localhost:5001/api/ai/interview/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: interviewData.job.title,
          interview_type: interviewData.interview_notes?.includes('[AI Interview]') ? 'ai' : 'technical',
          num_questions: 5
        })
      });
      
      const data = await response.json();
      setQuestions(data.data.questions || []);
      setTimeLeft(data.data.estimated_duration * 60); // Convert to seconds
    } catch (error) {
      console.error('Error fetching questions:', error);
      // Fallback questions
      setQuestions([
        { 
          text: 'Tell me about yourself and your experience.',
          type: 'introduction',
          duration: 180
        },
        {
          text: 'Describe a challenging project you worked on.',
          type: 'behavioral',
          duration: 240
        }
      ]);
      setTimeLeft(600); // 10 minutes
    }
  };

  const startInterview = () => {
    setInterviewStarted(true);
    startQuestion(0);
    
    // Start timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startQuestion = async (index) => {
    if (index >= questions.length) {
      endInterview();
      return;
    }

    console.log(`\n📝 Starting Question ${index + 1}/${questions.length}`);
    
    const question = questions[index];
    console.log('🔍 Question Details:', {
      index: index + 1,
      text: question.text.substring(0, 50) + '...',
      answer_mode: question.answer_mode,
      type: question.type,
      duration: question.duration
    });
    
    setCurrentQuestion(question);
    setQuestionIndex(index);
    setTranscript('');
    console.log('✅ State updated - transcript cleared');
    
    // AI speaks the question
    console.log('🗣️ AI speaking question...');
    await speakText(question.text);
    
    // Enable BOTH voice and write - user can use either
    console.log('🎤✍️ Enabling BOTH voice and write modes - use whichever works!');
    setTimeout(() => {
      startRecording();
    }, 1000);
  };

  const speakText = (text) => {
    return new Promise((resolve) => {
      setAiSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => {
        setAiSpeaking(false);
        resolve();
      };
      
      synthRef.current.speak(utterance);
    });
  };

  const createRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('❌ Speech recognition not supported');
      return null;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    let accumulatedTranscript = '';
    
    recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulatedTranscript += transcript + ' ';
        } else {
          interimTranscript = transcript;
        }
      }
      
      setTranscript(accumulatedTranscript + interimTranscript);
    };
    
    recognition.onstart = () => {
      console.log('🎤 Recognition started');
      accumulatedTranscript = '';
      setIsRecording(true);
    };
    
    recognition.onend = () => {
      console.log('🎤 Recognition ended');
      setIsRecording(false);
    };
    
    recognition.onerror = (event) => {
      console.error('🎤 Recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsRecording(false);
      }
    };
    
    return recognition;
  };

  const startRecording = () => {
    try {
      // Stop any existing recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
      
      // Create fresh recognition object
      recognitionRef.current = createRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
        console.log('✅ Started new recognition instance');
      }
    } catch (error) {
      console.error('❌ Error starting recognition:', error);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setIsRecording(false);
        console.log('✅ Stopped and cleared recognition');
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  };

  const nextQuestion = () => {
    // Save current answer
    const answer = {
      question: currentQuestion.text,
      answer: transcript,
      duration: currentQuestion.duration,
      timestamp: new Date().toISOString()
    };
    
    console.log(`💾 Saving answer for Q${questionIndex + 1}: ${transcript.substring(0, 50)}...`);
    
    // Update answers array with current answer
    const updatedAnswers = [...answers, answer];
    setAnswers(updatedAnswers);
    
    // Stop recording completely
    stopRecording();
    
    // Clear transcript
    setTranscript('');
    
    // Check if this is the last question
    if (questionIndex + 1 >= questions.length) {
      console.log('🏁 Last question answered, ending interview...');
      // Pass the updated answers directly to avoid state timing issues
      setTimeout(() => {
        endInterview(updatedAnswers);
      }, 800);
    } else {
      // Move to next question
      setTimeout(() => {
        startQuestion(questionIndex + 1);
      }, 800);
    }
  };

  const endInterview = async (finalAnswers = null) => {
    stopRecording();
    setInterviewStarted(false);
    
    // If finalAnswers not provided and there's a current transcript, save it
    let answersToSubmit = finalAnswers;
    
    if (!finalAnswers) {
      // Check if there's an unsaved answer
      if (transcript && transcript.trim().length > 0 && currentQuestion) {
        console.log('💾 Saving final answer before ending interview...');
        const finalAnswer = {
          question: currentQuestion.text,
          answer: transcript,
          duration: currentQuestion.duration,
          timestamp: new Date().toISOString()
        };
        answersToSubmit = [...answers, finalAnswer];
      } else {
        answersToSubmit = answers;
      }
    }
    
    console.log(`📊 Submitting ${answersToSubmit.length} answers for evaluation`);
    
    // Submit interview results
    try {
      const response = await fetch(`http://localhost:5001/api/ai/interview/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview_token: interviewData.interview_token,
          questions: questions,
          answers: answersToSubmit,
          job_title: interviewData.job.title,
          candidate_name: interviewData.candidate.name
        })
      });
      
      const result = await response.json();
      onComplete(result.data);
    } catch (error) {
      console.error('Error evaluating interview:', error);
      onComplete({ score: 0, feedback: 'Error evaluating interview' });
    }
  };

  const toggleCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getVideoTracks();
      tracks.forEach(track => track.enabled = !track.enabled);
      setIsCameraOn(!isCameraOn);
    }
  };

  const cleanup = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Initializing AI Interview System...</p>
        </div>
      </div>
    );
  }

  // Show "Already Completed" page if interview was already taken
  if (interviewCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <div className="mb-6">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Interview Already Completed</h2>
            <p className="text-gray-600 text-lg mb-6">
              You have already completed this interview.
            </p>
            {completedAt && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <strong>Completed on:</strong> {new Date(completedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">What's Next?</h3>
            <ul className="space-y-2 text-sm text-blue-800 text-left">
              <li>✅ Your interview responses have been recorded</li>
              <li>✅ Our team is reviewing your performance</li>
              <li>✅ You will receive feedback via email</li>
              <li>✅ Please wait for further communication from our HR team</li>
            </ul>
          </div>

          <div className="mt-6">
            <p className="text-gray-500 text-sm">
              If you believe this is an error, please contact our HR team.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Ready to Begin?</h2>
          
          {/* Camera Preview */}
          <div className="mb-6">
            <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                <button
                  onClick={toggleCamera}
                  className={`p-3 rounded-full ${isCameraOn ? 'bg-white' : 'bg-red-500'} shadow-lg`}
                >
                  {isCameraOn ? <Video className="h-5 w-5 text-gray-900" /> : <VideoOff className="h-5 w-5 text-white" />}
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Interview Guidelines:</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ Speak clearly and at a moderate pace</li>
              <li>✅ Listen carefully to each question</li>
              <li>✅ You'll have time to think before answering</li>
              <li>✅ Click "Next Question" when you're done answering</li>
              <li>✅ {questions.length} questions - Approximately {Math.ceil(timeLeft / 60)} minutes</li>
            </ul>
          </div>

          <button
            onClick={startInterview}
            className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 transition-colors"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    {/* FLOATING TEXTAREA - WORKS FOR ALL QUESTIONS (HYBRID MODE) */}
    {currentQuestion && interviewStarted && (
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 999999,
          width: '90%',
          maxWidth: '800px',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'auto'
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
            Question {questionIndex + 1}/{questions.length}
          </h3>
          <p style={{ fontSize: '16px', color: '#374151', lineHeight: '1.6' }}>
            {currentQuestion.text}
          </p>
        </div>
        
        {currentQuestion?.code && (
          <div style={{ 
            backgroundColor: '#1f2937', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            overflow: 'auto'
          }}>
            <code style={{ color: '#e5e7eb', fontSize: '14px' }}>
              {currentQuestion.code}
            </code>
          </div>
        )}
        
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            {isRecording ? '🎤 Speaking (Voice Recognition Active)' : '✍️ Type OR Speak Your Answer:'}
          </label>
          <textarea
            ref={textareaRef}
            value={transcript}
            onChange={(e) => {
              console.log('✍️ FLOATING TEXTAREA onChange:', e.target.value);
              setTranscript(e.target.value);
            }}
            placeholder="Type your answer OR speak (voice recognition is active)..."
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '12px',
              fontSize: '16px',
              border: isRecording ? '2px solid #ef4444' : '2px solid #d1d5db',
              borderRadius: '8px',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              backgroundColor: isRecording ? '#fef2f2' : 'white'
            }}
            autoFocus
          />
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>💡 Timer: {formatTime(timeLeft)} | Characters: {transcript.length}</span>
            {isRecording && (
              <span style={{ color: '#ef4444', fontWeight: '600', animation: 'pulse 1s infinite' }}>
                ● Recording...
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={nextQuestion}
          disabled={!transcript}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '12px 24px',
            backgroundColor: transcript ? '#3b82f6' : '#9ca3af',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            borderRadius: '8px',
            border: 'none',
            cursor: transcript ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
        >
          {questionIndex + 1 === questions.length ? 'Submit Interview' : 'Next Question →'}
        </button>
      </div>
    )}
    
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-900">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)',
          animation: 'pulse 8s ease-in-out infinite'
        }} />
      </div>
      <style>{`
        .mirror { transform: scaleX(-1); }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* Top Bar - Zoom Style */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 px-3 py-1 rounded text-white text-sm font-semibold animate-pulse">
              ● REC
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">{interviewData.job.title}</h2>
              <p className="text-gray-300 text-sm">AI Interview Session</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2">
              <Clock className="h-4 w-4 text-white" />
              <span className="text-white font-mono">{formatTime(timeLeft)}</span>
            </div>
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
              <span className="text-white text-sm">Q {questionIndex + 1}/{questions.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question Overlay Panel - Center */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-4xl px-6">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          {/* AI Interviewer Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center ${
                aiSpeaking ? 'ring-4 ring-white/50 animate-pulse' : ''
              }`}>
                <Volume2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">AI Interviewer</h3>
                <p className="text-indigo-100 text-sm">{aiSpeaking ? '🎤 Speaking...' : '👂 Listening to your answer'}</p>
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {questionIndex + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {currentQuestion?.type && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold uppercase">
                      {currentQuestion.type}
                    </span>
                  )}
                </div>
                <h3 className="text-gray-900 text-xl font-semibold leading-relaxed">
                  {currentQuestion?.text}
                </h3>
              </div>
            </div>

            {/* Code Display */}
            {currentQuestion?.code && (
              <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                  <Code className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300 text-sm font-semibold">Code Snippet</span>
                </div>
                <pre className="bg-gray-900 p-4 overflow-x-auto">
                  <code className={`language-${currentQuestion.language || 'javascript'}`}>
                    {currentQuestion.code}
                  </code>
                </pre>
              </div>
            )}

            {/* Answer Input Area */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              {currentQuestion?.answer_mode === 'write' ? (
                /* Write Mode - Text Input */
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <h4 className="text-gray-700 font-semibold text-sm">✍️ Your Answer (Type Below)</h4>
                    <span className="text-xs text-gray-500 ml-2">
                      Q{questionIndex + 1} | Mode: {currentQuestion?.answer_mode}
                    </span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    key={`textarea-${questionIndex}`}
                    value={transcript}
                    onChange={(e) => {
                      console.log(`✍️ Textarea onChange - Q${questionIndex + 1}:`, e.target.value);
                      setTranscript(e.target.value);
                    }}
                    onFocus={() => console.log(`✅ Textarea focused - Q${questionIndex + 1}`)}
                    onMouseDown={(e) => {
                      console.log('🖱️ Textarea mouseDown');
                      e.currentTarget.focus();
                    }}
                    onClick={(e) => {
                      console.log('🖱️ Textarea clicked');
                      e.currentTarget.focus();
                    }}
                    placeholder="Type your answer here..."
                    className="w-full bg-white rounded-lg p-4 min-h-[150px] border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-800"
                    style={{ cursor: 'text', userSelect: 'text' }}
                    rows={6}
                    autoFocus
                    readOnly={false}
                    disabled={false}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      💡 For code output questions, type the exact output (e.g., "hello", "10", etc.)
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔧 Test button clicked');
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                          textareaRef.current.click();
                          console.log('🔧 Forced focus on textarea');
                        }
                      }}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      🔧 Test Click
                    </button>
                  </div>
                </div>
              ) : (
                /* Voice Mode - Live Transcription */
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${
                      isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                    }`} />
                    <h4 className="text-gray-700 font-semibold text-sm">🎤 Your Answer (Live Transcription)</h4>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[120px] border border-gray-200">
                    <p className="text-gray-800 leading-relaxed">
                      {transcript || <span className="text-gray-400 italic">Start speaking your answer...</span>}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Self View - Picture in Picture (Bottom Right) */}
      <div className="absolute bottom-28 right-6 z-30 w-80">
        <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-4 border-indigo-500/50">
          <div className="relative aspect-video bg-black">
            <video 
              ref={pipVideoRef} 
              autoPlay 
              muted 
              playsInline
              className="w-full h-full object-cover mirror"
            />
            <div className="absolute top-2 left-2 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 rounded-lg text-white text-sm font-semibold">
              You
            </div>
            <div className="absolute bottom-2 right-2">
              <button
                onClick={toggleCamera}
                className={`p-2 rounded-lg transition-all ${
                  isCameraOn 
                    ? 'bg-white/10 hover:bg-white/20 backdrop-blur' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isCameraOn ? <Video className="h-4 w-4 text-white" /> : <VideoOff className="h-4 w-4 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator - Top Left */}
      <div className="absolute top-24 left-6 z-30 bg-black/80 backdrop-blur-lg rounded-xl p-4 w-64">
        <h3 className="text-white font-semibold text-sm mb-3">Interview Progress</h3>
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                idx < questionIndex ? 'bg-green-500 text-white' :
                idx === questionIndex ? 'bg-indigo-600 text-white ring-2 ring-white/50' :
                'bg-gray-700 text-gray-400'
              }`}>
                {idx < questionIndex ? '✓' : idx + 1}
              </div>
              <span className={`text-sm transition-all ${
                idx === questionIndex ? 'text-white font-semibold' : 'text-gray-400'
              }`}>
                {q.type || 'Question'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Control Bar - Zoom Style */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="bg-gradient-to-t from-black/90 to-transparent px-6 py-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleCamera}
                className={`p-4 rounded-xl transition-all ${
                  isCameraOn 
                    ? 'bg-white/10 hover:bg-white/20 backdrop-blur' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isCameraOn ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}
              </button>
              <button
                className={`p-4 rounded-xl transition-all ${
                  isRecording 
                    ? 'bg-white/10 hover:bg-white/20 backdrop-blur' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isRecording ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}
              </button>
            </div>

            {/* Center Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={nextQuestion}
                disabled={!transcript}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 disabled:hover:scale-100"
              >
                <CheckCircle className="h-5 w-5" />
                Next Question
              </button>
            </div>

            {/* Right Controls */}
            <div>
              <button
                onClick={endInterview}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-xl font-semibold transition-all"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
