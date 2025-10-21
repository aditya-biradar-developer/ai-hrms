/**
 * AI Service Client
 * Connects Node.js backend to Python AI microservice
 */

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

const aiService = {
  /**
   * Check if AI service is available
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('AI service health check failed:', error.message);
      return { status: 'unavailable', model_loaded: false };
    }
  },

  /**
   * Screen resume against job description
   * @param {string} resumeText - Candidate's resume text (optional if resumeUrl provided)
   * @param {string} jobDescription - Job description text
   * @param {string} resumeUrl - URL to resume file (optional if resumeText provided)
   * @returns {Promise} - Screening results with match score
   */
  async screenResume(resumeText, jobDescription, resumeUrl) {
    try {
      const payload = {
        job_description: jobDescription
      };

      // Include resume_text or resume_url
      if (resumeUrl) {
        payload.resume_url = resumeUrl;
      } else if (resumeText) {
        payload.resume_text = resumeText;
      }

      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/resume/screen`, payload, { 
        timeout: 300000 // 5 min timeout for AI processing
      });

      return response.data;
    } catch (error) {
      console.error('Resume screening failed:', error.message);
      throw new Error('AI resume screening failed: ' + error.message);
    }
  },

  /**
   * Rank multiple candidates against job description
   * @param {Array} candidates - Array of {id, name, resume_text}
   * @param {string} jobDescription - Job description
   * @returns {Promise} - Ranked candidates with scores
   */
  async rankCandidates(candidates, jobDescription) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/resume/rank`, {
        candidates,
        job_description: jobDescription
      }, { timeout: 180000 }); // 3 min timeout for multiple candidates

      return response.data;
    } catch (error) {
      console.error('Candidate ranking failed:', error.message);
      throw new Error('AI candidate ranking failed: ' + error.message);
    }
  },

  /**
   * Generate job description from title and skills
   * @param {Object} data - {title, skills, department, experience_level, employment_type}
   * @returns {Promise} - Generated job description
   */
  async generateJobDescription(data) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/job-description/generate`, data, {
        timeout: 60000
      });

      return response.data;
    } catch (error) {
      console.error('Job description generation failed:', error.message);
      throw new Error('AI job description generation failed: ' + error.message);
    }
  },

  /**
   * Generate professional email
   * @param {string} type - Email type (rejection, interview_invite, offer, reminder, welcome, performance_review)
   * @param {string} recipientName - Recipient's name
   * @param {Object} context - Additional context (position, date, etc.)
   * @param {string} tone - Email tone (professional/friendly)
   * @returns {Promise} - Generated email with subject and body
   */
  async generateEmail(type, recipientName, context = {}, tone = 'professional') {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/email/generate`, {
        type,
        recipient_name: recipientName,
        context,
        tone
      }, { timeout: 60000 });

      return response.data;
    } catch (error) {
      console.error('Email generation failed:', error.message);
      throw new Error('AI email generation failed: ' + error.message);
    }
  },

  /**
   * Summarize employee performance
   * @param {Object} data - {employee_data, performance_metrics, attendance, feedback}
   * @returns {Promise} - Performance summary and recommendations
   */
  async summarizePerformance(data) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/performance/summarize`, data, {
        timeout: 90000
      });

      return response.data;
    } catch (error) {
      console.error('Performance summarization failed:', error.message);
      throw new Error('AI performance summarization failed: ' + error.message);
    }
  },

  /**
   * Chat with AI assistant (role-based)
   * @param {string} message - User message
   * @param {string} userRole - User's role (admin, hr, manager, employee, candidate)
   * @param {Object} context - Additional context
   * @returns {Promise} - AI response
   */
  async chat(message, userRole, context = {}) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/ai/chat`, {
        message,
        user_role: userRole,
        context
      }, { timeout: 60000 });

      return response.data;
    } catch (error) {
      console.error('AI chat failed:', error.message);
      throw new Error('AI chat failed: ' + error.message);
    }
  }
};

module.exports = aiService;
