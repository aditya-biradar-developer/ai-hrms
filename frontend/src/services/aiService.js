import axios from 'axios';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:5001/api/ai';

/**
 * AI Service for HRMS
 * Handles all AI-powered features
 */

// Comprehensive ATS Resume Screening
export const screenResumeComprehensive = async (resumeUrl, jobDescription, jobTitle) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/resume/screen-comprehensive`, {
      resume_url: resumeUrl,
      job_description: jobDescription,
      job_title: jobTitle
    });
    return response.data;
  } catch (error) {
    console.error('Error screening resume:', error);
    throw error;
  }
};

// Simple Resume Screening (legacy)
export const screenResume = async (resumeUrl, jobDescription) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/resume/screen`, {
      resume_url: resumeUrl,
      job_description: jobDescription
    });
    return response.data;
  } catch (error) {
    console.error('Error screening resume:', error);
    throw error;
  }
};

// Rank Multiple Candidates
export const rankCandidates = async (candidates, jobDescription) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/resume/rank`, {
      candidates,
      job_description: jobDescription
    });
    return response.data;
  } catch (error) {
    console.error('Error ranking candidates:', error);
    throw error;
  }
};

// Generate Job Description
export const generateJobDescription = async (jobData) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/job-description/generate`, jobData);
    return response.data;
  } catch (error) {
    console.error('Error generating job description:', error);
    throw error;
  }
};

// Generate Email
export const generateEmail = async (emailData) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/email/generate`, emailData);
    return response.data;
  } catch (error) {
    console.error('Error generating email:', error);
    throw error;
  }
};

// Summarize Performance
export const summarizePerformance = async (performanceData) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/performance/summarize`, performanceData);
    return response.data;
  } catch (error) {
    console.error('Error summarizing performance:', error);
    throw error;
  }
};

// AI Chat
export const chat = async (message, userRole, context = {}) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/chat`, {
      message,
      user_role: userRole,
      context
    });
    return response.data;
  } catch (error) {
    console.error('Error in AI chat:', error);
    throw error;
  }
};

// Health Check
export const checkAIServiceHealth = async () => {
  try {
    const response = await axios.get('http://localhost:5001/health');
    return response.data;
  } catch (error) {
    console.error('AI service health check failed:', error);
    return { status: 'unavailable', model_loaded: false };
  }
};

export default {
  screenResumeComprehensive,
  screenResume,
  rankCandidates,
  generateJobDescription,
  generateEmail,
  summarizePerformance,
  chat,
  checkAIServiceHealth
};
