import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  X, 
  Sparkles, 
  Brain, 
  Code, 
  MessageCircle, 
  Video,
  Plus,
  Trash2,
  Loader2,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';

const RoundQuestionGenerator = ({ 
  isOpen, 
  onClose, 
  onSave, 
  roundType = 'aptitude',
  jobTitle = 'Software Developer',
  applicationId 
}) => {
  const [loading, setLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]); // Store all generated questions from multiple generations
  const [showPreview, setShowPreview] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set()); // Track expanded questions
  const [config, setConfig] = useState({
    aptitude: {
      topics: [],
      topicQuestions: {}, // Store { topicId: { easy: 2, medium: 2, hard: 2 } }
      timePerQuestion: 60
    },
    coding: {
      difficulty: 'medium',
      language: 'javascript',
      problemCount: 3,
      timeLimit: 90
    },
    communication: {
      skills: [], // reading, listening, grammar
      reading: {
        // Paragraphs for reading aloud - AI evaluates pronunciation
        easy: 0,
        medium: 0, 
        hard: 0
      },
      listening: {
        sentences: {
          // AI says sentence, candidate repeats
          easy: 0,
          medium: 0,
          hard: 0
        }
      },
      grammar: {
        topics: [], // Selected grammar topics
        topicQuestions: {} // { topicId: { easy: 2, medium: 2, hard: 2 } }
      },
      timeLimit: 30
    },
    faceToFace: {
      questionCount: 10,
      aiPersonality: 'professional',
      duration: 45,
      includeFollowUps: true
    }
  });

  const aptitudeTopics = [
    { id: 'logical_reasoning', name: 'Logical Reasoning', description: 'Pattern recognition, sequences' },
    { id: 'quantitative_aptitude', name: 'Quantitative Aptitude', description: 'Math, statistics' },
    { id: 'verbal_ability', name: 'Verbal Ability', description: 'Grammar, vocabulary' },
    { id: 'technical_aptitude', name: 'Technical Aptitude', description: 'Programming concepts' },
    { id: 'analytical_thinking', name: 'Analytical Thinking', description: 'Problem solving' }
  ];

  const communicationSkills = [
    { id: 'reading', name: 'Reading', icon: '📖', description: 'Read paragraphs aloud for pronunciation evaluation' },
    { id: 'listening', name: 'Listening', icon: '👂', description: 'Listen and repeat sentences for pronunciation practice' },
    { id: 'grammar', name: 'Grammar', icon: '📝', description: 'Multiple choice questions on grammar topics' }
  ];

  const grammarTopics = [
    { id: 'tenses', name: 'Tenses' },
    { id: 'articles', name: 'Articles (a, an, the)' },
    { id: 'prepositions', name: 'Prepositions' },
    { id: 'subject_verb_agreement', name: 'Subject-Verb Agreement' },
    { id: 'pronouns', name: 'Pronouns' },
    { id: 'adjectives_adverbs', name: 'Adjectives & Adverbs' },
    { id: 'conditionals', name: 'Conditionals' },
    { id: 'passive_voice', name: 'Passive Voice' },
    { id: 'reported_speech', name: 'Reported Speech' },
    { id: 'sentence_structure', name: 'Sentence Structure' }
  ];

  const programmingLanguages = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'cpp', name: 'C++' },
    { id: 'c', name: 'C' }
  ];

  const toggleTopic = (topic) => {
    const currentTopics = config.aptitude.topics;
    const isRemoving = currentTopics.includes(topic);
    const newTopics = isRemoving
      ? currentTopics.filter(t => t !== topic)
      : [...currentTopics, topic];
    
    const newTopicQuestions = { ...config.aptitude.topicQuestions };
    if (isRemoving) {
      delete newTopicQuestions[topic];
    } else {
      // Initialize with default values when topic is selected
      newTopicQuestions[topic] = { easy: 0, medium: 0, hard: 0 };
    }
    
    setConfig(prev => ({
      ...prev,
      aptitude: { 
        ...prev.aptitude, 
        topics: newTopics,
        topicQuestions: newTopicQuestions
      }
    }));
  };

  const setTopicDifficultyCount = (topicId, difficulty, count) => {
    setConfig(prev => ({
      ...prev,
      aptitude: {
        ...prev.aptitude,
        topicQuestions: {
          ...prev.aptitude.topicQuestions,
          [topicId]: {
            ...prev.aptitude.topicQuestions[topicId],
            [difficulty]: parseInt(count) || 0
          }
        }
      }
    }));
  };


  const toggleSkill = (skill) => {
    const currentSkills = config.communication.skills;
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];
    
    setConfig(prev => ({
      ...prev,
      communication: { ...prev.communication, skills: newSkills }
    }));
  };

  // Grammar topic management
  const toggleGrammarTopic = (topic) => {
    const currentTopics = config.communication.grammar.topics;
    const isRemoving = currentTopics.includes(topic);
    const newTopics = isRemoving
      ? currentTopics.filter(t => t !== topic)
      : [...currentTopics, topic];
    
    const newTopicQuestions = { ...config.communication.grammar.topicQuestions };
    if (isRemoving) {
      delete newTopicQuestions[topic];
    } else {
      // Initialize with default values when topic is selected
      newTopicQuestions[topic] = { easy: 1, medium: 1, hard: 1 };
    }
    
    setConfig(prev => ({
      ...prev,
      communication: { 
        ...prev.communication, 
        grammar: {
          ...prev.communication.grammar,
          topics: newTopics,
          topicQuestions: newTopicQuestions
        }
      }
    }));
  };

  const setGrammarTopicDifficultyCount = (topicId, difficulty, count) => {
    setConfig(prev => ({
      ...prev,
      communication: {
        ...prev.communication,
        grammar: {
          ...prev.communication.grammar,
          topicQuestions: {
            ...prev.communication.grammar.topicQuestions,
            [topicId]: {
              ...prev.communication.grammar.topicQuestions[topicId],
              [difficulty]: parseInt(count) || 0
            }
          }
        }
      }
    }));
  };

  // Reading questions management
  const setReadingCount = (difficulty, count) => {
    setConfig(prev => ({
      ...prev,
      communication: {
        ...prev.communication,
        reading: {
          ...prev.communication.reading,
          [difficulty]: parseInt(count) || 0
        }
      }
    }));
  };

  // Listening sentences management
  const setListeningSentenceCount = (difficulty, count) => {
    setConfig(prev => ({
      ...prev,
      communication: {
        ...prev.communication,
        listening: {
          ...prev.communication.listening,
          sentences: {
            ...prev.communication.listening.sentences,
            [difficulty]: parseInt(count) || 0
          }
        }
      }
    }));
  };


  const generateQuestions = async () => {
    setLoading(true);
    try {
      // Prepare config with exact counts
      let requestConfig = { ...config[roundType] };
      
      // For aptitude, use new topic-based difficulty structure
      if (roundType === 'aptitude') {
        // Build detailed topic configuration with per-topic difficulty counts
        const topicConfigs = config.aptitude.topics.map(topicId => {
          const counts = config.aptitude.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
          return {
            topic: topicId,
            easy: counts.easy,
            medium: counts.medium,
            hard: counts.hard,
            total: counts.easy + counts.medium + counts.hard
          };
        });
        
        requestConfig = {
          topics: config.aptitude.topics,
          topicConfigs: topicConfigs,
          timePerQuestion: config.aptitude.timePerQuestion,
          exactCount: true
        };
      }
      
      // For communication, use new structured approach
      if (roundType === 'communication') {
        requestConfig = {
          skills: config.communication.skills,
          reading: config.communication.reading,
          listening: config.communication.listening,
          grammar: {
            topics: config.communication.grammar.topics,
            topicQuestions: config.communication.grammar.topicQuestions
          },
          timeLimit: config.communication.timeLimit,
          exactCount: true
        };
        console.log('🔍 Communication config being sent:', requestConfig);
      }
      
      const response = await axios.post('http://localhost:5001/api/ai/generate-questions', {
        roundType,
        config: requestConfig,
        jobTitle,
        jobDescription: ''
      });

      if (response.data.success) {
        const questions = response.data.questions || response.data.problems || response.data.challenges || [];
        
        // Validate exact count for aptitude
        if (roundType === 'aptitude') {
          const expectedCount = config.aptitude.topics.reduce((total, topicId) => {
            const counts = config.aptitude.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
            return total + counts.easy + counts.medium + counts.hard;
          }, 0);
          
          if (questions.length !== expectedCount) {
            console.warn(`Expected ${expectedCount} questions but got ${questions.length}`);
          }
        }
        
        // Validate exact count for communication
        if (roundType === 'communication') {
          let expectedCount = 0;
          
          // Count reading questions
          const readingCount = config.communication.reading.easy + 
                              config.communication.reading.medium + 
                              config.communication.reading.hard;
          expectedCount += readingCount;
          
          // Count listening sentence questions
          const listeningCount = config.communication.listening.sentences.easy + 
                                config.communication.listening.sentences.medium + 
                                config.communication.listening.sentences.hard;
          expectedCount += listeningCount;
          
          // Count grammar questions
          const grammarCount = config.communication.grammar.topics.reduce((total, topicId) => {
            const counts = config.communication.grammar.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
            return total + counts.easy + counts.medium + counts.hard;
          }, 0);
          expectedCount += grammarCount;
          
          // Calculate current total including previously generated questions
          const currentTotal = allQuestions.length + questions.length;
          
          if (questions.length !== expectedCount) {
            console.warn(`Expected ${expectedCount} questions but got ${questions.length}`);
          }
          
          // Store progress info for display
          window.communicationProgress = {
            generated: currentTotal,
            expected: expectedCount,
            reading: readingCount,
            listening: listeningCount,
            grammar: grammarCount
          };
        }
        
        setGeneratedQuestions(questions);
        // Add to all questions collection
        setAllQuestions(prev => [...prev, ...questions]);
        setShowPreview(true);
        
        // Show progress-aware message for communication assessments
        if (roundType === 'communication' && window.communicationProgress) {
          const { generated, expected, reading, listening, grammar } = window.communicationProgress;
          const missing = expected - generated;
          
          if (missing > 0) {
            alert(`✅ Generated ${questions.length} questions this batch!\n\n📊 Progress: ${generated}/${expected} questions\n📖 Reading: ${reading} questions\n🎧 Listening: ${listening} questions\n📝 Grammar: ${grammar} questions\n\n⚠️ ${missing} questions still missing - click "Generate Remaining Questions" to retry!`);
          } else {
            alert(`🎉 All ${generated} communication questions generated successfully!\n\n📖 Reading: ${reading} questions\n🎧 Listening: ${listening} questions\n📝 Grammar: ${grammar} questions\n\n✅ Ready to save and schedule assessment!`);
          }
        } else {
          alert(`✅ Generated ${questions.length} ${roundType} questions successfully! You can generate more or save these.`);
        }
      } else {
        throw new Error(response.data.message || 'Failed to generate questions');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('❌ Failed to generate questions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeQuestion = (index) => {
    setAllQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllQuestions = () => {
    if (confirm('Are you sure you want to clear all generated questions?')) {
      setAllQuestions([]);
      setGeneratedQuestions([]);
      setShowPreview(false);
    }
  };

  const handleSave = () => {
    if (allQuestions.length === 0) {
      alert('Please generate questions first!');
      return;
    }
    onSave(allQuestions);
    onClose();
  };

  if (!isOpen) return null;

  const getRoundIcon = () => {
    switch (roundType) {
      case 'aptitude': return <Brain className="w-6 h-6" />;
      case 'coding': return <Code className="w-6 h-6" />;
      case 'communication': return <MessageCircle className="w-6 h-6" />;
      case 'faceToFace': return <Video className="w-6 h-6" />;
      default: return <Sparkles className="w-6 h-6" />;
    }
  };

  const getRoundTitle = () => {
    switch (roundType) {
      case 'aptitude': return 'Aptitude Assessment Generator';
      case 'coding': return 'Coding Challenge Generator';
      case 'communication': return 'Communication Assessment Generator';
      case 'faceToFace': return 'AI Interview Question Generator';
      default: return 'Question Generator';
    }
  };

  const getRoundColor = () => {
    switch (roundType) {
      case 'aptitude': return 'from-purple-500 to-indigo-600';
      case 'coding': return 'from-green-500 to-blue-600';
      case 'communication': return 'from-blue-500 to-cyan-600';
      case 'faceToFace': return 'from-orange-500 to-red-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getRoundColor()} text-white p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getRoundIcon()}
              <div>
                <h2 className="text-2xl font-bold">{getRoundTitle()}</h2>
                <p className="text-sm opacity-90">AI-powered question generation for {jobTitle}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Aptitude Configuration */}
          {roundType === 'aptitude' && (
            <div className="space-y-6">
              {/* Topics Selection with Difficulty Inputs */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">Select Topics & Configure Questions</Label>
                <div className="space-y-3">
                  {aptitudeTopics.map(topic => {
                    const isSelected = config.aptitude.topics.includes(topic.id);
                    const topicCounts = config.aptitude.topicQuestions[topic.id] || { easy: 0, medium: 0, hard: 0 };
                    const topicTotal = topicCounts.easy + topicCounts.medium + topicCounts.hard;
                    
                    return (
                      <div
                        key={topic.id}
                        className={`border-2 rounded-lg transition-all ${
                          isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                        }`}
                      >
                        <label className="flex items-start gap-3 p-4 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTopic(topic.id)}
                            className="mt-1 w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{topic.name}</div>
                            <div className="text-sm text-gray-600">{topic.description}</div>
                          </div>
                          {isSelected && topicTotal > 0 && (
                            <div className="text-sm font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                              {topicTotal} questions
                            </div>
                          )}
                        </label>
                        
                        {/* Show difficulty inputs when topic is selected */}
                        {isSelected && (
                          <div className="px-4 pb-4 border-t border-purple-200">
                            <Label className="text-sm font-medium text-gray-700 mb-3 block mt-3">
                              How many questions for each difficulty?
                            </Label>
                            <div className="grid grid-cols-3 gap-3">
                              {/* Easy */}
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">Easy</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={topicCounts.easy}
                                  onChange={(e) => setTopicDifficultyCount(topic.id, 'easy', e.target.value)}
                                  className="w-full text-center"
                                  placeholder="0"
                                />
                              </div>
                              
                              {/* Medium */}
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">Medium</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={topicCounts.medium}
                                  onChange={(e) => setTopicDifficultyCount(topic.id, 'medium', e.target.value)}
                                  className="w-full text-center"
                                  placeholder="0"
                                />
                              </div>
                              
                              {/* Hard */}
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">Hard</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={topicCounts.hard}
                                  onChange={(e) => setTopicDifficultyCount(topic.id, 'hard', e.target.value)}
                                  className="w-full text-center"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            {topicTotal > 0 && (
                              <p className="text-xs text-gray-600 mt-2 text-center">
                                Total for this topic: <span className="font-semibold text-purple-700">{topicTotal} questions</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Time per Question */}
              <div>
                <Label>Time per Question (seconds)</Label>
                <Input type="number" min="30" max="180" value={config.aptitude.timePerQuestion} onChange={(e) => setConfig(prev => ({ ...prev, aptitude: { ...prev.aptitude, timePerQuestion: parseInt(e.target.value) || 60 } }))} className="mt-1" />
              </div>

              {/* Generation Summary */}
              {config.aptitude.topics.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">📊 Generation Summary:</h4>
                  <div className="space-y-3 text-sm text-blue-800">
                    {config.aptitude.topics.map(topicId => {
                      const topic = aptitudeTopics.find(t => t.id === topicId);
                      const counts = config.aptitude.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
                      const topicTotal = counts.easy + counts.medium + counts.hard;
                      
                      if (topicTotal === 0) return null;
                      
                      return (
                        <div key={topicId} className="pb-2 border-b border-blue-200 last:border-0">
                          <div className="font-semibold">{topic?.name}:</div>
                          <ul className="ml-4 mt-1 space-y-0.5">
                            {counts.easy > 0 && (
                              <li>• <span className="text-green-700 font-medium">Easy:</span> {counts.easy} questions</li>
                            )}
                            {counts.medium > 0 && (
                              <li>• <span className="text-yellow-700 font-medium">Medium:</span> {counts.medium} questions</li>
                            )}
                            {counts.hard > 0 && (
                              <li>• <span className="text-red-700 font-medium">Hard:</span> {counts.hard} questions</li>
                            )}
                          </ul>
                          <div className="text-xs text-gray-600 mt-1 ml-4">
                            Subtotal: {topicTotal} questions
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="pt-2 border-t-2 border-blue-300 font-semibold text-base">
                      Total Questions: {
                        config.aptitude.topics.reduce((total, topicId) => {
                          const counts = config.aptitude.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
                          return total + counts.easy + counts.medium + counts.hard;
                        }, 0)
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Coding Configuration */}
          {roundType === 'coding' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Difficulty Level</Label>
                  <select
                    value={config.coding.difficulty}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      coding: { ...prev.coding, difficulty: e.target.value }
                    }))}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="easy">Easy - Basic algorithms</option>
                    <option value="medium">Medium - Data structures</option>
                    <option value="hard">Hard - Complex algorithms</option>
                  </select>
                </div>
                <div>
                  <Label>Programming Language</Label>
                  <select
                    value={config.coding.language}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      coding: { ...prev.coding, language: e.target.value }
                    }))}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    {programmingLanguages.map(lang => (
                      <option key={lang.id} value={lang.id}>{lang.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Number of Problems</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={config.coding.problemCount}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      coding: { ...prev.coding, problemCount: parseInt(e.target.value) || 3 }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    min="30"
                    max="180"
                    value={config.coding.timeLimit}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      coding: { ...prev.coding, timeLimit: parseInt(e.target.value) || 90 }
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What will be generated:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Problem descriptions with examples</li>
                  <li>• Test cases (visible and hidden)</li>
                  <li>• Starter code templates</li>
                  <li>• Expected time/space complexity</li>
                </ul>
              </div>
            </div>
          )}

          {/* Communication Configuration */}
          {roundType === 'communication' && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold mb-3 block">Skills to Test</Label>
                <div className="space-y-3">
                  {communicationSkills.map(skill => {
                    const isSelected = config.communication.skills.includes(skill.id);
                    
                    // Calculate totals for each skill
                    let skillTotal = 0;
                    if (skill.id === 'reading') {
                      skillTotal = config.communication.reading.easy + config.communication.reading.medium + config.communication.reading.hard;
                    } else if (skill.id === 'listening') {
                      skillTotal = config.communication.listening.sentences.easy + config.communication.listening.sentences.medium + config.communication.listening.sentences.hard;
                    } else if (skill.id === 'grammar') {
                      skillTotal = config.communication.grammar.topics.reduce((total, topicId) => {
                        const counts = config.communication.grammar.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
                        return total + counts.easy + counts.medium + counts.hard;
                      }, 0);
                    }
                    
                    return (
                      <div
                        key={skill.id}
                        className={`border-2 rounded-lg transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <label className="flex items-start gap-3 p-4 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSkill(skill.id)}
                            className="mt-1 w-4 h-4"
                          />
                          <span className="text-2xl">{skill.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{skill.name}</div>
                            <div className="text-sm text-gray-600">{skill.description}</div>
                          </div>
                          {isSelected && skillTotal > 0 && (
                            <div className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                              {skillTotal} questions
                            </div>
                          )}
                        </label>
                        
                        {/* Inline Configuration for Reading */}
                        {isSelected && skill.id === 'reading' && (
                          <div className="px-4 pb-4 border-t border-green-200 bg-green-50">
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-green-900 mb-2">📖 Reading Assessment Configuration</h4>
                              <p className="text-xs text-green-700 mb-3">Paragraphs for candidates to read aloud. AI evaluates pronunciation and fluency.</p>
                              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                                How many paragraphs for each difficulty?
                              </Label>
                              <div className="grid grid-cols-3 gap-3">
                                {['easy', 'medium', 'hard'].map(difficulty => (
                                  <div key={difficulty}>
                                    <Label className="text-xs text-gray-600 mb-1 block capitalize">{difficulty}</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={config.communication.reading[difficulty]}
                                      onChange={(e) => setReadingCount(difficulty, e.target.value)}
                                      className="w-full text-center"
                                      placeholder="0"
                                    />
                                  </div>
                                ))}
                              </div>
                              {skillTotal > 0 && (
                                <p className="text-xs text-gray-600 mt-2 text-center">
                                  Total reading paragraphs: <span className="font-semibold text-green-700">{skillTotal}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Inline Configuration for Listening */}
                        {isSelected && skill.id === 'listening' && (
                          <div className="px-4 pb-4 border-t border-yellow-200 bg-yellow-50">
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-yellow-900 mb-2">👂 Listening Assessment Configuration</h4>
                              <p className="text-xs text-yellow-700 mb-3">Listen and repeat sentences for pronunciation practice</p>
                              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                                How many sentences for each difficulty?
                              </Label>
                              <div className="grid grid-cols-3 gap-3">
                                {['easy', 'medium', 'hard'].map(difficulty => (
                                  <div key={difficulty}>
                                    <Label className="text-xs text-gray-600 mb-1 block capitalize">{difficulty}</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={config.communication.listening.sentences[difficulty]}
                                      onChange={(e) => setListeningSentenceCount(difficulty, e.target.value)}
                                      className="w-full text-center"
                                      placeholder="0"
                                    />
                                  </div>
                                ))}
                              </div>
                              {skillTotal > 0 && (
                                <p className="text-xs text-gray-600 mt-2 text-center">
                                  Total listening sentences: <span className="font-semibold text-yellow-700">{skillTotal}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Inline Configuration for Grammar */}
                        {isSelected && skill.id === 'grammar' && (
                          <div className="px-4 pb-4 border-t border-purple-200 bg-purple-50">
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-purple-900 mb-2">📝 Grammar Assessment Configuration</h4>
                              <p className="text-xs text-purple-700 mb-3">Multiple choice questions on selected grammar topics</p>
                              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                                Select grammar topics and configure questions:
                              </Label>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {grammarTopics.map(topic => {
                                  const isTopicSelected = config.communication.grammar.topics.includes(topic.id);
                                  const topicCounts = config.communication.grammar.topicQuestions[topic.id] || { easy: 0, medium: 0, hard: 0 };
                                  const topicTotal = topicCounts.easy + topicCounts.medium + topicCounts.hard;
                                  
                                  return (
                                    <div key={topic.id} className="border rounded p-2 bg-white">
                                      <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isTopicSelected}
                                          onChange={() => toggleGrammarTopic(topic.id)}
                                          className="w-3 h-3"
                                        />
                                        <span className="text-sm font-medium">{topic.name}</span>
                                        {isTopicSelected && topicTotal > 0 && (
                                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                            {topicTotal}
                                          </span>
                                        )}
                                      </label>
                                      
                                      {isTopicSelected && (
                                        <div className="grid grid-cols-3 gap-2 ml-5">
                                          {['easy', 'medium', 'hard'].map(difficulty => (
                                            <div key={difficulty}>
                                              <Label className="text-xs text-gray-600 mb-1 block capitalize">{difficulty}</Label>
                                              <Input
                                                type="number"
                                                min="0"
                                                max="5"
                                                value={topicCounts[difficulty]}
                                                onChange={(e) => setGrammarTopicDifficultyCount(topic.id, difficulty, e.target.value)}
                                                className="w-full text-center text-xs h-8"
                                                placeholder="0"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {skillTotal > 0 && (
                                <p className="text-xs text-gray-600 mt-2 text-center">
                                  Total grammar questions: <span className="font-semibold text-purple-700">{skillTotal}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>


              <div>
                <Label>Assessment Time Limit (minutes)</Label>
                <Input
                  type="number"
                  min="15"
                  max="120"
                  value={config.communication.timeLimit}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    communication: { ...prev.communication, timeLimit: parseInt(e.target.value) || 30 }
                  }))}
                  className="mt-1"
                />
              </div>

              {/* Generation Summary */}
              {(config.communication.skills.length > 0) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">📊 Generation Summary:</h4>
                  <div className="space-y-3 text-sm text-blue-800">
                    {/* Reading Summary */}
                    {config.communication.skills.includes('reading') && (
                      <div className="pb-2 border-b border-blue-200">
                        <div className="font-semibold">📖 Reading Assessment:</div>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          {config.communication.reading.easy > 0 && (
                            <li>• <span className="text-green-700 font-medium">Easy:</span> {config.communication.reading.easy} paragraphs</li>
                          )}
                          {config.communication.reading.medium > 0 && (
                            <li>• <span className="text-yellow-700 font-medium">Medium:</span> {config.communication.reading.medium} paragraphs</li>
                          )}
                          {config.communication.reading.hard > 0 && (
                            <li>• <span className="text-red-700 font-medium">Hard:</span> {config.communication.reading.hard} paragraphs</li>
                          )}
                        </ul>
                        <div className="text-xs text-gray-600 mt-1 ml-4">
                          Subtotal: {config.communication.reading.easy + config.communication.reading.medium + config.communication.reading.hard} paragraphs
                        </div>
                      </div>
                    )}

                    {/* Listening Summary */}
                    {config.communication.skills.includes('listening') && (
                      <div className="pb-2 border-b border-blue-200">
                        <div className="font-semibold">👂 Listening Assessment:</div>
                        <ul className="ml-4 mt-1 space-y-0.5">
                          {config.communication.listening.sentences.easy > 0 && (
                            <li>• <span className="text-green-700 font-medium">Easy:</span> {config.communication.listening.sentences.easy} sentences</li>
                          )}
                          {config.communication.listening.sentences.medium > 0 && (
                            <li>• <span className="text-yellow-700 font-medium">Medium:</span> {config.communication.listening.sentences.medium} sentences</li>
                          )}
                          {config.communication.listening.sentences.hard > 0 && (
                            <li>• <span className="text-red-700 font-medium">Hard:</span> {config.communication.listening.sentences.hard} sentences</li>
                          )}
                        </ul>
                        <div className="text-xs text-gray-600 mt-1 ml-4">
                          Subtotal: {config.communication.listening.sentences.easy + config.communication.listening.sentences.medium + config.communication.listening.sentences.hard} sentences
                        </div>
                      </div>
                    )}

                    {/* Grammar Summary */}
                    {config.communication.skills.includes('grammar') && config.communication.grammar.topics.length > 0 && (
                      <div className="pb-2 border-b border-blue-200">
                        <div className="font-semibold">📝 Grammar Assessment:</div>
                        {config.communication.grammar.topics.map(topicId => {
                          const topic = grammarTopics.find(t => t.id === topicId);
                          const counts = config.communication.grammar.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
                          const topicTotal = counts.easy + counts.medium + counts.hard;
                          
                          if (topicTotal === 0) return null;
                          
                          return (
                            <div key={topicId} className="ml-4 mt-1">
                              <div className="font-medium">{topic?.name}:</div>
                              <ul className="ml-4 space-y-0.5">
                                {counts.easy > 0 && (
                                  <li>• <span className="text-green-700 font-medium">Easy:</span> {counts.easy} questions</li>
                                )}
                                {counts.medium > 0 && (
                                  <li>• <span className="text-yellow-700 font-medium">Medium:</span> {counts.medium} questions</li>
                                )}
                                {counts.hard > 0 && (
                                  <li>• <span className="text-red-700 font-medium">Hard:</span> {counts.hard} questions</li>
                                )}
                              </ul>
                            </div>
                          );
                        })}
                        <div className="text-xs text-gray-600 mt-1 ml-4">
                          Subtotal: {
                            config.communication.grammar.topics.reduce((total, topicId) => {
                              const counts = config.communication.grammar.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
                              return total + counts.easy + counts.medium + counts.hard;
                            }, 0)
                          } questions
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t-2 border-blue-300 font-semibold text-base">
                      Total Questions: {
                        (config.communication.reading.easy + config.communication.reading.medium + config.communication.reading.hard) +
                        (config.communication.listening.sentences.easy + config.communication.listening.sentences.medium + config.communication.listening.sentences.hard) +
                        config.communication.grammar.topics.reduce((total, topicId) => {
                          const counts = config.communication.grammar.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
                          return total + counts.easy + counts.medium + counts.hard;
                        }, 0)
                      }
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  ✨ What will be generated:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Reading:</strong> Paragraphs for pronunciation evaluation</li>
                  <li>• <strong>Listening:</strong> Sentences for repetition and pronunciation practice</li>
                  <li>• <strong>Grammar:</strong> Multiple choice questions on selected topics</li>
                  <li>• AI-powered evaluation for pronunciation and language accuracy</li>
                  <li>• Structured difficulty progression (Easy → Medium → Hard)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Face-to-Face AI Interview Configuration */}
          {roundType === 'faceToFace' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Number of Questions</Label>
                  <Input
                    type="number"
                    min="5"
                    max="20"
                    value={config.faceToFace.questionCount}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      faceToFace: { ...prev.faceToFace, questionCount: parseInt(e.target.value) || 10 }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Interview Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="15"
                    max="90"
                    value={config.faceToFace.duration}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      faceToFace: { ...prev.faceToFace, duration: parseInt(e.target.value) || 45 }
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>AI Interviewer Personality</Label>
                <select
                  value={config.faceToFace.aiPersonality}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    faceToFace: { ...prev.faceToFace, aiPersonality: e.target.value }
                  }))}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="professional">Professional & Formal</option>
                  <option value="friendly">Friendly & Conversational</option>
                  <option value="technical">Technical & Detail-oriented</option>
                  <option value="senior">Senior Executive Style</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="followups"
                  checked={config.faceToFace.includeFollowUps}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    faceToFace: { ...prev.faceToFace, includeFollowUps: e.target.checked }
                  }))}
                />
                <Label htmlFor="followups">Include follow-up questions for deeper evaluation</Label>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">AI Interview Features:</h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Role-specific technical questions</li>
                  <li>• Behavioral and situational questions</li>
                  <li>• Natural conversation flow</li>
                  <li>• Adaptive follow-up questions</li>
                </ul>
              </div>
            </div>
          )}

          {/* Generated Questions Preview */}
          {allQuestions.length > 0 && (
            <div className="mt-6 border-2 border-green-200 rounded-lg overflow-hidden">
              <div className="bg-green-50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">
                    {allQuestions.length} Questions Generated
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllQuestions}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
              
              <div className="max-h-96 overflow-y-auto bg-white">
                {allQuestions.map((question, index) => {
                  const isExpanded = expandedQuestions.has(index);
                  
                  const toggleExpanded = () => {
                    const newExpanded = new Set(expandedQuestions);
                    if (isExpanded) {
                      newExpanded.delete(index);
                    } else {
                      newExpanded.add(index);
                    }
                    setExpandedQuestions(newExpanded);
                  };
                  
                  return (
                    <div key={index} className="border-b hover:bg-gray-50 group">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                Q{index + 1}
                              </span>
                              {question.topic && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  {question.topic.replace('_', ' ').toUpperCase()}
                                </span>
                              )}
                              {question.difficulty && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                  question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {question.difficulty.toUpperCase()}
                                </span>
                              )}
                              <button
                                onClick={toggleExpanded}
                                className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                {isExpanded ? 'Show Less' : 'Show More'}
                              </button>
                            </div>
                            
                            <p className="font-medium text-gray-900 mb-2">
                              {question.question || question.title || question.content}
                            </p>

                            {/* Always show basic question info */}
                            {question.instructions && (
                              <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-300 mb-2">
                                <p className="text-sm text-blue-800 font-medium mb-1">Instructions:</p>
                                <p className="text-sm text-blue-700">{question.instructions}</p>
                              </div>
                            )}

                            {/* Expanded content */}
                            {isExpanded && (
                              <div className="mt-3 space-y-3 bg-gray-50 p-3 rounded-lg">
                                {/* Full Question Content */}
                                {question.full_question && question.full_question !== (question.question || question.title || question.content) && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 mb-1">Full Question:</p>
                                    <p className="text-sm text-gray-600">{question.full_question}</p>
                                  </div>
                                )}

                                {/* Question Description */}
                                {question.description && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
                                    <p className="text-sm text-gray-600">{question.description}</p>
                                  </div>
                                )}

                                {/* Reading Passage */}
                                {question.passage && (
                                  <div className="bg-white p-3 rounded border-l-4 border-green-300">
                                    <p className="text-sm font-medium text-green-700 mb-1">📖 Reading Passage:</p>
                                    <p className="text-sm text-gray-700">{question.passage}</p>
                                  </div>
                                )}

                                {/* Audio Content */}
                                {question.audio_text && (
                                  <div className="bg-white p-3 rounded border-l-4 border-yellow-300">
                                    <p className="text-sm font-medium text-yellow-700 mb-1">🔊 Audio Content:</p>
                                    <p className="text-sm text-gray-700">{question.audio_text}</p>
                                  </div>
                                )}

                                {/* Context */}
                                {question.context && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 mb-1">Context:</p>
                                    <p className="text-sm text-gray-600">{question.context}</p>
                                  </div>
                                )}

                                {/* Expected Answer */}
                                {question.expected_answer && (
                                  <div className="bg-blue-50 p-2 rounded">
                                    <p className="text-sm font-medium text-blue-700 mb-1">Expected Answer:</p>
                                    <p className="text-sm text-blue-600">{question.expected_answer}</p>
                                  </div>
                                )}

                                {/* Evaluation Criteria */}
                                {question.evaluation_criteria && Array.isArray(question.evaluation_criteria) && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 mb-1">Evaluation Criteria:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {question.evaluation_criteria.map((criteria, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                                          {criteria}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Code Snippet */}
                                {question.code_snippet && (
                                  <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono">
                                    <p className="text-white mb-1">Code ({question.code_language || 'javascript'}):</p>
                                    <pre className="whitespace-pre-wrap">{question.code_snippet}</pre>
                                  </div>
                                )}
                              </div>
                            )}
                        
                            {/* MCQ Options */}
                            {question.options && (
                              <div className="ml-4 space-y-1 text-sm mt-2">
                                <p className="text-sm font-medium text-gray-700 mb-1">Options:</p>
                                {Object.entries(question.options).map(([key, value]) => (
                                  <div key={key} className={`${question.correct_answer === key ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                    {key}. {value} {question.correct_answer === key && ' ✓'}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Time limit display */}
                            {question.time_limit && (
                              <div className="text-xs text-gray-500 mt-2">
                                ⏱️ Time: {question.time_limit}s
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(index)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="bg-gray-50 p-3 text-center text-sm text-gray-600">
                🎯 Smart Generation: Only missing questions will be created to reach your target counts
              </div>
            </div>
          )}

          {/* Communication Assessment Summary */}
          {allQuestions.length > 0 && roundType === 'communication' && (
            <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                📊 Communication Assessment Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Reading Assessment Summary */}
                {(() => {
                  const readingQuestions = allQuestions.filter(q => q.skill === 'reading');
                  const readingByDifficulty = {
                    easy: readingQuestions.filter(q => q.difficulty === 'easy').length,
                    medium: readingQuestions.filter(q => q.difficulty === 'medium').length,
                    hard: readingQuestions.filter(q => q.difficulty === 'hard').length
                  };
                  
                  return readingQuestions.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-semibold">📖</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-green-900">Reading Assessment</h4>
                          <p className="text-xs text-green-600">{readingQuestions.length} paragraphs</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        {readingByDifficulty.easy > 0 && (
                          <div className="flex justify-between">
                            <span className="text-green-600">Easy:</span>
                            <span className="font-medium">{readingByDifficulty.easy}</span>
                          </div>
                        )}
                        {readingByDifficulty.medium > 0 && (
                          <div className="flex justify-between">
                            <span className="text-yellow-600">Medium:</span>
                            <span className="font-medium">{readingByDifficulty.medium}</span>
                          </div>
                        )}
                        {readingByDifficulty.hard > 0 && (
                          <div className="flex justify-between">
                            <span className="text-red-600">Hard:</span>
                            <span className="font-medium">{readingByDifficulty.hard}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Listening Assessment Summary */}
                {(() => {
                  const listeningQuestions = allQuestions.filter(q => q.skill === 'listening');
                  
                  return listeningQuestions.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-yellow-600 font-semibold">👂</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-yellow-900">Listening Assessment</h4>
                          <p className="text-xs text-yellow-600">{listeningQuestions.length} sentences</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Sentence Repetition:</span>
                          <span className="font-medium">{listeningQuestions.length}</span>
                        </div>
                        <div className="pt-1 border-t border-yellow-200">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Total Time:</span>
                            <span className="font-medium">{Math.round(listeningQuestions.reduce((total, q) => total + (q.time_limit || 0), 0) / 60)}min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Grammar Assessment Summary */}
                {(() => {
                  const grammarQuestions = allQuestions.filter(q => q.skill === 'grammar');
                  const grammarTopics = [...new Set(grammarQuestions.map(q => q.topic).filter(Boolean))];
                  const grammarByDifficulty = {
                    easy: grammarQuestions.filter(q => q.difficulty === 'easy').length,
                    medium: grammarQuestions.filter(q => q.difficulty === 'medium').length,
                    hard: grammarQuestions.filter(q => q.difficulty === 'hard').length
                  };
                  
                  return grammarQuestions.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-semibold">📝</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-purple-900">Grammar Assessment</h4>
                          <p className="text-xs text-purple-600">{grammarQuestions.length} questions</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-purple-600">Topics:</span>
                          <span className="font-medium">{grammarTopics.length}</span>
                        </div>
                        {grammarByDifficulty.easy > 0 && (
                          <div className="flex justify-between">
                            <span className="text-green-600">Easy:</span>
                            <span className="font-medium">{grammarByDifficulty.easy}</span>
                          </div>
                        )}
                        {grammarByDifficulty.medium > 0 && (
                          <div className="flex justify-between">
                            <span className="text-yellow-600">Medium:</span>
                            <span className="font-medium">{grammarByDifficulty.medium}</span>
                          </div>
                        )}
                        {grammarByDifficulty.hard > 0 && (
                          <div className="flex justify-between">
                            <span className="text-red-600">Hard:</span>
                            <span className="font-medium">{grammarByDifficulty.hard}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Overall Assessment Info */}
              <div className="mt-6 bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">📋 Assessment Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{allQuestions.length}</div>
                    <div className="text-gray-600">Total Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(allQuestions.reduce((total, q) => total + (q.time_limit || 0), 0) / 60)}
                    </div>
                    <div className="text-gray-600">Est. Minutes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {[...new Set(allQuestions.map(q => q.skill).filter(Boolean))].length}
                    </div>
                    <div className="text-gray-600">Skills Tested</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {[...new Set(allQuestions.map(q => q.difficulty).filter(Boolean))].length}
                    </div>
                    <div className="text-gray-600">Difficulty Levels</div>
                  </div>
                </div>
              </div>

              {/* Skills Breakdown */}
              <div className="mt-4 bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">🎯 Skills & Evaluation Focus</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {allQuestions.filter(q => q.skill === 'reading').length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 font-semibold">📖</span>
                      <div>
                        <div className="font-medium text-green-900">Reading Fluency</div>
                        <div className="text-gray-600 text-xs">Pronunciation, pace, clarity</div>
                      </div>
                    </div>
                  )}
                  {allQuestions.filter(q => q.skill === 'listening').length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600 font-semibold">👂</span>
                      <div>
                        <div className="font-medium text-yellow-900">Listening & Repetition</div>
                        <div className="text-gray-600 text-xs">Audio processing, pronunciation accuracy</div>
                      </div>
                    </div>
                  )}
                  {allQuestions.filter(q => q.skill === 'grammar').length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-purple-600 font-semibold">📝</span>
                      <div>
                        <div className="font-medium text-purple-900">Grammar Knowledge</div>
                        <div className="text-gray-600 text-xs">Language structure, rules</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Display for Communication */}
        {roundType === 'communication' && allQuestions.length > 0 && (
          <div className="border-t p-4 bg-blue-50">
            <div className="text-sm text-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">📊 Generation Progress</span>
                <span className="text-blue-600">
                  {(() => {
                    // Calculate expected count
                    let expectedCount = 0;
                    expectedCount += config.communication.reading.easy + config.communication.reading.medium + config.communication.reading.hard;
                    expectedCount += config.communication.listening.sentences.easy + config.communication.listening.sentences.medium + config.communication.listening.sentences.hard;
                    expectedCount += config.communication.grammar.topics.reduce((total, topicId) => {
                      const counts = config.communication.grammar.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
                      return total + counts.easy + counts.medium + counts.hard;
                    }, 0);
                    
                    return `${allQuestions.length}/${expectedCount} questions`;
                  })()}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(() => {
                      let expectedCount = 0;
                      expectedCount += config.communication.reading.easy + config.communication.reading.medium + config.communication.reading.hard;
                      expectedCount += config.communication.listening.sentences.easy + config.communication.listening.sentences.medium + config.communication.listening.sentences.hard;
                      expectedCount += config.communication.grammar.topics.reduce((total, topicId) => {
                        const counts = config.communication.grammar.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
                        return total + counts.easy + counts.medium + counts.hard;
                      }, 0);
                      
                      return Math.min(100, (allQuestions.length / expectedCount) * 100);
                    })()}%`
                  }}
                />
              </div>
              
              {/* Section Breakdown */}
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="font-medium text-green-700">📖 Reading</div>
                  <div className="text-green-600">
                    {(() => {
                      const expected = config.communication.reading.easy + config.communication.reading.medium + config.communication.reading.hard;
                      const actual = allQuestions.filter(q => q.skill === 'reading' || q.type === 'reading_aloud').length;
                      return `${actual}/${expected}`;
                    })()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-purple-700">🎧 Listening</div>
                  <div className="text-purple-600">
                    {(() => {
                      const expected = config.communication.listening.sentences.easy + config.communication.listening.sentences.medium + config.communication.listening.sentences.hard;
                      const actual = allQuestions.filter(q => q.skill === 'listening' || q.type === 'listening').length;
                      return `${actual}/${expected}`;
                    })()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-orange-700">📝 Grammar</div>
                  <div className="text-orange-600">
                    {(() => {
                      const expected = config.communication.grammar.topics.reduce((total, topicId) => {
                        const counts = config.communication.grammar.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
                        return total + counts.easy + counts.medium + counts.hard;
                      }, 0);
                      const actual = allQuestions.filter(q => q.skill === 'grammar' || q.type === 'grammar').length;
                      return `${actual}/${expected}`;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex gap-3">
          <Button
            onClick={generateQuestions}
            disabled={loading || 
              (roundType === 'aptitude' && (
                config.aptitude.topics.length === 0 || 
                config.aptitude.topics.reduce((total, topicId) => {
                  const counts = config.aptitude.topicQuestions[topicId] || { easy: 0, medium: 0, hard: 0 };
                  return total + counts.easy + counts.medium + counts.hard;
                }, 0) === 0
              )) || 
              (roundType === 'communication' && config.communication.skills.length === 0)}
            className={`flex-1 bg-gradient-to-r ${getRoundColor()} text-white`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {allQuestions.length > 0 ? 'Generate Remaining Questions' : 'Generate Questions with AI'}
              </>
            )}
          </Button>
          
          {allQuestions.length > 0 && (
            <Button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Save {allQuestions.length} Question{allQuestions.length !== 1 ? 's' : ''}
            </Button>
          )}
          
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoundQuestionGenerator;
