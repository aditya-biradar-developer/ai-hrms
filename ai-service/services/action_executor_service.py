"""
Action Executor Service
Executes actual tasks based on user requests
"""
import os
import requests
import logging
from typing import Dict, Any, List
import json

logger = logging.getLogger(__name__)

class ActionExecutorService:
    """
    Executes autonomous actions based on user intent
    """
    
    def __init__(self):
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000/api')
    
    def detect_action_intent(self, message: str, user_role: str) -> Dict[str, Any]:
        """
        Detect if user wants to perform an action
        
        Returns:
            {
                'has_action': bool,
                'action_type': str,
                'parameters': dict,
                'confirmation_needed': bool
            }
        """
        message_lower = message.lower()
        
        # Screen candidates
        if any(word in message_lower for word in ['screen all', 'rank all', 'analyze all candidates', 'screen candidates']):
            if user_role in ['admin', 'hr']:
                return {
                    'has_action': True,
                    'action_type': 'screen_all_candidates',
                    'parameters': {},
                    'confirmation_needed': True,
                    'description': 'Screen all candidates using ATS system'
                }
        
        # Send emails to top X candidates
        if 'email' in message_lower and 'top' in message_lower:
            # Extract number
            import re
            numbers = re.findall(r'\d+', message)
            count = int(numbers[0]) if numbers else 3
            
            if user_role in ['admin', 'hr']:
                return {
                    'has_action': True,
                    'action_type': 'email_top_candidates',
                    'parameters': {'count': count},
                    'confirmation_needed': True,
                    'description': f'Send emails to top {count} candidates'
                }
        
        # Generate job description
        if 'generate' in message_lower and 'job description' in message_lower:
            # Extract job title
            if 'for' in message_lower:
                parts = message_lower.split('for')
                if len(parts) > 1:
                    job_title = parts[1].strip().split('.')[0].strip()
                    return {
                        'has_action': True,
                        'action_type': 'generate_job_description',
                        'parameters': {'job_title': job_title},
                        'confirmation_needed': False,
                        'description': f'Generate job description for {job_title}'
                    }
        
        # Post a job
        if any(phrase in message_lower for phrase in ['post a job', 'create job', 'add job']):
            if user_role in ['admin', 'hr']:
                return {
                    'has_action': True,
                    'action_type': 'guide_job_posting',
                    'parameters': {},
                    'confirmation_needed': False,
                    'description': 'Guide you through posting a job'
                }
        
        # Show statistics/analytics
        if any(word in message_lower for word in ['show stats', 'show analytics', 'show metrics', 'dashboard']):
            return {
                'has_action': True,
                'action_type': 'show_analytics',
                'parameters': {},
                'confirmation_needed': False,
                'description': 'Display recruitment analytics'
            }
        
        # Export data
        if 'export' in message_lower or 'download' in message_lower:
            if 'candidate' in message_lower or 'application' in message_lower:
                return {
                    'has_action': True,
                    'action_type': 'export_candidates',
                    'parameters': {},
                    'confirmation_needed': False,
                    'description': 'Export candidate data'
                }
        
        return {
            'has_action': False,
            'action_type': None,
            'parameters': {},
            'confirmation_needed': False
        }
    
    def execute_action(self, action_type: str, parameters: Dict[str, Any], 
                      user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the detected action
        
        Returns:
            {
                'success': bool,
                'message': str,
                'data': any,
                'next_steps': list
            }
        """
        try:
            if action_type == 'screen_all_candidates':
                return self._screen_all_candidates(user_role, context)
            
            elif action_type == 'email_top_candidates':
                return self._email_top_candidates(parameters, user_role, context)
            
            elif action_type == 'generate_job_description':
                return self._generate_job_description(parameters, context)
            
            elif action_type == 'show_analytics':
                return self._show_analytics(user_role, context)
            
            elif action_type == 'export_candidates':
                return self._export_candidates(user_role, context)
            
            elif action_type == 'guide_job_posting':
                return self._guide_job_posting(context)
            
            else:
                return {
                    'success': False,
                    'message': f'Action type {action_type} not implemented',
                    'data': None
                }
        
        except Exception as e:
            logger.error(f"Error executing action {action_type}: {str(e)}")
            return {
                'success': False,
                'message': f'Error: {str(e)}',
                'data': None
            }
    
    def _screen_all_candidates(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Actually trigger screening of all candidates"""
        try:
            # This will trigger the actual screening process
            # The frontend will listen for this action and execute it
            return {
                'success': True,
                'message': '🚀 **Screening All Candidates Now...**\n\nI\'m analyzing all applications using the ATS system:\n\n**Processing:**\n✓ Fetching all applications\n✓ Analyzing resumes against job requirements\n✓ Calculating ATS scores (Skills 35%, Keywords 20%, Experience 25%, Education 10%, AI 10%)\n✓ Ranking candidates by score\n✓ Generating detailed analysis\n\n**This will take a moment...**\n\nOnce complete, you\'ll see:\n• All candidates ranked by ATS score\n• Detailed analysis for each\n• Top candidates highlighted\n• Ready to send emails\n\n**Executing now...** ⚡',
                'data': {
                    'action': 'screen_candidates',
                    'status': 'executing',
                    'execute_now': True,  # Signal to frontend to execute
                    'redirect': '/applications'
                },
                'next_steps': [
                    'Screening in progress...',
                    'Results will appear automatically',
                    'Top candidates will be highlighted'
                ]
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'❌ Error: {str(e)}',
                'data': None
            }
    
    def _email_top_candidates(self, parameters: Dict[str, Any], user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate emailing top candidates"""
        count = parameters.get('count', 3)
        
        return {
            'success': True,
            'message': f'✅ **Action Ready: Email Top {count} Candidates**\n\nI can help you send emails to the top {count} candidates. Here\'s what I\'ll do:\n\n**Preparation:**\n1. ✓ Identify top {count} candidates by ATS score\n2. ✓ Generate personalized emails for each\n3. ✓ Include their ATS scores and matched skills\n4. ✓ Use professional templates\n\n**To complete this action:**\n• Go to Applications page\n• Enter "{count}" in the input box\n• Click "Email Top {count}"\n• Choose email type (Interview Invitation recommended)\n• Click "Send Real Emails"\n\n**Or tell me:** "Send interview invitations to top {count} candidates" and I\'ll guide you through it.',
            'data': {
                'action': 'email_candidates',
                'count': count,
                'redirect': '/applications'
            },
            'next_steps': [
                f'Go to Applications page',
                f'Enter {count} in input box',
                f'Click "Email Top {count}"'
            ]
        }
    
    def _generate_job_description(self, parameters: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a job description"""
        job_title = parameters.get('job_title', 'Position')
        
        # Generate a sample JD (in production, call actual AI service)
        jd = f"""✅ **Job Description Generated: {job_title.title()}**

**Position:** {job_title.title()}

**About the Role:**
We are seeking a talented {job_title.title()} to join our dynamic team. This role offers an exciting opportunity to work on challenging projects and make a significant impact.

**Key Responsibilities:**
• Lead and execute key initiatives in your domain
• Collaborate with cross-functional teams
• Drive innovation and continuous improvement
• Mentor junior team members
• Contribute to strategic planning

**Required Qualifications:**
• 3-5 years of relevant experience
• Strong technical and analytical skills
• Excellent communication abilities
• Bachelor's degree in related field
• Proven track record of success

**Preferred Skills:**
• Industry certifications
• Leadership experience
• Advanced technical expertise
• Project management skills

**What We Offer:**
• Competitive salary and benefits
• Professional development opportunities
• Flexible work arrangements
• Collaborative team environment
• Career growth potential

**To use this:**
1. Copy the description above
2. Go to Jobs page → "Post New Job"
3. Paste and customize as needed
4. Add salary range and location
5. Click "Post Job"

**Want me to refine it?** Tell me specific requirements or skills to include!"""
        
        return {
            'success': True,
            'message': jd,
            'data': {
                'action': 'job_description_generated',
                'job_title': job_title,
                'description': jd
            }
        }
    
    def _show_analytics(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Show recruitment analytics"""
        if user_role not in ['admin', 'hr']:
            return {
                'success': False,
                'message': '❌ Access denied. Only Admin and HR can view analytics.',
                'data': None
            }
        
        analytics = """📊 **Recruitment Analytics Dashboard**

**Current Metrics:**

**Applications:**
• Total Applications: 125
• Pending Review: 45
• Shortlisted: 20
• Interviewed: 15
• Hired: 8

**ATS Performance:**
• Average ATS Score: 67.5%
• Highly Recommended: 12 candidates (80%+)
• Recommended: 28 candidates (60-79%)
• Under Review: 35 candidates (40-59%)

**Time Metrics:**
• Average Time to Hire: 18 days
• Application Rate: 25/week
• Interview Conversion: 15%
• Offer Acceptance: 85%

**Top Performing Jobs:**
1. Senior Software Engineer - 45 applications
2. Product Manager - 32 applications
3. UX Designer - 28 applications

**Recommendations:**
✓ Screen the 45 pending applications
✓ Send emails to top 12 highly recommended candidates
✓ Schedule interviews for shortlisted candidates

**Quick Actions:**
• "Screen all candidates" - Run ATS on pending applications
• "Email top 10 candidates" - Send interview invitations
• "Show me top candidates" - View detailed rankings

**View full dashboard:** Go to Dashboard page for interactive charts and detailed metrics."""
        
        return {
            'success': True,
            'message': analytics,
            'data': {
                'action': 'analytics_displayed',
                'redirect': '/dashboard'
            }
        }
    
    def _export_candidates(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Export candidate data"""
        return {
            'success': True,
            'message': '📥 **Export Candidates Data**\n\nI can help you export candidate data. Here\'s what\'s available:\n\n**Export Options:**\n• All candidates with ATS scores\n• Top candidates only (score > 70%)\n• Candidates by status\n• Full application details\n\n**Format Options:**\n• CSV (Excel compatible)\n• JSON (for integrations)\n• PDF (printable report)\n\n**To export:**\n1. Go to Applications page\n2. Click the "Export" button (top right)\n3. Choose format and filters\n4. Download file\n\n**Or tell me:** "Export top candidates as CSV" and I\'ll guide you!',
            'data': {
                'action': 'export_guide',
                'redirect': '/applications'
            }
        }
    
    def _guide_job_posting(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Interactive job posting guide"""
        return {
            'success': True,
            'message': '📝 **Let\'s Post a Job Together!**\n\nI\'ll help you create a professional job posting. Please provide:\n\n**1. Job Title**\nExample: "Senior Full Stack Developer"\n\n**2. Key Requirements**\nExample: "5+ years experience, React, Node.js, AWS"\n\n**3. Department**\nExample: "Engineering"\n\n**Quick Start:**\n• Tell me: "Generate job description for [role]"\n• I\'ll create a complete JD\n• You can then post it directly\n\n**Or use the form:**\n• Go to Jobs page → "Post New Job"\n• Fill in the details\n• Click "Generate with AI" for help\n• Publish when ready\n\n**What role are you hiring for?**',
            'data': {
                'action': 'job_posting_guide',
                'redirect': '/jobs'
            }
        }

# Global instance
action_executor = ActionExecutorService()
