import { useState } from 'react';
import { Plus, Trash2, Save, X, Bot, Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function ManualQuestionEntry({ isOpen, onClose, onSave }) {
  const [questionsByLevel, setQuestionsByLevel] = useState({
    easy: [],
    intermediate: [],
    advanced: []
  });

  const [counts, setCounts] = useState({
    easy: 3,
    intermediate: 3,
    advanced: 2
  });

  const [currentLevel, setCurrentLevel] = useState('easy');
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'technical',
    duration: 180,
    code_snippet: '',
    expected_answer: '',
    answer_mode: 'write' // Default to 'write' (more reliable)
  });

  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [aiGenerationConfig, setAiGenerationConfig] = useState({
    numQuestions: 5,
    category: 'technical',
    difficulty: 'intermediate',
    jobRole: 'Software Developer'
  });

  const levels = [
    { id: 'easy', label: 'Easy', color: 'green' },
    { id: 'intermediate', label: 'Intermediate', color: 'yellow' },
    { id: 'advanced', label: 'Advanced', color: 'red' }
  ];

  const questionTypes = [
    { value: 'technical', label: 'Technical' },
    { value: 'behavioral', label: 'Behavioral' },
    { value: 'coding', label: 'Coding' },
    { value: 'general', label: 'General' }
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
          question_text: q.text,
          question_type: aiGenerationConfig.category,
          expected_answer: q.expected_answer || '',
          code_snippet: q.code_snippet || '',
          duration: q.duration || 180,
          answer_mode: 'write',
          difficulty: aiGenerationConfig.difficulty,
          id: Date.now() + Math.random()
        }));
        
        // Add generated questions to the appropriate difficulty level
        setQuestionsByLevel({
          ...questionsByLevel,
          [aiGenerationConfig.difficulty]: [
            ...questionsByLevel[aiGenerationConfig.difficulty],
            ...generatedQuestions
          ]
        });
        
        alert(`✅ Successfully generated ${generatedQuestions.length} ${aiGenerationConfig.difficulty} ${aiGenerationConfig.category} questions for ${aiGenerationConfig.jobRole}!`);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Failed to generate questions: ' + (error.response?.data?.error || error.message));
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const addQuestion = () => {
    if (!newQuestion.question_text.trim()) {
      alert('Please enter a question');
      return;
    }

    const question = {
      ...newQuestion,
      difficulty: currentLevel,
      id: Date.now()
    };

    setQuestionsByLevel({
      ...questionsByLevel,
      [currentLevel]: [...questionsByLevel[currentLevel], question]
    });

    // Reset form (but keep answer_mode for convenience)
    setNewQuestion({
      question_text: '',
      question_type: 'technical',
      duration: 180,
      code_snippet: '',
      expected_answer: '',
      answer_mode: newQuestion.answer_mode  // Keep the same answer mode
    });
  };

  const removeQuestion = (level, questionId) => {
    setQuestionsByLevel({
      ...questionsByLevel,
      [level]: questionsByLevel[level].filter(q => q.id !== questionId)
    });
  };

  const handleSave = () => {
    const allQuestions = [
      ...questionsByLevel.easy,
      ...questionsByLevel.intermediate,
      ...questionsByLevel.advanced
    ];

    if (allQuestions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    onSave(allQuestions);
    onClose();
  };

  const getTotalQuestions = () => {
    return questionsByLevel.easy.length + 
           questionsByLevel.intermediate.length + 
           questionsByLevel.advanced.length;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[85vh] my-auto overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-2xl font-bold">Add Interview Questions Manually</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* AI Question Generation Section */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-dashed border-green-300 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Bot className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-600" />
                    AI Question Generator
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Let AI automatically generate interview questions based on job role, category, and difficulty level.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Number of Questions</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={aiGenerationConfig.numQuestions}
                        onChange={(e) => setAiGenerationConfig({...aiGenerationConfig, numQuestions: parseInt(e.target.value) || 5})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={aiGenerationConfig.category}
                        onChange={(e) => setAiGenerationConfig({...aiGenerationConfig, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      >
                        <option value="technical">Technical</option>
                        <option value="behavioral">Behavioral</option>
                        <option value="general">General</option>
                        <option value="coding">Coding</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
                      <select
                        value={aiGenerationConfig.difficulty}
                        onChange={(e) => setAiGenerationConfig({...aiGenerationConfig, difficulty: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      >
                        <option value="easy">Easy</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Job Role</label>
                      <input
                        type="text"
                        value={aiGenerationConfig.jobRole}
                        onChange={(e) => setAiGenerationConfig({...aiGenerationConfig, jobRole: e.target.value})}
                        placeholder="e.g., Frontend Developer"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={generateAIQuestions}
                    disabled={generatingQuestions}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-6 py-2 rounded-lg transition-all font-medium"
                  >
                    {generatingQuestions ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating Questions...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Generate {aiGenerationConfig.numQuestions} Questions</span>
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-gray-500 mt-3">
                    💡 AI will create {aiGenerationConfig.numQuestions} {aiGenerationConfig.difficulty} {aiGenerationConfig.category} questions for {aiGenerationConfig.jobRole} role
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Level Selector & Count */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Choose Difficulty Level</h3>
            <div className="grid grid-cols-3 gap-4">
              {levels.map(level => (
                <button
                  key={level.id}
                  onClick={() => setCurrentLevel(level.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    currentLevel === level.id
                      ? `border-${level.color}-500 bg-${level.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${
                      currentLevel === level.id ? `text-${level.color}-700` : 'text-gray-700'
                    }`}>
                      {level.label}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                      currentLevel === level.id
                        ? `bg-${level.color}-200 text-${level.color}-800`
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {questionsByLevel[level.id].length}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Target: {counts[level.id]} questions
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Question Form */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Add {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)} Question
            </h3>
            
            <div className="space-y-4">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newQuestion.question_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                  placeholder="Enter your interview question..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Question Type & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={newQuestion.question_type}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {questionTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
                  <input
                    type="number"
                    value={newQuestion.duration}
                    onChange={(e) => setNewQuestion({ ...newQuestion, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    min={60}
                    max={600}
                  />
                </div>
              </div>
              
              {/* Answer Mode Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-blue-700 font-semibold text-sm">🎤✍️ Hybrid Mode</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  All questions support BOTH voice and typing. Candidates can use whichever method works best for them!
                </p>
              </div>

              {/* Optional Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code Snippet (Optional)
                </label>
                <textarea
                  value={newQuestion.code_snippet}
                  onChange={(e) => setNewQuestion({ ...newQuestion, code_snippet: e.target.value })}
                  placeholder="Add code snippet if this is a coding question..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Answer (Optional)
                </label>
                <textarea
                  value={newQuestion.expected_answer}
                  onChange={(e) => setNewQuestion({ ...newQuestion, expected_answer: e.target.value })}
                  placeholder="What should the candidate focus on in their answer..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>

              <button
                onClick={addQuestion}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-semibold"
              >
                <Plus className="h-5 w-5" />
                Add Question to {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)} Level
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">
              Added Questions ({getTotalQuestions()} total)
            </h3>

            {levels.map(level => (
              questionsByLevel[level.id].length > 0 && (
                <div key={level.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className={`font-semibold text-${level.color}-700 mb-3`}>
                    {level.label} ({questionsByLevel[level.id].length})
                  </h4>
                  <div className="space-y-2">
                    {questionsByLevel[level.id].map((q, idx) => (
                      <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-gray-700">Q{idx + 1}:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-${level.color}-100 text-${level.color}-800`}>
                              {q.question_type}
                            </span>
                            <span className="text-xs text-gray-500">{q.duration}s</span>
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                              🎤✍️ Hybrid
                            </span>
                            {q.code_snippet && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                💻 Code
                              </span>
                            )}
                          </div>
                          <p className="text-gray-800">{q.question_text}</p>
                          {q.code_snippet && (
                            <pre className="mt-2 bg-gray-100 p-2 rounded text-xs text-gray-700 overflow-x-auto">
                              {q.code_snippet.substring(0, 100)}{q.code_snippet.length > 100 ? '...' : ''}
                            </pre>
                          )}
                        </div>
                        <button
                          onClick={() => removeQuestion(level.id, q.id)}
                          className="text-red-600 hover:text-red-700 p-2 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}

            {getTotalQuestions() === 0 && (
              <div className="text-center py-8 text-gray-500">
                No questions added yet. Add your first question above!
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed at Bottom */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{getTotalQuestions()}</span> questions added
            <span className="mx-2">•</span>
            <span className="text-green-600">{questionsByLevel.easy.length} Easy</span>
            <span className="mx-2">•</span>
            <span className="text-yellow-600">{questionsByLevel.intermediate.length} Intermediate</span>
            <span className="mx-2">•</span>
            <span className="text-red-600">{questionsByLevel.advanced.length} Advanced</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-semibold transition-colors"
            >
              <Save className="h-4 w-4" />
              Save All Questions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
