import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX, User, Bot, Send, MessageCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function ConversationalAIInterview({ interviewData, onComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  
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
    // Auto-scroll to bottom when new messages are added
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  const initializeInterview = async () => {
    try {
      // Initialize camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(console.error);
        };
      }

      // Initialize speech recognition
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

          // Only auto-submit if transcript is substantial and user has paused for longer
          if (finalTranscript && waitingForResponse && finalTranscript.trim().length > 10) {
            // Clear any existing timeout
            if (window.autoSubmitTimeout) {
              clearTimeout(window.autoSubmitTimeout);
            }
            
            // Set a longer timeout for auto-submit (3 seconds of silence)
            window.autoSubmitTimeout = setTimeout(() => {
              if (waitingForResponse && finalTranscript.trim()) {
                console.log('🤖 Auto-submitting response after pause:', finalTranscript);
                handleResponseSubmit(finalTranscript);
              }
            }, 3000); // Wait 3 seconds after final transcript
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          if (waitingForResponse && !interviewCompleted) {
            // Restart recognition if we're still waiting for response
            setTimeout(() => {
              if (recognitionRef.current && waitingForResponse) {
                recognitionRef.current.start();
              }
            }, 100);
          }
        };
      }

      await fetchQuestions();
      setLoading(false);
      
      // Start with AI greeting
      setTimeout(() => {
        startInterview();
      }, 1000);

    } catch (error) {
      console.error('Error initializing interview:', error);
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      console.log('🔍 Fetching questions for token:', interviewData.token);
      
      // Try to get custom questions first
      const response = await axios.get(`http://localhost:5000/api/applications/interview/${interviewData.token}`);
      console.log('📋 Interview response:', response.data);
      
      if (response.data.success && response.data.data) {
        const interviewDetails = response.data.data;
        
        // Check if there are custom questions
        if (interviewDetails.custom_questions && interviewDetails.custom_questions.length > 0) {
          console.log('✅ Found custom questions:', interviewDetails.custom_questions.length);
          setQuestions(interviewDetails.custom_questions.map((q, index) => ({
            id: q.id || index + 1,
            text: q.question_text || q.text,
            type: q.question_type || q.type || 'general',
            duration: q.duration || 180,
            code_snippet: q.code_snippet,
            expected_answer: q.expected_answer
          })));
          return;
        }
        
        // Try to get questions from interview questions endpoint
        try {
          const questionsResponse = await axios.get(`http://localhost:5000/api/applications/interview/${interviewData.token}/questions`);
          if (questionsResponse.data.success && questionsResponse.data.data.questions) {
            console.log('✅ Found interview questions:', questionsResponse.data.data.questions.length);
            setQuestions(questionsResponse.data.data.questions);
            return;
          }
        } catch (questionsError) {
          console.log('⚠️ No specific questions endpoint, using fallback');
        }
      }
      
      // Fallback to default questions
      console.log('📝 Using fallback questions');
      setQuestions([
        {
          id: 1,
          text: "Hello! Welcome to your interview. Could you please introduce yourself and tell me about your background?",
          type: "introduction",
          duration: 120
        },
        {
          id: 2,
          text: "That's great! What interests you most about this position and our company?",
          type: "general",
          duration: 90
        },
        {
          id: 3,
          text: "Can you walk me through a challenging project you've worked on recently?",
          type: "behavioral",
          duration: 180
        },
        {
          id: 4,
          text: "What are your greatest strengths and how do they relate to this role?",
          type: "behavioral",
          duration: 120
        },
        {
          id: 5,
          text: "Do you have any questions for us about the role or company?",
          type: "general",
          duration: 90
        }
      ]);
    } catch (error) {
      console.error('❌ Error fetching questions:', error);
      // Fallback questions
      setQuestions([
        {
          id: 1,
          text: "Hello! Welcome to your interview. Could you please introduce yourself and tell me about your background?",
          type: "introduction",
          duration: 120
        },
        {
          id: 2,
          text: "That's great! What interests you most about this position and our company?",
          type: "general",
          duration: 90
        },
        {
          id: 3,
          text: "Can you walk me through a challenging project you've worked on recently?",
          type: "behavioral",
          duration: 180
        }
      ]);
    }
  };

  const startInterview = () => {
    setInterviewStarted(true);
    
    // AI greeting
    const greeting = {
      id: Date.now(),
      type: 'ai',
      message: "Hello! I'm your AI interviewer today. I'm excited to learn more about you and your experience. Shall we begin?",
      timestamp: new Date()
    };
    
    setConversation([greeting]);
    speakMessage(greeting.message);
    
    // Start first question after greeting
    setTimeout(() => {
      askNextQuestion();
    }, 4000);
  };

  const askNextQuestion = () => {
    if (currentQuestionIndex >= questions.length) {
      completeInterview();
      return;
    }

    const question = questions[currentQuestionIndex];
    const aiMessage = {
      id: Date.now(),
      type: 'ai',
      message: question.text,
      questionId: question.id,
      timestamp: new Date()
    };

    setTypingIndicator(true);
    
    // Simulate AI thinking/typing
    setTimeout(() => {
      setTypingIndicator(false);
      setConversation(prev => [...prev, aiMessage]);
      speakMessage(question.text);
      
      // Start listening for response
      setTimeout(() => {
        setWaitingForResponse(true);
        startListening();
      }, 2000);
    }, 1500);
  };

  const handleResponseSubmit = (responseText = transcript) => {
    console.log('📝 Attempting to submit response:', responseText);
    
    if (!responseText.trim() || !waitingForResponse) {
      console.log('❌ Response submission blocked - empty text or not waiting');
      return;
    }

    // Clear any pending auto-submit timeout
    if (window.autoSubmitTimeout) {
      clearTimeout(window.autoSubmitTimeout);
      window.autoSubmitTimeout = null;
    }

    console.log('✅ Submitting response for question', currentQuestionIndex + 1);

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: responseText.trim(),
      questionId: questions[currentQuestionIndex]?.id,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    setTranscript('');
    setWaitingForResponse(false);
    stopListening();

    // AI acknowledgment
    const acknowledgments = [
      "Thank you for sharing that.",
      "That's very interesting.",
      "I appreciate your detailed response.",
      "Great, that gives me good insight.",
      "Thank you for explaining that.",
      "Perfect, I understand.",
      "That's exactly what I was looking for."
    ];
    
    const ackMessage = {
      id: Date.now() + 1,
      type: 'ai',
      message: acknowledgments[Math.floor(Math.random() * acknowledgments.length)],
      timestamp: new Date()
    };

    setTimeout(() => {
      setConversation(prev => [...prev, ackMessage]);
      speakMessage(ackMessage.message);
      
      // Move to next question after acknowledgment
      setTimeout(() => {
        const nextIndex = currentQuestionIndex + 1;
        console.log('🔄 Moving to question', nextIndex + 1, 'of', questions.length);
        setCurrentQuestionIndex(nextIndex);
        askNextQuestion();
      }, 3000); // Longer pause between questions
    }, 1500);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakMessage = (text) => {
    if (isMuted) return;
    
    setAiSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    utterance.onend = () => {
      setAiSpeaking(false);
    };
    
    synthRef.current.speak(utterance);
  };

  const completeInterview = () => {
    setInterviewCompleted(true);
    setWaitingForResponse(false);
    stopListening();
    
    const completionMessage = {
      id: Date.now(),
      type: 'ai',
      message: "Thank you for your time today! That concludes our interview. Your responses have been recorded and will be reviewed by our team. Have a great day!",
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, completionMessage]);
    speakMessage(completionMessage.message);
    
    // Save interview results
    setTimeout(() => {
      saveInterviewResults();
    }, 3000);
  };

  const saveInterviewResults = async () => {
    try {
      const answers = conversation
        .filter(msg => msg.type === 'user')
        .map(msg => ({
          question_id: msg.questionId,
          answer: msg.message,
          timestamp: msg.timestamp
        }));

      await axios.post(`http://localhost:5000/api/applications/interview/${interviewData.token}/complete`, {
        answers,
        completed_at: new Date().toISOString()
      });

      onComplete?.();
    } catch (error) {
      console.error('Error saving interview results:', error);
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

  const toggleMicrophone = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsRecording(audioTrack.enabled);
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
    if (window.autoSubmitTimeout) {
      clearTimeout(window.autoSubmitTimeout);
      window.autoSubmitTimeout = null;
    }
    synthRef.current.cancel();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing AI Interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Interview Session</h1>
            <p className="text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-2">
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
            
            {/* Status Indicators */}
            <div className="absolute top-4 left-4 flex gap-2">
              {isListening && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-full text-xs">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Listening
                </div>
              )}
              {aiSpeaking && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-full text-xs">
                  <Volume2 className="h-3 w-3" />
                  AI Speaking
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-center gap-4">
              <button
                onClick={toggleMicrophone}
                className={`p-3 rounded-full transition-colors ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                }`}
              >
                {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>
              
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
            <div className="p-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Live Transcript:</h4>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-900">{transcript}</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {conversation.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  }`}>
                    {message.type === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typingIndicator && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting for Response Indicator */}
            {waitingForResponse && !typingIndicator && (
              <div className="flex justify-center">
                <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Waiting for your response... (Speak naturally or type below)
                </div>
              </div>
            )}

            {/* Interview Completed */}
            {interviewCompleted && (
              <div className="flex justify-center">
                <div className="bg-green-100 text-green-800 px-6 py-4 rounded-xl text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-semibold">Interview Completed!</p>
                  <p className="text-sm">Thank you for your time. Results are being processed.</p>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          {waitingForResponse && !interviewCompleted && (
            <div className="border-t p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    {isListening ? (
                      <span className="flex items-center justify-center gap-2 text-red-600">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        I'm listening... speak naturally or type your response
                      </span>
                    ) : (
                      "Type your response below or click the microphone to speak"
                    )}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Type your response here... (or speak naturally if microphone is on)"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows="3"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleResponseSubmit();
                        }
                      }}
                    />
                    {transcript.trim() && (
                      <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                        Press Enter to submit
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleResponseSubmit()}
                      disabled={!transcript.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl transition-all flex items-center gap-2 font-semibold shadow-lg disabled:shadow-none"
                    >
                      <Send className="h-4 w-4" />
                      Submit Response
                    </button>
                    
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      <Mic className="h-4 w-4" />
                      {isListening ? 'Stop' : 'Speak'}
                    </button>
                  </div>
                </div>
                
                {transcript.trim() && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-500">
                      Auto-submit in 3 seconds after you stop speaking, or click "Submit Response"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
