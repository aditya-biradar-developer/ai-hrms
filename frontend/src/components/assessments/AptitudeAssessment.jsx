import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Brain, 
  ArrowRight, 
  ArrowLeft,
  Flag,
  Eye,
  EyeOff
} from 'lucide-react';

const AptitudeAssessment = ({ 
  assessmentData, 
  onComplete, 
  onSubmit,
  candidateName = 'Candidate'
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [showInstructions, setShowInstructions] = useState(true);
  const timerRef = useRef(null);

  const questions = assessmentData?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];

  // Calculate total time (sum of all question time limits)
  const totalTime = questions.reduce((sum, q) => sum + (q.time_limit || 60), 0);

  useEffect(() => {
    if (!showInstructions && !isSubmitted) {
      setTimeRemaining(totalTime);
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [showInstructions, totalTime]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAutoSubmit = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsSubmitted(true);
    submitAssessment();
  };

  const handleAnswerSelect = (questionId, selectedOption) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        answer: selectedOption,
        timestamp: new Date().toISOString(),
        question_index: currentQuestionIndex
      }
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleQuestionJump = (index) => {
    setCurrentQuestionIndex(index);
  };

  const toggleFlag = (questionIndex) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex);
      } else {
        newSet.add(questionIndex);
      }
      return newSet;
    });
  };

  const submitAssessment = async () => {
    try {
      const results = {
        answers,
        total_questions: totalQuestions,
        answered_questions: Object.keys(answers).length,
        time_taken: totalTime - timeRemaining,
        flagged_questions: Array.from(flaggedQuestions),
        completed_at: new Date().toISOString()
      };

      await onSubmit(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Failed to submit assessment. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / totalQuestions) * 100;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Aptitude Assessment</CardTitle>
            <p className="text-gray-600">Welcome {candidateName}! Please read the instructions carefully.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Assessment Overview</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• <strong>Total Questions:</strong> {totalQuestions}</li>
                <li>• <strong>Total Time:</strong> {formatTime(totalTime)}</li>
                <li>• <strong>Question Types:</strong> Multiple Choice (MCQ)</li>
                <li>• <strong>Topics:</strong> {assessmentData?.metadata?.topics?.join(', ') || 'Various'}</li>
              </ul>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">Important Instructions</h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li>• Read each question carefully before selecting your answer</li>
                <li>• You can navigate between questions using the navigation panel</li>
                <li>• Flag questions you want to review later</li>
                <li>• The assessment will auto-submit when time expires</li>
                <li>• Ensure stable internet connection throughout the test</li>
                <li>• Do not refresh the page or navigate away</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Navigation Tips</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Use "Next" and "Previous" buttons to navigate</li>
                <li>• Click on question numbers to jump directly</li>
                <li>• Green numbers indicate answered questions</li>
                <li>• Red flag icon marks questions for review</li>
              </ul>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => setShowInstructions(false)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                Start Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Assessment Completed!</CardTitle>
            <p className="text-gray-600">Thank you for completing the aptitude assessment.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{getAnsweredCount()}/{totalQuestions}</div>
                <div className="text-sm text-blue-800">Questions Answered</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{formatTime(totalTime - timeRemaining)}</div>
                <div className="text-sm text-green-800">Time Taken</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What's Next?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Your responses have been recorded and will be evaluated</li>
                <li>• Results will be shared with the recruitment team</li>
                <li>• You will be contacted regarding next steps</li>
                <li>• Thank you for your time and effort</li>
              </ul>
            </div>

            <Button
              onClick={onComplete}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              Complete Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Error</h2>
            <p className="text-gray-600">No questions available for this assessment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Aptitude Assessment</h1>
                <p className="text-sm text-gray-600">{candidateName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span className={`font-mono ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-700'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              <div className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Question Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                  {questions.map((_, index) => {
                    const isAnswered = answers[questions[index]?.id || index];
                    const isCurrent = index === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(index);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleQuestionJump(index)}
                        className={`
                          relative w-10 h-10 rounded-lg text-sm font-medium transition-all
                          ${isCurrent 
                            ? 'bg-purple-600 text-white ring-2 ring-purple-300' 
                            : isAnswered 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {index + 1}
                        {isFlagged && (
                          <Flag className="absolute -top-1 -right-1 w-3 h-3 text-red-500 fill-current" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 rounded"></div>
                    <span>Answered ({getAnsweredCount()})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-100 rounded"></div>
                    <span>Not Answered ({totalQuestions - getAnsweredCount()})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flag className="w-3 h-3 text-red-500" />
                    <span>Flagged ({flaggedQuestions.size})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        {currentQuestion.topic?.replace('_', ' ').toUpperCase() || 'GENERAL'}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {currentQuestion.difficulty?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </div>
                    <CardTitle className="text-xl">
                      Question {currentQuestionIndex + 1}
                    </CardTitle>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFlag(currentQuestionIndex)}
                    className={flaggedQuestions.has(currentQuestionIndex) ? 'text-red-600' : 'text-gray-400'}
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="text-lg leading-relaxed">
                  {currentQuestion.question}
                </div>

                <div className="space-y-3">
                  {Object.entries(currentQuestion.options || {}).map(([key, value]) => {
                    const questionId = currentQuestion.id || currentQuestionIndex;
                    const isSelected = answers[questionId]?.answer === key;
                    
                    return (
                      <label
                        key={key}
                        className={`
                          flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name={`question-${questionId}`}
                          value={key}
                          checked={isSelected}
                          onChange={() => handleAnswerSelect(questionId, key)}
                          className="mt-1 w-4 h-4 text-purple-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">{key}.</span>
                            <span className="text-gray-900">{value}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

{/* Explanations removed - this is a non-feedback assessment */}
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex gap-3">
                {currentQuestionIndex === totalQuestions - 1 ? (
                  <Button
                    onClick={() => {
                      if (confirm('Are you sure you want to submit your assessment? You cannot change your answers after submission.')) {
                        setIsSubmitted(true);
                        submitAssessment();
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-8"
                  >
                    Submit Assessment
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-8"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AptitudeAssessment;
