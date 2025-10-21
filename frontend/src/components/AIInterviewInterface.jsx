import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, Code, CheckCircle, Clock, User, Bot, Send } from 'lucide-react';
import Editor from '@monaco-editor/react';

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
  const [cameraError, setCameraError] = useState(false);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    initializeInterview();
    return () => cleanup();
  }, []);

  const initializeInterview = async () => {
    try {
      // Get camera access with better error handling
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(console.error);
        };
      }

      await fetchQuestions();
      setLoading(false);
    } catch (error) {
      console.error('Camera/Microphone error:', error);
      setCameraError(true);
      setLoading(false);
      // Continue without camera
      await fetchQuestions();
    }
  };

  const fetchQuestions = async () => {
    try {
      const token = window.location.pathname.split('/').pop();
      
      const customQuestionsResponse = await fetch(`http://localhost:5000/api/interview-questions/token/${token}`);
      const customData = await customQuestionsResponse.json();
      
      if (customData.success && customData.has_custom_questions && customData.data?.length > 0) {
        const formattedQuestions = customData.data.map(q => ({
          text: q.question_text,
          type: q.question_type,
          duration: q.duration || 180,
          code: q.code_snippet || null,
          language: q.code_language || 'javascript',
          answer_mode: q.answer_mode || 'write'
        }));
        
        setQuestions(formattedQuestions);
        setCurrentQuestion(formattedQuestions[0]);
        const totalDuration = formattedQuestions.reduce((sum, q) => sum + q.duration, 0);
        setTimeLeft(totalDuration);
        return;
      }
      
      // Fallback to default questions if no custom ones
      const defaultQuestions = [
        { text: "Tell me about yourself and your experience.", type: "behavioral", duration: 180, answer_mode: "hybrid" }
      ];
      setQuestions(defaultQuestions);
      setCurrentQuestion(defaultQuestions[0]);
      setTimeLeft(180);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const startRecording = () => {
    if (currentQuestion?.answer_mode === 'write') return;
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + ' ' + finalTranscript);
        }
      };
      
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const nextQuestion = async () => {
    if (!transcript.trim()) return;
    
    const answer = {
      questionIndex,
      question: currentQuestion.text,
      answer: transcript,
      timestamp: new Date().toISOString()
    };
    
    setAnswers(prev => [...prev, answer]);
    setTranscript('');
    
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex(questionIndex + 1);
      setCurrentQuestion(questions[questionIndex + 1]);
    } else {
      await submitInterview();
    }
  };

  const submitInterview = async () => {
    try {
      const token = window.location.pathname.split('/').pop();
      await fetch(`http://localhost:5000/api/applications/interview/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      setInterviewCompleted(true);
    } catch (error) {
      console.error('Error submitting interview:', error);
    }
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Initializing Interview...</p>
        </div>
      </div>
    );
  }

  if (interviewCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center">
        <div className="text-center text-white">
          <CheckCircle className="h-24 w-24 mx-auto mb-6 text-green-400" />
          <h1 className="text-4xl font-bold mb-4">Interview Completed!</h1>
          <p className="text-xl">Thank you for your time. We'll be in touch soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">{interviewData?.job?.title || 'AI Interview'}</h1>
              <p className="text-blue-200 text-sm">Interactive Interview Session</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-black/40 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2">
              <Clock className="h-4 w-4 text-white" />
              <span className="text-white font-mono">{formatTime(timeLeft)}</span>
            </div>
            <div className="bg-black/40 backdrop-blur px-4 py-2 rounded-lg">
              <span className="text-white">Question {questionIndex + 1} of {questions.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-100px)]">
        
        {/* Left Panel - Camera & Progress */}
        <div className="space-y-6">
          {/* Camera Feed */}
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-white" />
              <h3 className="text-white font-semibold">Your Video</h3>
            </div>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              {!cameraError ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-75">Camera not available</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 right-3">
                <button
                  onClick={() => setIsCameraOn(!isCameraOn)}
                  className={`p-2 rounded-lg ${isCameraOn ? 'bg-white/20' : 'bg-red-500'}`}
                >
                  {isCameraOn ? <Video className="h-4 w-4 text-white" /> : <VideoOff className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <h3 className="text-white font-semibold mb-4">Progress</h3>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx < questionIndex ? 'bg-green-500 text-white' :
                    idx === questionIndex ? 'bg-blue-500 text-white' :
                    'bg-gray-600 text-gray-300'
                  }`}>
                    {idx < questionIndex ? '✓' : idx + 1}
                  </div>
                  <span className={`text-sm ${idx === questionIndex ? 'text-white font-medium' : 'text-gray-300'}`}>
                    {q.type} Question
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel - Question & Answer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Panel */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold uppercase">
                    {currentQuestion?.type}
                  </span>
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                    {currentQuestion?.answer_mode === 'write' ? '✍️ Type' : 
                     currentQuestion?.answer_mode === 'speak' ? '🎤 Speak' : '🎤✍️ Type or Speak'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 leading-relaxed">
                  {currentQuestion?.text}
                </h2>
              </div>
            </div>

            {/* Code Display */}
            {currentQuestion?.code && (
              <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                  <Code className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300 text-sm font-semibold">Code Snippet</span>
                </div>
                <Editor
                  height="200px"
                  language={currentQuestion.language || 'javascript'}
                  value={currentQuestion.code}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    folding: false
                  }}
                />
              </div>
            )}
          </div>

          {/* Answer Panel */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Your Answer</h3>
            </div>

            {currentQuestion?.answer_mode === 'write' ? (
              /* Monaco Editor for Write Mode */
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <Editor
                  height="300px"
                  language={currentQuestion?.code ? (currentQuestion.language || 'javascript') : 'plaintext'}
                  value={transcript}
                  onChange={(value) => setTranscript(value || '')}
                  theme="vs"
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    suggestOnTriggerCharacters: false,
                    quickSuggestions: false,
                    parameterHints: { enabled: false },
                    hover: { enabled: false }
                  }}
                />
              </div>
            ) : (
              /* Voice/Hybrid Mode */
              <div className="space-y-4">
                <div className="min-h-[200px] p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                  {transcript ? (
                    <p className="text-gray-900 leading-relaxed">{transcript}</p>
                  ) : (
                    <p className="text-gray-500 italic">
                      {currentQuestion?.answer_mode === 'speak' 
                        ? 'Click the microphone to start speaking...' 
                        : 'Type your answer above or click the microphone to speak...'}
                    </p>
                  )}
                </div>
                
                {currentQuestion?.answer_mode === 'hybrid' && (
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Or type your answer here..."
                    className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                  />
                )}

                <div className="flex items-center gap-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                  {isRecording && (
                    <span className="text-red-500 font-medium animate-pulse">● Recording...</span>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={nextQuestion}
                disabled={!transcript.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:hover:scale-100"
              >
                <Send className="h-5 w-5" />
                {questionIndex + 1 === questions.length ? 'Submit Interview' : 'Next Question'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
