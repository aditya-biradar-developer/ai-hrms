import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX, User, Bot, MessageCircle, Clock, CheckCircle, Play, Pause, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function GPTStyleAIInterview({ interviewData, onComplete }) {
  // Core states
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Conversation states
  const [conversation, setConversation] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('greeting'); // greeting, questions, closing
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [candidateName, setCandidateName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  
  // AI states
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  
  // Speech states
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const chatContainerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    initializeInterview();
    return () => cleanup();
  }, []);

  useEffect(() => {
    // Auto-scroll chat to bottom
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  const initializeInterview = async () => {
    try {
      console.log('🎬 Initializing GPT-style AI Interview...');
      console.log('📋 Current state:', { loading, currentPhase, questions: questions.length });
      
      // Get camera and microphone
      console.log('🎥 Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, 
        audio: true 
      });
      console.log('✅ Media access granted');
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(console.error);
        };
      }

      // Setup speech recognition
      console.log('🎤 Setting up speech recognition...');
      setupSpeechRecognition();
      
      // Add small delay to ensure database transactions are committed
      console.log('⏳ Waiting for database sync...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Load interview data
      console.log('📋 Loading interview data...');
      await loadInterviewData();
      
      console.log('✅ Interview data loaded, questions:', questions.length);
      setLoading(false);
      
      // Start interview after a brief moment
      console.log('🚀 Starting interview in 1.5 seconds...');
      setTimeout(() => {
        console.log('🎯 Calling startInterviewSession...');
        startInterviewSession();
      }, 1500);

    } catch (error) {
      console.error('❌ Error initializing interview:', error);
      console.error('❌ Error details:', error.message, error.stack);
      setLoading(false);
    }
  };

  const setupSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript + interimTranscript;
        setTranscript(fullTranscript);

        // Handle silence detection for auto-submit
        if (finalTranscript && waitingForResponse) {
          handleSilenceDetection(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('🎤 Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        console.log('🎤 Speech recognition ended');
        setIsListening(false);
        
        if (waitingForResponse && !interviewCompleted && !aiThinking) {
          // Restart recognition automatically after a short delay
          setTimeout(() => {
            if (recognitionRef.current && waitingForResponse && !isListening) {
              try {
                console.log('🔄 Restarting speech recognition...');
                setIsListening(true);
                recognitionRef.current.start();
              } catch (e) {
                console.log('⚠️ Recognition restart failed:', e);
                setIsListening(false);
              }
            }
          }, 500);
        }
      };
    }
  };

  const loadInterviewData = async () => {
    try {
      // Validate token first
      const token = interviewData?.token || interviewData?.interview_token;
      if (!token) {
        console.error('❌ No interview token provided');
        console.log('🔍 interviewData received:', interviewData);
        throw new Error('Invalid interview token');
      }
      
      console.log('📋 Loading interview data for token:', token.substring(0, 10) + '...');
      
      // Get interview details with timeout and cache-busting
      const cacheBuster = Date.now();
      const response = await axios.get(
        `http://localhost:5000/api/applications/interview/${token}?t=${cacheBuster}`,
        { timeout: 10000 }
      );
      
      console.log('📦 Interview API response:', response.data);
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setCandidateName(data.candidate?.name || 'Candidate');
        setJobTitle(data.job?.title || 'Position');
        
        console.log('👤 Candidate:', data.candidate?.name);
        console.log('💼 Job:', data.job?.title);
        console.log('🔍 Raw custom_questions:', data.custom_questions);
        console.log('🔍 Is array?', Array.isArray(data.custom_questions));
        console.log('🔍 Length:', data.custom_questions?.length);
        
        // Try to get custom questions - NO FALLBACK
        if (data.custom_questions && Array.isArray(data.custom_questions) && data.custom_questions.length > 0) {
          console.log('✅ Found custom questions:', data.custom_questions.length);
          console.log('📋 Custom questions data:', JSON.stringify(data.custom_questions, null, 2));
          
          const formattedQuestions = data.custom_questions.map((q, index) => ({
            id: q.id || index + 1,
            text: q.question_text || q.text,
            type: q.question_type || q.type || 'general',
            duration: q.duration || 180,
            code_snippet: q.code_snippet,
            expected_answer: q.expected_answer
          }));
          
          console.log('🔧 Formatted questions:', JSON.stringify(formattedQuestions, null, 2));
          setQuestions(formattedQuestions);
          
          console.log('✅ Questions successfully set in state');
        } else {
          console.error('❌ No custom questions found in database!');
          console.log('🔍 Custom questions data received:', data.custom_questions);
          console.log('🔍 Type of custom_questions:', typeof data.custom_questions);
          console.log('🔍 Full data object:', JSON.stringify(data, null, 2));
          throw new Error('No interview questions available. Please contact HR to set up questions for this interview.');
        }
      } else {
        console.error('❌ Invalid API response:', response.data);
        throw new Error('Invalid interview data received');
      }
    } catch (error) {
      console.error('❌ Error loading interview data:', error.message);
      
      // Set error state instead of fallback questions
      setLoading(false);
      
      // Show user-friendly error message
      const errorMessage = error.message.includes('questions') 
        ? error.message 
        : error.message.includes('token')
        ? 'Interview link may be invalid or expired. Please contact HR for a new link.'
        : 'Failed to load interview data. Please try again or contact HR.';
      
      // Set error state to show error UI
      setInterviewCompleted(true);
      setConversation([{
        id: Date.now(),
        type: 'error',
        message: errorMessage,
        timestamp: new Date()
      }]);
      
      return; // Exit early, don't continue with interview
    }
  };

  const getDefaultQuestions = (jobTitle) => [
    {
      id: 1,
      text: `Could you please introduce yourself and tell me about your background relevant to ${jobTitle}?`,
      type: 'introduction',
      duration: 120
    },
    {
      id: 2,
      text: `What interests you most about this ${jobTitle} role and our company?`,
      type: 'motivation',
      duration: 90
    },
    {
      id: 3,
      text: `Can you walk me through a challenging project or situation you've handled recently?`,
      type: 'behavioral',
      duration: 180
    },
    {
      id: 4,
      text: `What do you consider your greatest strengths, and how do they apply to this role?`,
      type: 'strengths',
      duration: 120
    },
    {
      id: 5,
      text: `Where do you see yourself in the next 3-5 years, and how does this role fit into your career goals?`,
      type: 'career',
      duration: 120
    },
    {
      id: 6,
      text: `Do you have any questions for me about the role, team, or company?`,
      type: 'questions',
      duration: 90
    }
  ];

  const addAIMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      type: 'ai',
      message,
      timestamp: new Date(),
      phase: currentPhase
    };
    
    setConversation(prev => [...prev, newMessage]);
    return newMessage;
  };

  const addUserMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      type: 'user',
      message: message.trim(),
      timestamp: new Date(),
      phase: currentPhase,
      questionId: questions[questionIndex]?.id
    };
    
    setConversation(prev => [...prev, newMessage]);
    return newMessage;
  };

  const startInterviewSession = () => {
    console.log('🚀 Starting interview session...');
    console.log('📊 Current state:', { 
      currentPhase, 
      candidateName, 
      jobTitle, 
      questionsCount: questions.length,
      loading,
      interviewCompleted 
    });
    
    // Prevent duplicate starts
    if (currentPhase !== 'waiting') {
      console.log('⚠️ Interview already started, skipping duplicate start. Current phase:', currentPhase);
      return;
    }
    
    console.log('✅ Setting phase to greeting...');
    setCurrentPhase('greeting');
    
    // Start with greeting
    const greeting = `Hello ${candidateName}! Welcome to your interview for the ${jobTitle} position. I'm your AI interviewer today, and I'm excited to learn more about you and your experience. How are you doing today?`;
    
    console.log('💬 Adding AI greeting message:', greeting);
    addAIMessage(greeting);
    
    console.log('🔊 Speaking greeting message...');
    speakMessage(greeting);
    
    // Start listening for response after AI finishes speaking
    setTimeout(() => {
      console.log('⏰ Timeout reached, checking if should start listening...');
      console.log('📊 Current phase check:', currentPhase);
      if (currentPhase === 'greeting') {
        console.log('🎤 Starting to listen for response...');
        setWaitingForResponse(true);
        startListening();
      } else {
        console.log('⚠️ Phase changed, not starting listening. Current phase:', currentPhase);
      }
    }, 6000); // Longer delay to ensure AI finishes speaking
  };

  const handleSilenceDetection = (finalTranscript) => {
    // Clear existing timer
    if (silenceTimer) {
      clearTimeout(silenceTimer);
    }
    
    // Set new timer for silence detection
    const timer = setTimeout(() => {
      if (waitingForResponse && finalTranscript.trim().length > 5) {
        console.log('🤖 Auto-submitting after silence:', finalTranscript);
        processUserResponse(finalTranscript);
      }
    }, 2500); // 2.5 seconds of silence
    
    setSilenceTimer(timer);
  };

  const processUserResponse = (responseText) => {
    if (!responseText.trim() || !waitingForResponse) return;
    
    console.log('📝 Processing user response:', responseText);
    
    // Clear silence timer
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }
    
    // Add user message
    addUserMessage(responseText);
    setTranscript('');
    setWaitingForResponse(false);
    stopListening();
    
    // Process based on current phase
    setTimeout(() => {
      handleAIResponse();
    }, 1000);
  };

  const handleAIResponse = () => {
    // Prevent duplicate responses
    if (aiThinking) {
      console.log('⚠️ AI already thinking, skipping duplicate response');
      return;
    }
    
    setAiThinking(true);
    
    setTimeout(() => {
      setAiThinking(false);
      
      if (currentPhase === 'greeting') {
        // Move to questions phase and start with first question
        setCurrentPhase('questions');
        const transition = "Great! Thank you for that. Now, let's dive into some questions about your background and experience.";
        addAIMessage(transition);
        speakMessage(transition);
        
        setTimeout(() => {
          // Start with first question (index 0)
          console.log('🚀 Starting questions phase with question index 0');
          askNextQuestion();
        }, 4000); // Increased delay
        
      } else if (currentPhase === 'questions') {
        // Acknowledge current answer and move to next question
        const acknowledgments = [
          "Thank you for sharing that detailed response.",
          "That's very insightful, I appreciate the explanation.",
          "Excellent, that gives me a good understanding.",
          "Great example, thank you for walking me through that.",
          "Perfect, that's exactly the kind of insight I was looking for.",
          "Thank you, that's a very thoughtful answer."
        ];
        
        const ack = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
        addAIMessage(ack);
        speakMessage(ack);
        
        setTimeout(() => {
          // Move to next question
          const nextIndex = questionIndex + 1;
          console.log(`➡️ Moving from question ${questionIndex + 1} to question ${nextIndex + 1}`);
          setQuestionIndex(nextIndex);
          
          // Ask next question after state update
          setTimeout(() => {
            askNextQuestion();
          }, 500); // Reduced inner delay
        }, 4000); // Increased acknowledgment delay
        
      } else if (currentPhase === 'closing') {
        // Final acknowledgment and wrap up
        completeInterview();
      }
    }, 2000); // Increased AI thinking time
  };

  const askNextQuestion = () => {
    console.log(`🔄 askNextQuestion called - questionIndex: ${questionIndex}, total questions: ${questions.length}`);
    
    if (questionIndex >= questions.length) {
      // Move to closing phase
      setCurrentPhase('closing');
      const closing = `Thank you for all those wonderful answers, ${candidateName}. That concludes our interview questions. It's been a pleasure speaking with you today. Your responses have been recorded and will be reviewed by our team. We'll be in touch soon with next steps. Have a great day!`;
      
      addAIMessage(closing);
      speakMessage(closing);
      
      setTimeout(() => {
        completeInterview();
      }, 8000);
      
      return;
    }

    const question = questions[questionIndex];
    if (!question) {
      console.error('❌ No question found at index:', questionIndex);
      completeInterview();
      return;
    }

    // For first question after greeting, don't add "Now," prefix
    const questionText = currentPhase === 'greeting' ? question.text : `Now, ${question.text}`;
    
    console.log(`❓ Asking question ${questionIndex + 1} of ${questions.length}:`, question.text);
    
    addAIMessage(questionText);
    speakMessage(questionText);
    
    // Start listening for response after AI finishes speaking
    setTimeout(() => {
      if (!waitingForResponse && !aiThinking) {
        setWaitingForResponse(true);
        startListening();
      }
    }, 5000); // Increased delay to let AI finish speaking
  };

  const completeInterview = () => {
    console.log('✅ Interview completed');
    setInterviewCompleted(true);
    setWaitingForResponse(false);
    stopListening();
    
    // Save results
    setTimeout(() => {
      saveInterviewResults();
    }, 2000);
  };

  const saveInterviewResults = async () => {
    try {
      const token = interviewData?.token || interviewData?.interview_token;
      if (!token) {
        console.error('❌ No token available for saving results');
        return;
      }

      const answers = conversation
        .filter(msg => msg.type === 'user' && msg.questionId)
        .map(msg => ({
          question_id: msg.questionId,
          answer: msg.message,
          timestamp: msg.timestamp
        }));

      console.log('💾 Saving interview results:', answers.length, 'answers');

      const response = await axios.post(
        `http://localhost:5000/api/applications/interview/${token}/complete`, 
        {
          answers,
          completed_at: new Date().toISOString()
        },
        { timeout: 10000 }
      );

      if (response.data.success) {
        console.log('✅ Interview results saved successfully');
      } else {
        console.error('❌ Failed to save results:', response.data.message);
      }
      
      onComplete?.();
    } catch (error) {
      console.error('❌ Error saving interview results:', error.message);
      // Still call onComplete to allow user to exit
      onComplete?.();
    }
  };

  const speakMessage = (message) => {
    console.log('🔊 speakMessage called with:', message.substring(0, 50) + '...');
    
    if (!synthRef.current) {
      console.error('❌ Speech synthesis not available');
      return;
    }
    
    // Stop any current speech
    if (synthRef.current.speaking) {
      console.log('⏹️ Stopping current speech...');
      synthRef.current.cancel();
    }
    
    console.log('🎤 Setting AI speaking to true...');
    setAiSpeaking(true);
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    utterance.onstart = () => {
      console.log('🔊 Speech started');
    };
    
    utterance.onend = () => {
      console.log('✅ Speech ended');
      setAiSpeaking(false);
    };
    
    utterance.onerror = (error) => {
      console.error('❌ Speech error:', error);
      setAiSpeaking(false);
    };
    
    console.log('🎵 Starting speech synthesis...');
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!recognition || isListening || aiThinking) {
      console.log('⚠️ Cannot start listening:', { 
        hasRecognition: !!recognition, 
        isListening, 
        aiThinking 
      });
      return;
    }
    
    try {
      console.log('🎤 Starting speech recognition...');
      setIsListening(true);
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
      
      // Try to restart after a delay if it failed
      setTimeout(() => {
        if (!isListening && !aiThinking) {
          startListening();
        }
      }, 2000);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsRecording(false);
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      synthRef.current.cancel();
      setAiSpeaking(false);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimer) {
      clearTimeout(silenceTimer);
    }
    synthRef.current.cancel();
  };

  useEffect(() => {
    console.log('🎬 GPTStyleAIInterview component mounted');
    console.log('📦 Interview data received:', interviewData);
    
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      console.log('✅ Speech synthesis initialized');
    } else {
      console.error('❌ Speech synthesis not supported');
    }
    
    initializeInterview();
    
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Preparing Your AI Interview</h2>
          <p className="text-gray-600">Setting up camera, microphone, and loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-lg border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Interview Session</h1>
            <p className="text-gray-600">
              {interviewCompleted ? 'Interview Completed' : 
               currentPhase === 'greeting' ? 'Getting to know you' :
               currentPhase === 'questions' ? `Question ${questionIndex + 1} of ${questions.length}` :
               'Wrapping up'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {aiSpeaking && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg">
                <Volume2 className="h-4 w-4" />
                <span className="text-sm font-medium">AI Speaking</span>
              </div>
            )}
            {isListening && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Listening</span>
              </div>
            )}
            {interviewStarted && !interviewCompleted && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live Interview</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Panel */}
        <div className="w-80 bg-white border-r flex flex-col">
          {/* Video Feed */}
          <div className="relative bg-gray-900 aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!isCameraOn && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-center gap-4">
              <button
                onClick={toggleCamera}
                className={`p-3 rounded-full transition-colors ${
                  isCameraOn 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                }`}
              >
                {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
              
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full transition-colors ${
                  !isMuted 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                }`}
              >
                {!isMuted ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Live Transcript */}
          {transcript && waitingForResponse && (
            <div className="p-4 border-t bg-blue-50">
              <h4 className="text-sm font-medium text-blue-900 mb-2">You're saying:</h4>
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-sm text-gray-800">{transcript}</p>
              </div>
              <p className="text-xs text-blue-600 mt-2">Keep talking or pause for 2.5 seconds to submit</p>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-6"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {conversation.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : message.type === 'error' ? 'justify-center' : 'justify-start'}`}
              >
                {message.type === 'error' ? (
                  // Error Message
                  <div className="bg-red-100 border border-red-300 text-red-800 px-8 py-6 rounded-xl text-center max-w-2xl">
                    <div className="flex items-center justify-center mb-4">
                      <AlertCircle className="h-12 w-12 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Interview Setup Error</h3>
                    <p className="text-sm leading-relaxed mb-4">{message.message}</p>
                    <p className="text-xs text-red-600">
                      Error occurred at {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ) : (
                  // Normal Message
                  <div className={`flex items-start gap-4 max-w-4xl ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    }`}>
                      {message.type === 'user' ? <User className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`px-6 py-4 rounded-2xl max-w-3xl ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}>
                      <p className="text-sm leading-relaxed">{message.message}</p>
                      <p className={`text-xs mt-2 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* AI Thinking Indicator */}
            {aiThinking && (
              <div className="flex justify-start">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div className="bg-gray-100 px-6 py-4 rounded-2xl rounded-bl-md">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600 ml-2">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting for Response */}
            {waitingForResponse && !aiThinking && (
              <div className="flex justify-center">
                <div className="bg-yellow-100 text-yellow-800 px-6 py-3 rounded-full text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  I'm listening for your response... speak naturally
                </div>
              </div>
            )}

            {/* Interview Completed */}
            {interviewCompleted && (
              <div className="flex justify-center">
                <div className="bg-green-100 text-green-800 px-8 py-6 rounded-xl text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Interview Completed Successfully!</h3>
                  <p className="text-sm">Thank you for your time. Your responses are being processed and our team will be in touch soon.</p>
                </div>
              </div>
            )}
          </div>

          {/* Manual Input (if needed) */}
          {waitingForResponse && !interviewCompleted && (
            <div className="border-t p-4 bg-gray-50">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Or type your response here..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && transcript.trim()) {
                      processUserResponse(transcript);
                    }
                  }}
                />
                <button
                  onClick={() => processUserResponse(transcript)}
                  disabled={!transcript.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
