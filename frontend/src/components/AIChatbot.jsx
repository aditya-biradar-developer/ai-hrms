import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// Simple Markdown renderer component
const MarkdownMessage = ({ content }) => {
  const formatLine = (line) => {
    // Handle bold text **text**
    if (line.includes('**')) {
      const parts = line.split('**');
      return parts.map((part, i) => 
        i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : part
      );
    }
    return line;
  };

  const lines = content.split('\n');
  const elements = [];
  let listItems = [];
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Headers
    if (trimmed.startsWith('###')) {
      if (listItems.length > 0) {
        elements.push(<ul key={`ul-${index}`} className="list-none ml-2 space-y-1 mb-3">{listItems}</ul>);
        listItems = [];
      }
      elements.push(<h3 key={index} className="text-base font-bold mt-3 mb-2 text-gray-900">{trimmed.replace(/###/g, '').trim()}</h3>);
    } else if (trimmed.startsWith('##')) {
      if (listItems.length > 0) {
        elements.push(<ul key={`ul-${index}`} className="list-none ml-2 space-y-1 mb-3">{listItems}</ul>);
        listItems = [];
      }
      elements.push(<h2 key={index} className="text-lg font-bold mt-3 mb-2 text-gray-900">{trimmed.replace(/##/g, '').trim()}</h2>);
    }
    // List items with • or -
    else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      const cleanLine = trimmed.replace(/^[•\-]\s*/, '');
      listItems.push(
        <li key={index} className="flex items-start py-0.5">
          <span className="mr-2 text-blue-600 mt-0.5">•</span>
          <span className="flex-1 text-gray-700">{formatLine(cleanLine)}</span>
        </li>
      );
    }
    // Numbered lists
    else if (/^\d+\./.test(trimmed)) {
      if (listItems.length > 0) {
        elements.push(<ul key={`ul-${index}`} className="list-none ml-2 space-y-1 mb-3">{listItems}</ul>);
        listItems = [];
      }
      const cleanLine = trimmed.replace(/^\d+\.\s*/, '');
      const number = trimmed.match(/^\d+/)[0];
      elements.push(
        <div key={index} className="flex items-start mb-2">
          <span className="font-semibold text-blue-600 mr-2 mt-0.5">{number}.</span>
          <span className="flex-1 text-gray-700">{formatLine(cleanLine)}</span>
        </div>
      );
    }
    // Empty lines
    else if (trimmed === '') {
      if (listItems.length > 0) {
        elements.push(<ul key={`ul-${index}`} className="list-none ml-2 space-y-1 mb-3">{listItems}</ul>);
        listItems = [];
      }
      elements.push(<div key={index} className="h-2"></div>);
    }
    // Regular text
    else {
      if (listItems.length > 0) {
        elements.push(<ul key={`ul-${index}`} className="list-none ml-2 space-y-1 mb-3">{listItems}</ul>);
        listItems = [];
      }
      elements.push(<p key={index} className="mb-2 text-gray-700 leading-relaxed">{formatLine(line)}</p>);
    }
  });
  
  // Close any remaining list
  if (listItems.length > 0) {
    elements.push(<ul key="ul-final" className="list-none ml-2 space-y-1 mb-3">{listItems}</ul>);
  }
  
  return <div className="space-y-1">{elements}</div>;
};

const AIChatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name || 'there'}! 👋 I'm your AI HR Assistant. I can help you with:\n\n• Screening candidates\n• Generating job descriptions\n• Writing professional emails\n• Analyzing performance data\n• Answering HR questions\n\nWhat can I help you with today?`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Quick action suggestions
  const quickActions = [
    { label: '📝 Generate Job Description', prompt: 'Help me generate a job description for a Senior Software Engineer position' },
    { label: '📧 Draft Interview Email', prompt: 'Help me write an interview invitation email' },
    { label: '🔍 Screen Candidates', prompt: 'How do I screen candidates using the ATS system?' },
    { label: '📊 View Analytics', prompt: 'Show me how to view recruitment analytics' },
    { label: '💡 Best Practices', prompt: 'What are the best practices for hiring?' }
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call AI chat endpoint
      const AI_SERVICE_URL = 'http://localhost:5001/api/ai';
      const response = await axios.post(`${AI_SERVICE_URL}/chat`, {
        message: inputMessage,
        user_role: user?.role || 'user',
        context: {
          user_name: user?.name,
          user_role: user?.role,
          conversation_history: messages.slice(-5) // Last 5 messages for context
        }
      });

      const responseData = response.data.data;
      
      const assistantMessage = {
        role: 'assistant',
        content: responseData.response || responseData.message,
        timestamp: new Date(),
        hasAction: responseData.has_action || false,
        actionType: responseData.action_type,
        actionData: responseData.action_data,
        nextSteps: responseData.next_steps || []
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Execute autonomous actions
      if (responseData.action_data?.execute_now) {
        executeAutonomousAction(responseData.action_type, responseData.action_data);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure the AI service is running or try again later.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt) => {
    setInputMessage(prompt);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat cleared! How can I help you, ${user?.name || 'there'}?`,
        timestamp: new Date()
      }
    ]);
  };

  const executeAutonomousAction = async (actionType, actionData) => {
    console.log('🤖 Executing autonomous action:', actionType);
    
    try {
      if (actionType === 'screen_candidates') {
        // Add status message
        const statusMessage = {
          role: 'assistant',
          content: '⚡ **Executing Action...**\n\nTriggering ATS screening for all candidates. Please wait...',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, statusMessage]);
        
        // Redirect to applications page and trigger screening
        setTimeout(() => {
          window.location.href = '/applications?autoScreen=true';
        }, 2000);
      } else if (actionType === 'email_candidates') {
        // Redirect to applications with email modal
        setTimeout(() => {
          window.location.href = `/applications?emailTop=${actionData.count}`;
        }, 1500);
      } else if (actionData.redirect) {
        // Generic redirect
        setTimeout(() => {
          window.location.href = actionData.redirect;
        }, 1500);
      }
    } catch (error) {
      console.error('Error executing autonomous action:', error);
      const errorMessage = {
        role: 'assistant',
        content: '❌ Failed to execute action. Please try manually.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-50 group"
        title="Open AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          AI
        </span>
      </button>
    );
  }

  return (
    <div className={`fixed ${isMinimized ? 'bottom-6 right-6' : 'bottom-6 right-6'} z-50 transition-all duration-300`}>
      <Card className={`${isMinimized ? 'w-80' : 'w-96'} shadow-2xl border-2 border-purple-200`}>
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <CardTitle className="text-lg">AI HR Assistant</CardTitle>
                <p className="text-xs text-purple-100">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20 p-1"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0">
            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50"
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : message.isError 
                        ? 'bg-red-100 text-red-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div>
                      <div className={`rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.isError
                          ? 'bg-red-50 text-red-900 border border-red-200'
                          : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                      }`}>
                        {message.role === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <>
                            <div className="text-sm">
                              <MarkdownMessage content={message.content} />
                            </div>
                            
                            {/* Action Buttons */}
                            {message.hasAction && message.actionData && message.actionData.redirect && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <button
                                  onClick={() => window.location.href = message.actionData.redirect}
                                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                  <Sparkles className="w-4 h-4" />
                                  Take Me There
                                </button>
                              </div>
                            )}
                            
                            {/* Next Steps */}
                            {message.nextSteps && message.nextSteps.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Quick Actions:</p>
                                <div className="space-y-1">
                                  {message.nextSteps.map((step, idx) => (
                                    <div key={idx} className="text-xs text-gray-600 flex items-start">
                                      <span className="text-green-600 mr-1">✓</span>
                                      <span>{step}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 px-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        <span className="text-sm text-gray-600">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 2 && (
              <div className="p-3 bg-white border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-2 font-medium">Quick Actions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-1 rounded-full transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Powered by AI
                </p>
                <button
                  onClick={clearChat}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear chat
                </button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AIChatbot;
