import React, { useState, useEffect, useRef } from 'react';
import { Clock, Mic, MicOff, Play, Pause, Volume2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

const CommunicationAssessment = ({ assessmentData, onComplete, candidateName }) => {
  const [currentSection, setCurrentSection] = useState(0); // 0: Reading, 1: Listening, 2: Grammar
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(60);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordedQuestions, setRecordedQuestions] = useState(new Set());
  const [playedAudio, setPlayedAudio] = useState(new Set());
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);

  // Parse questions by type
  const sections = React.useMemo(() => {
    const questions = assessmentData?.custom_questions || assessmentData?.questions || [];
    console.log('🔍 Assessment data received:', assessmentData);
    console.log('📋 Questions parsed:', questions);
    
    const parsed = {
      reading: questions.filter(q => q.type === 'reading_aloud' || q.type === 'reading' || q.question_type === 'reading_aloud'),
      listening: questions.filter(q => q.type === 'listening' || q.question_type === 'listening'),
      grammar: questions.filter(q => q.type === 'grammar' || q.question_type === 'grammar')
    };
    
    console.log('📊 Sections parsed:', parsed);
    return parsed;
  }, [assessmentData]);

  const sectionNames = ['Reading', 'Listening', 'Grammar'];
  const currentSectionQuestions = Object.values(sections)[currentSection] || [];
  
  // Check if current question is already recorded
  const currentQuestionKey = `${currentSection}_${currentQuestionIndex}`;
  const isCurrentQuestionRecorded = recordedQuestions.has(currentQuestionKey);
  
  // Check if current audio has been played
  const isCurrentAudioPlayed = playedAudio.has(currentQuestionKey);

  useEffect(() => {
    if (assessmentStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitAssessment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [assessmentStarted, timeLeft]);

  // Recording timer effect
  useEffect(() => {
    if (isRecording && recordingTimeLeft > 0) {
      const timer = setInterval(() => {
        setRecordingTimeLeft(prev => {
          const newTime = prev - 1;
          const progress = ((60 - newTime) / 60) * 100;
          setRecordingProgress(progress);
          
          if (newTime <= 0) {
            stopRecording();
            return 0;
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isRecording, recordingTimeLeft]);

  const startAssessment = () => {
    setAssessmentStarted(true);
    setTimeLeft((assessmentData?.timeLimit || 30) * 60); // Convert minutes to seconds
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        
        // Store the recording for this question
        const questionKey = `${sectionNames[currentSection]}_${currentQuestionIndex}`;
        setAnswers(prev => ({
          ...prev,
          [questionKey]: {
            type: 'audio',
            audioBlob: blob,
            audioUrl: audioUrl,
            timestamp: new Date().toISOString()
          }
        }));

        // Mark this question as recorded
        const currentQuestionKey = `${currentSection}_${currentQuestionIndex}`;
        setRecordedQuestions(prev => new Set([...prev, currentQuestionKey]));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTimeLeft(60);
      setRecordingProgress(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingTimeLeft(60);
      setRecordingProgress(0);
    }
  };

  const playAudio = (audioText) => {
    if ('speechSynthesis' in window && !isCurrentAudioPlayed) {
      const utterance = new SpeechSynthesisUtterance(audioText);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => {
        setIsPlaying(true);
        // Mark this audio as played
        setPlayedAudio(prev => new Set([...prev, currentQuestionKey]));
      };
      utterance.onend = () => setIsPlaying(false);
      
      speechSynthesis.speak(utterance);
    }
  };

  const handleMultipleChoice = (questionKey, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: {
        answer: answer,
        timestamp: new Date().toISOString(),
        question_index: currentQuestionIndex
      }
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentSectionQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Move to next section or complete
      if (currentSection < Object.keys(sections).length - 1) {
        setCurrentSection(prev => prev + 1);
        setCurrentQuestionIndex(0);
      } else {
        handleSubmitAssessment();
      }
    }
  };

  const handleSubmitAssessment = async () => {
    setAssessmentCompleted(true);
    
    try {
      // Calculate comprehensive communication assessment score
      const totalQuestions = Object.keys(sections).reduce((total, sectionName) => {
        return total + sections[sectionName].length;
      }, 0);

      // 1. Grammar Score (MCQ with correct answers)
      const grammarAnswers = Object.entries(answers).filter(([key]) => key.startsWith('Grammar'));
      const grammarQuestions = sections.grammar;
      
      let grammarCorrect = 0;
      grammarAnswers.forEach(([key, answerData]) => {
        const questionIndex = parseInt(key.split('_')[1]);
        const question = grammarQuestions[questionIndex];
        if (question && question.correct_answer === answerData.answer) {
          grammarCorrect++;
        }
      });

      // 2. Reading Score (based on completion - audio recordings)
      const readingAnswers = Object.entries(answers).filter(([key]) => key.startsWith('Reading'));
      const readingQuestions = sections.reading;
      const readingCompleted = readingAnswers.filter(([key, answerData]) => 
        answerData.type === 'audio' && answerData.audioBlob
      ).length;

      // 3. Listening Score (based on completion - audio recordings)
      const listeningAnswers = Object.entries(answers).filter(([key]) => key.startsWith('Listening'));
      const listeningQuestions = sections.listening;
      const listeningCompleted = listeningAnswers.filter(([key, answerData]) => 
        answerData.type === 'audio' && answerData.audioBlob
      ).length;

      // Calculate weighted scores for each section
      const grammarScore = grammarQuestions.length > 0 ? (grammarCorrect / grammarQuestions.length) * 100 : 0;
      const readingScore = readingQuestions.length > 0 ? (readingCompleted / readingQuestions.length) * 100 : 0;
      const listeningScore = listeningQuestions.length > 0 ? (listeningCompleted / listeningQuestions.length) * 100 : 0;

      // Calculate overall score based on sections present
      let overallScore = 0;
      let sectionsCount = 0;

      if (grammarQuestions.length > 0) {
        overallScore += grammarScore;
        sectionsCount++;
      }
      if (readingQuestions.length > 0) {
        overallScore += readingScore;
        sectionsCount++;
      }
      if (listeningQuestions.length > 0) {
        overallScore += listeningScore;
        sectionsCount++;
      }

      const finalScore = sectionsCount > 0 ? Math.round(overallScore / sectionsCount) : 0;

      const results = {
        answers: answers,
        score: finalScore,
        total_questions: totalQuestions,
        sections_scores: {
          grammar: {
            score: Math.round(grammarScore),
            correct: grammarCorrect,
            total: grammarQuestions.length
          },
          reading: {
            score: Math.round(readingScore),
            completed: readingCompleted,
            total: readingQuestions.length
          },
          listening: {
            score: Math.round(listeningScore),
            completed: listeningCompleted,
            total: listeningQuestions.length
          }
        },
        time_taken: ((assessmentData?.timeLimit || 30) * 60) - timeLeft,
        assessment_type: 'communication',
        sections_completed: Object.keys(sections).filter(section => sections[section].length > 0)
      };

      console.log('Communication Assessment Results:', results);
      
      if (onComplete) {
        onComplete(results);
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
    }
  };

  if (!assessmentStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Volume2 className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Communication Assessment</h1>
            <p className="text-gray-600">
              Welcome {candidateName}! This assessment will evaluate your communication skills.
            </p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Assessment Sections:</h3>
              <div className="space-y-2 text-sm text-blue-800">
                {sections.reading.length > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Reading: {sections.reading.length} paragraphs to read aloud</span>
                  </div>
                )}
                {sections.listening.length > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Listening: {sections.listening.length} audio exercises</span>
                  </div>
                )}
                {sections.grammar.length > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Grammar: {sections.grammar.length} multiple choice questions</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">Instructions:</h3>
              <ul className="space-y-1 text-sm text-yellow-800">
                <li>• Ensure you have a working microphone</li>
                <li>• Find a quiet environment</li>
                <li>• Speak clearly and at normal pace</li>
                <li>• Time limit: {assessmentData?.timeLimit || 30} minutes</li>
              </ul>
            </div>
          </div>

          <button
            onClick={startAssessment}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            Start Communication Assessment
          </button>
        </div>
      </div>
    );
  }

  if (assessmentCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Completed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for completing the communication assessment. Your responses have been recorded and will be reviewed by our team.
          </p>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              You will receive feedback and next steps via email within 2-3 business days.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = currentSectionQuestions[currentQuestionIndex];
  const progress = ((currentSection * 100 / Object.keys(sections).length) + 
                   (currentQuestionIndex * 100 / Object.keys(sections).length / Math.max(currentSectionQuestions.length, 1)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {sectionNames[currentSection]} Assessment
              </h1>
              <p className="text-gray-600">
                Question {currentQuestionIndex + 1} of {currentSectionQuestions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-red-600">
                <Clock className="w-5 h-5" />
                <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Content */}
        {currentQuestion && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {currentQuestion.question_text || currentQuestion.question || currentQuestion.text}
              </h2>

              {/* Reading Section */}
              {currentSection === 0 && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-900 mb-2">Instructions:</h3>
                    <p className="text-green-800 text-sm">
                      Read the paragraph below aloud clearly and naturally. Click "Start Recording" when ready.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <p className="text-lg leading-relaxed text-gray-900">
                      {currentQuestion.passage || 
                       (currentQuestion.type === 'reading_aloud' ? 
                         "Software development involves writing code to create applications. As a Software Developer, you work with programming languages like Python, Java, or JavaScript. Good coding practices include writing clean, readable code and testing your applications thoroughly." :
                         currentQuestion.question_text || currentQuestion.content)}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      {/* Voice Wave Animation Background */}
                      {isRecording && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-blue-400 rounded-full animate-pulse"
                                style={{
                                  height: `${Math.random() * 20 + 10}px`,
                                  animationDelay: `${i * 0.1}s`,
                                  animationDuration: '0.8s'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Circular Progress Ring */}
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="none"
                          className="text-gray-200"
                        />
                        {/* Progress circle */}
                        {isRecording && (
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - recordingProgress / 100)}`}
                            className="text-blue-500 transition-all duration-1000 ease-linear"
                          />
                        )}
                      </svg>
                      
                      {/* Microphone Button */}
                      <button
                        onClick={isCurrentQuestionRecorded ? null : (isRecording ? stopRecording : startRecording)}
                        disabled={isCurrentQuestionRecorded}
                        className={`absolute inset-0 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isCurrentQuestionRecorded
                            ? 'bg-green-600 cursor-not-allowed'
                            : isRecording 
                              ? 'bg-blue-600 hover:bg-blue-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isCurrentQuestionRecorded ? (
                          <CheckCircle className="w-8 h-8 text-white" />
                        ) : isRecording ? (
                          <MicOff className="w-8 h-8 text-white" />
                        ) : (
                          <Mic className="w-8 h-8 text-white" />
                        )}
                      </button>
                    </div>
                    
                    {/* Recording Status */}
                    <div className="text-center">
                      {isCurrentQuestionRecorded ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <p className="text-green-600 font-semibold">Response Recorded!</p>
                          </div>
                          <p className="text-sm text-gray-600">You can proceed to the next question</p>
                        </div>
                      ) : isRecording ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <p className="text-blue-600 font-semibold">Recording...</p>
                          </div>
                          <p className="text-sm text-gray-600">Time left: {recordingTimeLeft}s</p>
                          
                          {/* Voice Level Indicator */}
                          <div className="flex items-center justify-center gap-1 mt-2">
                            <span className="text-xs text-gray-500">Audio:</span>
                            <div className="flex items-center gap-0.5">
                              {[...Array(8)].map((_, i) => (
                                <div
                                  key={i}
                                  className="w-0.5 bg-blue-400 rounded-full animate-pulse"
                                  style={{
                                    height: `${Math.random() * 12 + 4}px`,
                                    animationDelay: `${i * 0.15}s`,
                                    animationDuration: '1s'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-gray-600">Click to start recording (60s limit)</p>
                          <p className="text-xs text-orange-600">⚠️ Only one recording chance per question</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Listening Section */}
              {currentSection === 1 && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-900 mb-2">Instructions:</h3>
                    <p className="text-yellow-800 text-sm">
                      {currentQuestion.subtype === 'sentence' ? 
                        'Listen to the sentence and repeat it exactly as you heard it.' :
                        'Listen to the passage and answer the questions that follow.'
                      }
                    </p>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => playAudio(currentQuestion.audio_text || currentQuestion.audio_url || 
                        (currentQuestion.type === 'listening' ? 
                          "Welcome to our software development team." :
                          currentQuestion.question_text || currentQuestion.content))}
                      disabled={isPlaying || isCurrentAudioPlayed}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors mx-auto ${
                        isCurrentAudioPlayed
                          ? 'bg-gray-500 text-white cursor-not-allowed'
                          : isPlaying
                            ? 'bg-blue-600 text-white opacity-50'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isCurrentAudioPlayed ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Audio Played
                        </>
                      ) : isPlaying ? (
                        <>
                          <Pause className="w-5 h-5" />
                          Playing...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Play Audio (One Time Only)
                        </>
                      )}
                    </button>
                    
                    {/* Warning message */}
                    {!isCurrentAudioPlayed && (
                      <p className="text-xs text-orange-600 mt-2">⚠️ You can only listen to this audio once</p>
                    )}
                  </div>

                  {/* Recording Interface for Listening Questions */}
                  <div className="flex flex-col items-center gap-4 mt-4">
                    <div className="relative">
                      {/* Voice Wave Animation Background */}
                      {isRecording && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-blue-400 rounded-full animate-pulse"
                                style={{
                                  height: `${Math.random() * 20 + 10}px`,
                                  animationDelay: `${i * 0.1}s`,
                                  animationDuration: '0.8s'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Circular Progress Ring */}
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="none"
                          className="text-gray-200"
                        />
                        {/* Progress circle */}
                        {isRecording && (
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - recordingProgress / 100)}`}
                            className="text-blue-500 transition-all duration-1000 ease-linear"
                          />
                        )}
                      </svg>
                      
                      {/* Microphone Button */}
                      <button
                        onClick={isCurrentQuestionRecorded ? null : (isRecording ? stopRecording : startRecording)}
                        disabled={isCurrentQuestionRecorded}
                        className={`absolute inset-0 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isCurrentQuestionRecorded
                            ? 'bg-green-600 cursor-not-allowed'
                            : isRecording 
                              ? 'bg-blue-600 hover:bg-blue-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isCurrentQuestionRecorded ? (
                          <CheckCircle className="w-8 h-8 text-white" />
                        ) : isRecording ? (
                          <MicOff className="w-8 h-8 text-white" />
                        ) : (
                          <Mic className="w-8 h-8 text-white" />
                        )}
                      </button>
                    </div>
                    
                    {/* Recording Status */}
                    <div className="text-center">
                      {isCurrentQuestionRecorded ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <p className="text-green-600 font-semibold">Response Recorded!</p>
                          </div>
                          <p className="text-sm text-gray-600">You can proceed to the next question</p>
                        </div>
                      ) : isRecording ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <p className="text-blue-600 font-semibold">Recording...</p>
                          </div>
                          <p className="text-sm text-gray-600">Time left: {recordingTimeLeft}s</p>
                          
                          {/* Voice Level Indicator */}
                          <div className="flex items-center justify-center gap-1 mt-2">
                            <span className="text-xs text-gray-500">Audio:</span>
                            <div className="flex items-center gap-0.5">
                              {[...Array(8)].map((_, i) => (
                                <div
                                  key={i}
                                  className="w-0.5 bg-blue-400 rounded-full animate-pulse"
                                  style={{
                                    height: `${Math.random() * 12 + 4}px`,
                                    animationDelay: `${i * 0.15}s`,
                                    animationDuration: '1s'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-gray-600">Record your response (60s limit)</p>
                          <p className="text-xs text-orange-600">⚠️ Only one recording chance per question</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Grammar Section */}
              {currentSection === 2 && currentQuestion.options && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="font-medium text-purple-900 mb-2">Instructions:</h3>
                    <p className="text-purple-800 text-sm">
                      Select the best answer for each grammar question.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(currentQuestion.options).map(([key, option]) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`${sectionNames[currentSection]}_question_${currentQuestionIndex}`}
                          value={key}
                          checked={answers[`${sectionNames[currentSection]}_${currentQuestionIndex}`]?.answer === key}
                          onChange={(e) => handleMultipleChoice(`${sectionNames[currentSection]}_${currentQuestionIndex}`, e.target.value)}
                          className="text-purple-600"
                        />
                        <span className="text-gray-900">{key}. {option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div className="text-sm text-gray-500">
                Section {currentSection + 1} of {Object.keys(sections).length}
              </div>
              
              <button
                onClick={nextQuestion}
                disabled={
                  (currentSection === 0 && !answers[`${sectionNames[currentSection]}_${currentQuestionIndex}`]) ||
                  (currentSection === 1 && currentQuestion.subtype === 'sentence' && !answers[`${sectionNames[currentSection]}_${currentQuestionIndex}`]) ||
                  (currentSection === 1 && currentQuestion.subtype !== 'sentence' && !answers[`${sectionNames[currentSection]}_${currentQuestionIndex}`]) ||
                  (currentSection === 2 && !answers[`${sectionNames[currentSection]}_${currentQuestionIndex}`])
                }
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestionIndex === currentSectionQuestions.length - 1 && currentSection === Object.keys(sections).length - 1 ? 
                  'Complete Assessment' : 'Next Question'
                }
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationAssessment;
