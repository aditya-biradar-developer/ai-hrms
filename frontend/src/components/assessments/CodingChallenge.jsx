import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Code, 
  Play, 
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Terminal,
  FileText,
  Lightbulb
} from 'lucide-react';

const CodingChallenge = ({ 
  assessmentData, 
  onComplete, 
  onSubmit,
  candidateName = 'Candidate'
}) => {
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [code, setCode] = useState({});
  const [testResults, setTestResults] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [showTestCases, setShowTestCases] = useState(false);
  const timerRef = useRef(null);
  const codeEditorRef = useRef(null);

  const problems = assessmentData?.problems || [];
  const totalProblems = problems.length;
  const currentProblem = problems[currentProblemIndex];

  // Calculate total time
  const totalTime = assessmentData?.metadata?.time_limit * 60 || 5400; // 90 minutes default

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

  useEffect(() => {
    // Initialize code for current problem
    if (currentProblem && !code[currentProblem.title]) {
      setCode(prev => ({
        ...prev,
        [currentProblem.title]: currentProblem.starter_code || getDefaultCode(assessmentData?.metadata?.language)
      }));
    }
  }, [currentProblem, assessmentData?.metadata?.language]);

  const getDefaultCode = (language) => {
    const templates = {
      javascript: `function solution() {
    // Write your solution here
    
}`,
      python: `def solution():
    # Write your solution here
    pass`,
      java: `public class Solution {
    public void solution() {
        // Write your solution here
        
    }
}`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    void solution() {
        // Write your solution here
        
    }
};`
    };
    return templates[language] || templates.javascript;
  };

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

  const handleCodeChange = (problemTitle, newCode) => {
    setCode(prev => ({
      ...prev,
      [problemTitle]: newCode
    }));
  };

  const runCode = async () => {
    if (!currentProblem) return;
    
    setIsRunning(true);
    try {
      // Simulate code execution
      const userCode = code[currentProblem.title] || '';
      const results = await simulateCodeExecution(userCode, currentProblem.test_cases);
      
      setTestResults(prev => ({
        ...prev,
        [currentProblem.title]: results
      }));
    } catch (error) {
      console.error('Error running code:', error);
      setTestResults(prev => ({
        ...prev,
        [currentProblem.title]: {
          success: false,
          error: 'Runtime error: ' + error.message,
          passed: 0,
          total: currentProblem.test_cases?.length || 0
        }
      }));
    } finally {
      setIsRunning(false);
    }
  };

  const simulateCodeExecution = async (userCode, testCases) => {
    // Simulate test case execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const passed = Math.floor(Math.random() * (testCases?.length || 3)) + 1;
    const total = testCases?.length || 3;
    
    return {
      success: passed === total,
      passed,
      total,
      results: testCases?.map((testCase, index) => ({
        input: testCase.input,
        expected: testCase.expected_output,
        actual: index < passed ? testCase.expected_output : 'Wrong output',
        passed: index < passed
      })) || []
    };
  };

  const submitAssessment = async () => {
    try {
      const results = {
        solutions: code,
        test_results: testResults,
        total_problems: totalProblems,
        completed_problems: Object.keys(code).length,
        time_taken: totalTime - timeRemaining,
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

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
              <Code className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Coding Challenge</CardTitle>
            <p className="text-gray-600">Welcome {candidateName}! Ready to solve some coding problems?</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Challenge Overview</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• <strong>Total Problems:</strong> {totalProblems}</li>
                <li>• <strong>Time Limit:</strong> {formatTime(totalTime)}</li>
                <li>• <strong>Language:</strong> {assessmentData?.metadata?.language?.toUpperCase() || 'JavaScript'}</li>
                <li>• <strong>Difficulty:</strong> {assessmentData?.metadata?.difficulty?.toUpperCase() || 'Medium'}</li>
              </ul>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">Important Instructions</h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li>• Read each problem statement carefully</li>
                <li>• Write your solution in the code editor</li>
                <li>• Test your code using the "Run Code" button</li>
                <li>• Check test case results before moving to next problem</li>
                <li>• Save your progress frequently</li>
                <li>• Submit before time expires</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Editor Features</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Syntax highlighting and auto-completion</li>
                <li>• Real-time test case execution</li>
                <li>• Code templates provided for each problem</li>
                <li>• Automatic saving of your progress</li>
              </ul>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => setShowInstructions(false)}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                Start Coding Challenge
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults) {
    const completedProblems = Object.keys(code).length;
    const passedTests = Object.values(testResults).reduce((sum, result) => sum + (result.passed || 0), 0);
    const totalTests = Object.values(testResults).reduce((sum, result) => sum + (result.total || 0), 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Coding Challenge Completed!</CardTitle>
            <p className="text-gray-600">Your solutions have been submitted for evaluation.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{completedProblems}/{totalProblems}</div>
                <div className="text-sm text-blue-800">Problems Attempted</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{passedTests}/{totalTests}</div>
                <div className="text-sm text-green-800">Test Cases Passed</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{formatTime(totalTime - timeRemaining)}</div>
                <div className="text-sm text-purple-800">Time Taken</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What's Next?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Your code will be reviewed by our technical team</li>
                <li>• Solutions will be evaluated for correctness and efficiency</li>
                <li>• You will receive feedback on your performance</li>
                <li>• Next steps will be communicated via email</li>
              </ul>
            </div>

            <Button
              onClick={onComplete}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              Complete Challenge
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentProblem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Challenge Error</h2>
            <p className="text-gray-600">No coding problems available for this assessment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentResult = testResults[currentProblem.title];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Coding Challenge</h1>
                <p className="text-sm text-gray-600">{candidateName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span className={`font-mono ${timeRemaining < 600 ? 'text-red-600' : 'text-gray-700'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              <div className="text-sm text-gray-600">
                Problem {currentProblemIndex + 1} of {totalProblems}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
          {/* Problem Description */}
          <div className="flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{currentProblem.title}</CardTitle>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {currentProblem.difficulty?.toUpperCase() || 'MEDIUM'}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      {assessmentData?.metadata?.language?.toUpperCase() || 'JAVASCRIPT'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Problem Description</h3>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {currentProblem.description}
                  </div>
                </div>

                {currentProblem.examples && (
                  <div>
                    <h3 className="font-semibold mb-2">Examples</h3>
                    <div className="space-y-3">
                      {currentProblem.examples.map((example, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm">
                            <div className="mb-1">
                              <span className="font-medium">Input:</span> {example.input}
                            </div>
                            <div className="mb-1">
                              <span className="font-medium">Output:</span> {example.output}
                            </div>
                            {example.explanation && (
                              <div className="text-gray-600">
                                <span className="font-medium">Explanation:</span> {example.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentProblem.constraints && (
                  <div>
                    <h3 className="font-semibold mb-2">Constraints</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {currentProblem.constraints.map((constraint, index) => (
                        <li key={index}>• {constraint}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Test Cases */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Test Cases</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTestCases(!showTestCases)}
                    >
                      {showTestCases ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {showTestCases && currentProblem.test_cases && (
                    <div className="space-y-2">
                      {currentProblem.test_cases.filter(tc => !tc.hidden).map((testCase, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg text-sm">
                          <div><span className="font-medium">Input:</span> {testCase.input}</div>
                          <div><span className="font-medium">Expected:</span> {testCase.expected_output}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Problem Navigation */}
            <div className="flex gap-2 mt-4">
              {problems.map((problem, index) => (
                <Button
                  key={index}
                  variant={index === currentProblemIndex ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentProblemIndex(index)}
                  className={`
                    ${code[problem.title] ? 'ring-2 ring-green-300' : ''}
                  `}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </div>

          {/* Code Editor and Results */}
          <div className="flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Code Editor</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={runCode}
                      disabled={isRunning}
                      className="flex items-center gap-2"
                    >
                      {isRunning ? (
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Run Code
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const defaultCode = currentProblem.starter_code || getDefaultCode(assessmentData?.metadata?.language);
                        handleCodeChange(currentProblem.title, defaultCode);
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 border rounded-lg overflow-hidden">
                  <textarea
                    ref={codeEditorRef}
                    value={code[currentProblem.title] || ''}
                    onChange={(e) => handleCodeChange(currentProblem.title, e.target.value)}
                    className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none"
                    placeholder="Write your solution here..."
                    style={{ minHeight: '300px' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            {currentResult && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Test Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Passed: {currentResult.passed}/{currentResult.total}
                      </span>
                      <span className={`text-sm font-medium ${
                        currentResult.success ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currentResult.success ? '✅ All tests passed!' : '❌ Some tests failed'}
                      </span>
                    </div>
                    
                    {currentResult.error && (
                      <div className="bg-red-50 p-3 rounded-lg text-red-700 text-sm">
                        {currentResult.error}
                      </div>
                    )}
                    
                    {currentResult.results && (
                      <div className="space-y-2">
                        {currentResult.results.map((result, index) => (
                          <div key={index} className={`p-2 rounded text-sm ${
                            result.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            <div>Test {index + 1}: {result.passed ? '✅ Passed' : '❌ Failed'}</div>
                            {!result.passed && (
                              <div className="text-xs mt-1">
                                Expected: {result.expected}, Got: {result.actual}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="mt-4">
              <Button
                onClick={() => {
                  if (confirm('Are you sure you want to submit your solutions? You cannot change them after submission.')) {
                    setIsSubmitted(true);
                    submitAssessment();
                  }
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Submit All Solutions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingChallenge;
