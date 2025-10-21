import { useState } from 'react';
import { X, Plus, Trash2, Code, Loader2, Bot, Sparkles } from 'lucide-react';
import axios from 'axios';

export default function CustomQuestionsModal({ isOpen, onClose, onSave, applicationId }) {
  const [questions, setQuestions] = useState([
    {
      question_text: '',
      question_type: 'general',
      expected_answer: '',
      code_snippet: '',
      code_language: 'javascript',
      duration: 180
    }
  ]);
  
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [aiGenerationConfig, setAiGenerationConfig] = useState({
    numQuestions: 5,
    category: 'technical',
    difficulty: 'intermediate',
    jobRole: 'Software Developer'
  });

  const questionTypes = [
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Technical' },
    { value: 'behavioral', label: 'Behavioral' },
    { value: 'coding', label: 'Coding' }
  ];

  const codeLanguages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' }
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
          code_language: q.language || 'javascript',
          duration: q.duration || 180
        }));
        
        setQuestions(generatedQuestions);
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
    setQuestions([
      ...questions,
      {
        question_text: '',
        question_type: 'general',
        expected_answer: '',
        code_snippet: '',
        code_language: 'javascript',
        duration: 180
      }
    ]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleSave = () => {
    // Validate
    const valid = questions.every(q => q.question_text.trim() !== '');
    if (!valid) {
      alert('Please fill in all questions');
      return;
    }
    
    onSave(questions);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Custom Interview Questions</h2>
            <p className="text-sm text-gray-600 mt-1">Create questions that AI will ask during the interview</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* AI Question Generation Section */}
        <div className="px-6 pt-6">
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


        {/* Manual Questions Section */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Manual Questions</h3>
            <span className="text-sm text-gray-500">{questions.length} question(s)</span>
          </div>
        </div>

        {/* Questions */}
        <div className="px-6 space-y-6">
          {questions.map((question, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6 relative">
              {/* Question Number & Delete */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-gray-900">Question {index + 1}</h3>
                </div>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(index)}
                    className="text-red-600 hover:text-red-700 p-2"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Question Text */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={question.question_text}
                  onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                  placeholder="E.g., Can you explain the difference between var, let, and const in JavaScript?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                />
              </div>

              {/* Type and Duration */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Type
                  </label>
                  <select
                    value={question.question_type}
                    onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {questionTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={question.duration}
                    onChange={(e) => updateQuestion(index, 'duration', parseInt(e.target.value) || 180)}
                    min="30"
                    max="600"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Code Snippet (Optional) */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-4 w-4 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Code Snippet (Optional)
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select
                    value={question.code_language}
                    onChange={(e) => updateQuestion(index, 'code_language', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {codeLanguages.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={question.code_snippet}
                  onChange={(e) => updateQuestion(index, 'code_snippet', e.target.value)}
                  placeholder="Paste code snippet here (if applicable)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  rows="4"
                />
              </div>

              {/* Expected Answer (Reference for HR) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Answer <span className="text-xs text-gray-500">(for your reference)</span>
                </label>
                <textarea
                  value={question.expected_answer}
                  onChange={(e) => updateQuestion(index, 'expected_answer', e.target.value)}
                  placeholder="What you expect as a good answer (helps AI evaluate better)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="2"
                />
              </div>
            </div>
          ))}

          {/* Add Question Button */}
          <button
            onClick={addQuestion}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-indigo-600 hover:border-indigo-600 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="h-5 w-5" />
            Add Another Question
          </button>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <strong>{questions.length}</strong> questions • 
            <strong className="ml-2">{Math.ceil(questions.reduce((sum, q) => sum + q.duration, 0) / 60)}</strong> minutes estimated
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Save Questions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
