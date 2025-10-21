import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import RoundQuestionGenerator from './RoundQuestionGenerator';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Brain, 
  Code, 
  MessageCircle, 
  Video, 
  Users, 
  Plus,
  Settings,
  CheckCircle,
  X,
  Sparkles,
  BookOpen,
  Target,
  Mic
} from 'lucide-react';

const InterviewRoundScheduler = ({ 
  selectedApplication, 
  onClose, 
  onSchedule,
  loading = false 
}) => {
  const [selectedRound, setSelectedRound] = useState('');
  const [interviewData, setInterviewData] = useState({
    interview_date: '',
    interview_time: '',
    interview_location: '',
    interview_notes: '',
    interview_grace_period_minutes: 10
  });

  // Round-specific configurations
  const [roundConfig, setRoundConfig] = useState({
    aptitude: {
      topics: [],
      questionsPerTopic: 10,
      timePerQuestion: 60, // seconds
      difficulty: 'medium'
    },
    coding: {
      problems: [],
      difficulty: 'medium',
      timeLimit: 90, // minutes
      language: 'javascript'
    },
    communication: {
      skills: ['listening', 'speaking', 'reading'],
      timeLimit: 30, // minutes
      topics: []
    },
    faceToFace: {
      questions: [],
      aiPersonality: 'professional',
      duration: 45 // minutes
    },
    hr: {
      location: 'office',
      interviewer: '',
      topics: ['company_culture', 'compensation', 'background_check']
    }
  });

  const [showConfiguration, setShowConfiguration] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [showQuestionGenerator, setShowQuestionGenerator] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  const interviewRounds = [
    {
      id: 'aptitude',
      name: 'Aptitude Assessment',
      description: 'Multiple choice questions testing logical reasoning, quantitative ability, and verbal skills',
      icon: Brain,
      color: 'from-purple-500 to-indigo-600',
      features: ['MCQ Format', 'Topic-wise Questions', 'Auto-scoring', 'Time-bound']
    },
    {
      id: 'coding',
      name: 'Coding Challenge',
      description: 'Data structures and algorithms problems with live code editor',
      icon: Code,
      color: 'from-green-500 to-teal-600',
      features: ['DSA Problems', 'Live Editor', 'Multiple Languages', 'Test Cases']
    },
    {
      id: 'communication',
      name: 'Communication Assessment',
      description: 'Voice-based evaluation of listening, speaking, and reading skills',
      icon: MessageCircle,
      color: 'from-blue-500 to-cyan-600',
      features: ['Voice Recognition', 'Listening Tests', 'Speaking Evaluation', 'Reading Comprehension']
    },
    {
      id: 'faceToFace',
      name: 'AI Interview',
      description: 'Interactive AI-powered interview with role-specific questions',
      icon: Video,
      color: 'from-orange-500 to-red-600',
      features: ['AI Interviewer', 'Role-based Questions', 'Natural Conversation', 'Video Recording']
    },
    {
      id: 'hr',
      name: 'HR Round',
      description: 'Human resource interview conducted by HR team at office location',
      icon: Users,
      color: 'from-gray-500 to-slate-600',
      features: ['Human Interviewer', 'Office Location', 'Culture Fit', 'Final Assessment']
    }
  ];

  const aptitudeTopics = [
    { id: 'logical_reasoning', name: 'Logical Reasoning', description: 'Pattern recognition, sequences, analogies' },
    { id: 'quantitative_aptitude', name: 'Quantitative Aptitude', description: 'Mathematics, statistics, data interpretation' },
    { id: 'verbal_ability', name: 'Verbal Ability', description: 'Grammar, vocabulary, reading comprehension' },
    { id: 'technical_aptitude', name: 'Technical Aptitude', description: 'Basic programming concepts, algorithms' },
    { id: 'analytical_thinking', name: 'Analytical Thinking', description: 'Problem solving, critical thinking' }
  ];

  const codingDifficulties = [
    { id: 'easy', name: 'Easy', description: 'Basic problems, simple algorithms' },
    { id: 'medium', name: 'Medium', description: 'Intermediate problems, data structures' },
    { id: 'hard', name: 'Hard', description: 'Complex algorithms, optimization' }
  ];

  const programmingLanguages = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'cpp', name: 'C++' },
    { id: 'c', name: 'C' }
  ];

  const communicationTopics = [
    { id: 'business_communication', name: 'Business Communication' },
    { id: 'presentation_skills', name: 'Presentation Skills' },
    { id: 'customer_service', name: 'Customer Service' },
    { id: 'team_collaboration', name: 'Team Collaboration' },
    { id: 'conflict_resolution', name: 'Conflict Resolution' }
  ];

  const generateQuestions = async (roundType) => {
    setGeneratingQuestions(true);
    try {
      // Call GROQ API to generate questions based on round type and configuration
      const response = await fetch('http://localhost:5000/api/ai/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roundType,
          config: roundConfig[roundType],
          jobTitle: selectedApplication?.job_title || 'Software Developer',
          jobDescription: selectedApplication?.job?.description || ''
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update round config with generated questions
        setRoundConfig(prev => ({
          ...prev,
          [roundType]: {
            ...prev[roundType],
            questions: data.questions || [],
            problems: data.problems || [],
            topics: data.topics || prev[roundType].topics
          }
        }));
        
        alert(`✅ Generated ${data.questions?.length || data.problems?.length || 0} questions successfully!`);
      } else {
        throw new Error(data.message || 'Failed to generate questions');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('❌ Failed to generate questions: ' + error.message);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedRound) {
      alert('Please select an interview round');
      return;
    }

    if (!interviewData.interview_date) {
      alert('Please select an interview date');
      return;
    }

    const scheduleData = {
      ...interviewData,
      round_type: selectedRound,
      round_config: roundConfig[selectedRound],
      interview_notes: `[${interviewRounds.find(r => r.id === selectedRound)?.name}] ${interviewData.interview_notes}`,
      custom_questions: generatedQuestions.length > 0 ? generatedQuestions : undefined
    };

    console.log('📅 Scheduling with questions:', generatedQuestions.length);
    await onSchedule(scheduleData);
  };

  const renderRoundConfiguration = () => {
    if (!selectedRound) return null;

    const round = interviewRounds.find(r => r.id === selectedRound);
    if (!round) return null;

    switch (selectedRound) {
      case 'aptitude':
        return (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Aptitude Assessment Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {generatedQuestions.length > 0 
                  ? `✅ ${generatedQuestions.length} questions configured with topic-based difficulty levels`
                  : 'Configure MCQ questions with topic-wise difficulty levels (Easy/Medium/Hard per topic)'}
              </p>
              
              <Button
                onClick={() => setShowQuestionGenerator(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generatedQuestions.length > 0 ? 'Edit Aptitude Questions' : 'Generate Aptitude Questions with AI'}
              </Button>
            </CardContent>
          </Card>
        );

      case 'coding':
        return (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Coding Challenge Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Difficulty Level</Label>
                  <select
                    value={roundConfig.coding.difficulty}
                    onChange={(e) => setRoundConfig(prev => ({
                      ...prev,
                      coding: { ...prev.coding, difficulty: e.target.value }
                    }))}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    {codingDifficulties.map(diff => (
                      <option key={diff.id} value={diff.id}>{diff.name} - {diff.description}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    min="30"
                    max="180"
                    value={roundConfig.coding.timeLimit}
                    onChange={(e) => setRoundConfig(prev => ({
                      ...prev,
                      coding: { ...prev.coding, timeLimit: parseInt(e.target.value) || 90 }
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Programming Language</Label>
                <select
                  value={roundConfig.coding.language}
                  onChange={(e) => setRoundConfig(prev => ({
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

              <Button
                onClick={() => generateQuestions('coding')}
                disabled={generatingQuestions}
                className="w-full"
              >
                {generatingQuestions ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Generating Problems...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate DSA Problems
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );

      case 'communication':
        return (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Communication Assessment Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Skills to Test</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['listening', 'speaking', 'reading'].map(skill => (
                    <label key={skill} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roundConfig.communication.skills.includes(skill)}
                        onChange={(e) => {
                          const skills = e.target.checked
                            ? [...roundConfig.communication.skills, skill]
                            : roundConfig.communication.skills.filter(s => s !== skill);
                          setRoundConfig(prev => ({
                            ...prev,
                            communication: { ...prev.communication, skills }
                          }));
                        }}
                        className="rounded"
                      />
                      <div className="capitalize font-medium">{skill}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Communication Topics</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {communicationTopics.map(topic => (
                    <label key={topic.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roundConfig.communication.topics.includes(topic.id)}
                        onChange={(e) => {
                          const topics = e.target.checked
                            ? [...roundConfig.communication.topics, topic.id]
                            : roundConfig.communication.topics.filter(t => t !== topic.id);
                          setRoundConfig(prev => ({
                            ...prev,
                            communication: { ...prev.communication, topics }
                          }));
                        }}
                        className="rounded"
                      />
                      <div className="font-medium text-sm">{topic.name}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Time Limit (minutes)</Label>
                <Input
                  type="number"
                  min="15"
                  max="60"
                  value={roundConfig.communication.timeLimit}
                  onChange={(e) => setRoundConfig(prev => ({
                    ...prev,
                    communication: { ...prev.communication, timeLimit: parseInt(e.target.value) || 30 }
                  }))}
                  className="mt-1"
                />
              </div>

              <Button
                onClick={() => generateQuestions('communication')}
                disabled={generatingQuestions || roundConfig.communication.topics.length === 0}
                className="w-full"
              >
                {generatingQuestions ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Generating Challenges...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Communication Challenges
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );

      case 'faceToFace':
        return (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                AI Interview Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>AI Interviewer Personality</Label>
                <select
                  value={roundConfig.faceToFace.aiPersonality}
                  onChange={(e) => setRoundConfig(prev => ({
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

              <div>
                <Label>Interview Duration (minutes)</Label>
                <Input
                  type="number"
                  min="15"
                  max="90"
                  value={roundConfig.faceToFace.duration}
                  onChange={(e) => setRoundConfig(prev => ({
                    ...prev,
                    faceToFace: { ...prev.faceToFace, duration: parseInt(e.target.value) || 45 }
                  }))}
                  className="mt-1"
                />
              </div>

              <Button
                onClick={() => generateQuestions('faceToFace')}
                disabled={generatingQuestions}
                className="w-full"
              >
                {generatingQuestions ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Role-based Questions
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );

      case 'hr':
        return (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                HR Round Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Interview Location</Label>
                <Input
                  type="text"
                  placeholder="e.g., Conference Room A, HR Office"
                  value={roundConfig.hr.location}
                  onChange={(e) => setRoundConfig(prev => ({
                    ...prev,
                    hr: { ...prev.hr, location: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>HR Interviewer</Label>
                <Input
                  type="text"
                  placeholder="e.g., John Smith, HR Manager"
                  value={roundConfig.hr.interviewer}
                  onChange={(e) => setRoundConfig(prev => ({
                    ...prev,
                    hr: { ...prev.hr, interviewer: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Discussion Topics</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {[
                    { id: 'company_culture', name: 'Company Culture & Values' },
                    { id: 'compensation', name: 'Compensation & Benefits' },
                    { id: 'background_check', name: 'Background Verification' },
                    { id: 'career_growth', name: 'Career Growth Opportunities' },
                    { id: 'work_life_balance', name: 'Work-Life Balance' }
                  ].map(topic => (
                    <label key={topic.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roundConfig.hr.topics.includes(topic.id)}
                        onChange={(e) => {
                          const topics = e.target.checked
                            ? [...roundConfig.hr.topics, topic.id]
                            : roundConfig.hr.topics.filter(t => t !== topic.id);
                          setRoundConfig(prev => ({
                            ...prev,
                            hr: { ...prev.hr, topics }
                          }));
                        }}
                        className="rounded"
                      />
                      <div className="font-medium text-sm">{topic.name}</div>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] my-auto overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Schedule Interview Round</h2>
            <p className="text-sm text-gray-600 mt-1">
              For {selectedApplication?.candidate_name} - {selectedApplication?.job_title}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Round Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Interview Round</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {interviewRounds.map((round) => {
                const Icon = round.icon;
                return (
                  <Card
                    key={round.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedRound === round.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedRound(round.id);
                      setShowConfiguration(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${round.color}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm">{round.name}</h4>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {round.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {round.features.slice(0, 2).map((feature, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-gray-100 text-xs rounded-full"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Round Configuration */}
          {selectedRound && renderRoundConfiguration()}

          {/* Basic Interview Details */}
          {selectedRound && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Interview Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="interview_date">Interview Date *</Label>
                    <Input
                      id="interview_date"
                      type="date"
                      value={interviewData.interview_date}
                      onChange={(e) => setInterviewData({ ...interviewData, interview_date: e.target.value })}
                      className="mt-1"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="interview_time">Interview Time</Label>
                    <Input
                      id="interview_time"
                      type="time"
                      value={interviewData.interview_time}
                      onChange={(e) => setInterviewData({ ...interviewData, interview_time: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="interview_location">
                    {selectedRound === 'hr' ? 'Office Location' : 'Interview Location'}
                  </Label>
                  <Input
                    id="interview_location"
                    type="text"
                    placeholder={
                      selectedRound === 'hr' 
                        ? "e.g., Main Office, Conference Room A"
                        : selectedRound === 'faceToFace'
                        ? "Virtual (AI Interview)"
                        : "Virtual Assessment"
                    }
                    value={interviewData.interview_location}
                    onChange={(e) => setInterviewData({ ...interviewData, interview_location: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="interview_notes">Additional Notes</Label>
                  <textarea
                    id="interview_notes"
                    rows="3"
                    placeholder="Any special instructions or information..."
                    value={interviewData.interview_notes}
                    onChange={(e) => setInterviewData({ ...interviewData, interview_notes: e.target.value })}
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="grace_period">Grace Period (minutes)</Label>
                  <Input
                    id="grace_period"
                    type="number"
                    min="0"
                    max="30"
                    value={interviewData.interview_grace_period_minutes}
                    onChange={(e) => setInterviewData({ 
                      ...interviewData, 
                      interview_grace_period_minutes: parseInt(e.target.value) || 10 
                    })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        {selectedRound && (
          <div className="flex gap-3 p-6 border-t bg-gray-50">
            <Button
              onClick={handleSchedule}
              disabled={loading || !interviewData.interview_date}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Schedule {interviewRounds.find(r => r.id === selectedRound)?.name}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        )}
      </div>
      
      {/* Round Question Generator Modal */}
      {showQuestionGenerator && (
        <RoundQuestionGenerator
          isOpen={showQuestionGenerator}
          onClose={() => setShowQuestionGenerator(false)}
          onSave={(questions) => {
            console.log('💾 Questions generated:', questions.length);
            setGeneratedQuestions(questions);
            setShowQuestionGenerator(false);
          }}
          roundType={selectedRound}
          jobTitle={selectedApplication?.job_title || 'Software Developer'}
          applicationId={selectedApplication?.id}
        />
      )}
    </div>
  );
};

export default InterviewRoundScheduler;
