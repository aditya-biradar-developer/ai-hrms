import { useState } from 'react';
import { Plus, Trash2, Save, X, Bot, Sparkles, Loader2, Clock, Code, Brain, Users, Target, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function ManualQuestionEntry({ isOpen, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('ai-generator');
  const [questionsByCategory, setQuestionsByCategory] = useState({
    technical: [],
    behavioral: [],
    general: [],
    coding: []
  });

  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [aiGenerationConfig, setAiGenerationConfig] = useState({
    numQuestions: 5,
    category: 'technical',
    difficulty: 'intermediate',
    jobRole: 'Software Developer'
  });

  const [manualQuestion, setManualQuestion] = useState({
    question_text: '',
    question_type: 'technical',
    duration: 180,
    code_snippet: '',
    expected_answer: '',
    difficulty: 'intermediate'
  });

  const categories = [
    { 
      id: 'technical', 
      label: 'Technical', 
      icon: Code, 
      color: 'blue',
      description: 'Technical skills and knowledge'
    },
    { 
      id: 'behavioral', 
      label: 'Behavioral', 
      icon: Users, 
      color: 'green',
      description: 'Soft skills and teamwork'
    },
    { 
      id: 'general', 
      label: 'General', 
      icon: Brain, 
      color: 'purple',
      description: 'General knowledge and experience'
    },
    { 
      id: 'coding', 
      label: 'Coding', 
      icon: Target, 
      color: 'orange',
      description: 'Programming and algorithms'
    }
  ];

  const difficulties = [
    { id: 'easy', label: 'Easy', color: 'green', description: 'Entry level questions' },
    { id: 'intermediate', label: 'Intermediate', color: 'yellow', description: 'Mid-level questions' },
    { id: 'advanced', label: 'Advanced', color: 'red', description: 'Senior level questions' }
  ];

  const generateAIQuestions = async () => {
    try {
      setGeneratingQuestions(true);
      
      const response = await axios.post(
        'http://localhost:5001/api/ai/interview/generate-questions',
        {
          job_role: aiGenerationConfig.jobRole,
          category: aiGenerationConfig.category,
          difficulty: aiGenerationConfig.difficulty,
          num_questions: aiGenerationConfig.numQuestions
        }
      );
      
      if (response.data.success) {
        const generatedQuestions = response.data.data.questions.map(q => ({
          id: Date.now() + Math.random(),
          question_text: q.text,
          question_type: aiGenerationConfig.category,
          expected_answer: q.expected_answer || '',
          code_snippet: q.code_snippet || '',
          duration: q.duration || 180,
          difficulty: aiGenerationConfig.difficulty,
          source: 'ai'
        }));
        
        // Add to the appropriate category
        setQuestionsByCategory(prev => ({
          ...prev,
          [aiGenerationConfig.category]: [
            ...prev[aiGenerationConfig.category],
            ...generatedQuestions
          ]
        }));
        
        // Show success message
        const successMsg = `✅ Generated ${generatedQuestions.length} ${aiGenerationConfig.difficulty} ${aiGenerationConfig.category} questions!`;
        alert(successMsg);
        
        // Switch to the category tab to show generated questions
        setActiveTab(aiGenerationConfig.category);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Failed to generate questions: ' + (error.response?.data?.error || error.message));
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const addManualQuestion = () => {
    if (!manualQuestion.question_text.trim()) {
      alert('Please enter a question');
      return;
    }

    const question = {
      ...manualQuestion,
      id: Date.now(),
      source: 'manual'
    };

    setQuestionsByCategory(prev => ({
      ...prev,
      [manualQuestion.question_type]: [
        ...prev[manualQuestion.question_type],
        question
      ]
    }));

    // Reset form
    setManualQuestion({
      question_text: '',
      question_type: 'technical',
      duration: 180,
      code_snippet: '',
      expected_answer: '',
      difficulty: 'intermediate'
    });

    // Switch to the category tab
    setActiveTab(manualQuestion.question_type);
  };

  const removeQuestion = (category, questionId) => {
    setQuestionsByCategory(prev => ({
      ...prev,
      [category]: prev[category].filter(q => q.id !== questionId)
    }));
  };

  const handleSave = () => {
    const allQuestions = Object.values(questionsByCategory).flat();
    
    if (allQuestions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    onSave(allQuestions);
    onClose();
  };

  const getTotalQuestions = () => {
    return Object.values(questionsByCategory).reduce((total, questions) => total + questions.length, 0);
  };

  const getCategoryCount = (categoryId) => {
    return questionsByCategory[categoryId].length;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Interview Question Builder</h2>
            <p className="text-indigo-100 text-sm">Create and manage AI-powered interview questions</p>
          </div>
          <button 
            onClick={onClose} 
            className="hover:bg-white/20 p-3 rounded-xl transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-50 border-b px-8 py-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('ai-generator')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'ai-generator'
                  ? 'bg-green-100 text-green-700 border-2 border-green-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Generator
              </div>
            </button>
            <button
              onClick={() => setActiveTab('manual-entry')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'manual-entry'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Manual Entry
              </div>
            </button>
            {categories.map(category => {
              const Icon = category.icon;
              const count = getCategoryCount(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all relative ${
                    activeTab === category.id
                      ? `bg-${category.color}-100 text-${category.color}-700 border-2 border-${category.color}-200`
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {category.label}
                    {count > 0 && (
                      <span className={`ml-1 px-2 py-0.5 text-xs rounded-full bg-${category.color}-500 text-white`}>
                        {count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* AI Generator Tab */}
          {activeTab === 'ai-generator' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200 rounded-2xl p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">AI Question Generator</h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Leverage advanced AI to generate contextual, role-specific interview questions tailored to your requirements
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Number of Questions</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={aiGenerationConfig.numQuestions}
                      onChange={(e) => setAiGenerationConfig({...aiGenerationConfig, numQuestions: parseInt(e.target.value) || 5})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Category</label>
                    <select
                      value={aiGenerationConfig.category}
                      onChange={(e) => setAiGenerationConfig({...aiGenerationConfig, category: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Difficulty Level</label>
                    <select
                      value={aiGenerationConfig.difficulty}
                      onChange={(e) => setAiGenerationConfig({...aiGenerationConfig, difficulty: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    >
                      {difficulties.map(diff => (
                        <option key={diff.id} value={diff.id}>{diff.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Job Role</label>
                    <input
                      type="text"
                      value={aiGenerationConfig.jobRole}
                      onChange={(e) => setAiGenerationConfig({...aiGenerationConfig, jobRole: e.target.value})}
                      placeholder="e.g., Senior React Developer"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="text-center">
                  <button
                    onClick={generateAIQuestions}
                    disabled={generatingQuestions}
                    className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 disabled:scale-100 shadow-lg"
                  >
                    {generatingQuestions ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Generate {aiGenerationConfig.numQuestions} Questions
                      </>
                    )}
                  </button>
                  
                  <p className="text-sm text-gray-500 mt-4">
                    AI will create {aiGenerationConfig.numQuestions} {aiGenerationConfig.difficulty} {aiGenerationConfig.category} questions for {aiGenerationConfig.jobRole}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manual Entry Tab */}
          {activeTab === 'manual-entry' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Manual Question Entry</h3>
                  <p className="text-gray-600">
                    Create custom interview questions with your specific requirements
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Category</label>
                      <select
                        value={manualQuestion.question_type}
                        onChange={(e) => setManualQuestion({...manualQuestion, question_type: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Difficulty</label>
                      <select
                        value={manualQuestion.difficulty}
                        onChange={(e) => setManualQuestion({...manualQuestion, difficulty: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {difficulties.map(diff => (
                          <option key={diff.id} value={diff.id}>{diff.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duration (seconds)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="600"
                        value={manualQuestion.duration}
                        onChange={(e) => setManualQuestion({...manualQuestion, duration: parseInt(e.target.value) || 180})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Question Text *</label>
                    <textarea
                      value={manualQuestion.question_text}
                      onChange={(e) => setManualQuestion({...manualQuestion, question_text: e.target.value})}
                      placeholder="Enter your interview question here..."
                      rows="4"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Expected Answer (Optional)</label>
                    <textarea
                      value={manualQuestion.expected_answer}
                      onChange={(e) => setManualQuestion({...manualQuestion, expected_answer: e.target.value})}
                      placeholder="What would be a good answer to this question?"
                      rows="3"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Code Snippet (Optional)
                    </label>
                    <textarea
                      value={manualQuestion.code_snippet}
                      onChange={(e) => setManualQuestion({...manualQuestion, code_snippet: e.target.value})}
                      placeholder="Add code snippet if relevant..."
                      rows="4"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
                    />
                  </div>

                  <div className="text-center">
                    <button
                      onClick={addManualQuestion}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
                    >
                      <Plus className="h-5 w-5" />
                      Add Question
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Tabs */}
          {categories.map(category => {
            if (activeTab !== category.id) return null;
            
            const Icon = category.icon;
            const questions = questionsByCategory[category.id];
            
            return (
              <div key={category.id} className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <div className={`w-16 h-16 bg-${category.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`h-8 w-8 text-${category.color}-600`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{category.label} Questions</h3>
                  <p className="text-gray-600">{category.description}</p>
                  <div className="mt-4">
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-${category.color}-100 text-${category.color}-800`}>
                      {questions.length} question{questions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No {category.label.toLowerCase()} questions yet</p>
                    <p className="text-gray-400 text-sm mt-2">Use the AI Generator or Manual Entry to add questions</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {questions.map((question, index) => (
                      <div key={question.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full bg-${category.color}-600 text-white flex items-center justify-center font-bold text-sm`}>
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">Question {index + 1}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full bg-${question.difficulty === 'easy' ? 'green' : question.difficulty === 'intermediate' ? 'yellow' : 'red'}-100 text-${question.difficulty === 'easy' ? 'green' : question.difficulty === 'intermediate' ? 'yellow' : 'red'}-800`}>
                                  {question.difficulty}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${question.source === 'ai' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {question.source === 'ai' ? '🤖 AI Generated' : '✏️ Manual'}
                                </span>
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {question.duration}s
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeQuestion(category.id, question.id)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Question:</h5>
                            <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{question.question_text}</p>
                          </div>

                          {question.code_snippet && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                Code Snippet:
                              </h5>
                              <pre className="text-sm bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                                <code>{question.code_snippet}</code>
                              </pre>
                            </div>
                          )}

                          {question.expected_answer && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Expected Answer:</h5>
                              <p className="text-gray-700 bg-blue-50 p-4 rounded-lg text-sm">{question.expected_answer}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <strong>{getTotalQuestions()}</strong> total questions
            </div>
            <div className="text-sm text-gray-500">
              Estimated duration: <strong>{Math.ceil(Object.values(questionsByCategory).flat().reduce((sum, q) => sum + q.duration, 0) / 60)}</strong> minutes
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg"
            >
              Save All Questions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
