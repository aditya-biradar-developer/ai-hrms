"""
Gemini AI Service - Fast, free, and professional email generation
Get your free API key: https://makersuite.google.com/app/apikey
"""

import os
import logging
import google.generativeai as genai
from typing import Dict, Any

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv('GEMINI_API_KEY', '')
        self.model = None
        
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                # Use gemini-pro - most stable and always available
                model_names = [
                    'gemini-pro',  # Most reliable, always works
                    'gemini-1.0-pro',
                    'gemini-1.5-flash',
                    'gemini-1.5-pro'
                ]
                
                self.model = None
                for model_name in model_names:
                    try:
                        self.model = genai.GenerativeModel(model_name)
                        # Don't test to save API quota - just create the model
                        logger.info(f"✅ Gemini AI initialized successfully ({model_name})")
                        break
                    except Exception as e:
                        logger.warning(f"Model {model_name} not available: {e}")
                        continue
                
                if not self.model:
                    logger.error("❌ No Gemini models are available")
                    
            except Exception as e:
                logger.error(f"❌ Gemini initialization error: {e}")
                self.model = None
        else:
            logger.warning("⚠️ GEMINI_API_KEY not found. AI features will use fallback.")
    
    def is_available(self) -> bool:
        """Check if Gemini is available"""
        return self.model is not None
    
    def generate(self, prompt: str, max_tokens: int = 1000, temperature: float = 0.7) -> str:
        """Generate text using Gemini"""
        if not self.model:
            return ""
        
        try:
            # Configure generation parameters
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                top_p=0.95,
            )
            
            response = self.model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            # Check if response has text
            if response and hasattr(response, 'text') and response.text:
                return response.text.strip()
            
            # Check if response was blocked
            if response and hasattr(response, 'prompt_feedback'):
                logger.warning(f"Gemini response blocked: {response.prompt_feedback}")
            
            logger.warning("Gemini returned empty or blocked response")
            return ""
            
        except Exception as e:
            logger.error(f"Error generating with Gemini: {e}")
            return ""
    
    def generate_interview_email(self, candidate_name: str, context: Dict[str, Any]) -> Dict[str, str]:
        """Generate professional interview invitation email"""
        position = context.get('position', 'the position')
        company = context.get('company', 'Our Company')
        interview_date = context.get('interview_date', 'TBD')
        interview_location = context.get('interview_location', 'Our office')
        interview_type = context.get('interview_type', 'HR Interview')
        additional_notes = context.get('additional_notes', '')
        interview_link = context.get('interview_link', '')
        
        prompt = f"""You are a professional HR manager. Generate a professional, engaging HTML-formatted interview invitation email.

**Candidate Details:**
- Name: {candidate_name}
- Position: {position}
- Company: {company}

**Interview Details:**
- Type: {interview_type}
- Date & Time: {interview_date}
- Location: {interview_location}
- Notes: {additional_notes}
- Interview Link: {interview_link}

**Requirements:**
1. Write in HTML format with proper tags
2. Use a warm, professional tone
3. Start with "Dear {candidate_name},"
4. Congratulate them on being selected
5. Clearly present all interview details
6. Add 2-3 preparation tips specific to {interview_type}
7. IMPORTANT: Include a prominent button/link with text "Join Interview" that links to: {interview_link}
8. Mention that they should click the link at the scheduled time
9. If they arrive early, they'll see a waiting page
10. Request confirmation
11. Include contact information
12. End with "Best regards, {company} Recruitment Team"

**Format:**
Subject: [Create engaging subject line]

[HTML email body with <p>, <strong>, <ul>, <li> tags and a prominent call-to-action button linking to the interview]

Generate ONLY the subject and body, nothing else."""

        response = self.generate(prompt, max_tokens=1000, temperature=0.7)
        
        # Parse response
        subject, body = self._parse_email(response)
        
        if not subject:
            subject = f"Interview Invitation - {position} at {company}"
        
        if not body:
            # Fallback template
            body = self._generate_fallback_email(candidate_name, context)
        
        return {
            'subject': subject,
            'body': body
        }
    
    def _parse_email(self, text: str) -> tuple:
        """Parse email into subject and body"""
        lines = text.strip().split('\n')
        
        subject = ""
        body_lines = []
        found_subject = False
        
        for line in lines:
            clean_line = line.strip()
            if clean_line.lower().startswith('subject:'):
                subject = clean_line.replace('Subject:', '').replace('subject:', '').strip()
                found_subject = True
            elif found_subject and clean_line:
                body_lines.append(line)
        
        body = '\n'.join(body_lines).strip()
        
        return subject, body
    
    def _generate_fallback_email(self, name: str, context: Dict) -> str:
        """Generate fallback HTML email if parsing fails"""
        position = context.get('position', 'the position')
        company = context.get('company', 'Our Company')
        interview_date = context.get('interview_date', 'TBD')
        interview_location = context.get('interview_location', 'Our office')
        interview_type = context.get('interview_type', 'HR Interview')
        additional_notes = context.get('additional_notes', '')
        interview_link = context.get('interview_link', '')
        
        # Preparation tips based on interview type
        tips = {
            'hr': [
                'Review your resume and be ready to discuss your experience',
                'Prepare questions about company culture and the role',
                'Research our company values and recent achievements'
            ],
            'ai': [
                'Ensure you have a stable internet connection and quiet environment',
                'Test your camera and microphone beforehand',
                'Prepare to demonstrate problem-solving skills'
            ],
            'technical': [
                'Review fundamental concepts related to the role',
                'Be prepared for coding challenges or technical questions',
                'Have examples of past projects ready to discuss'
            ],
            'final': [
                'Prepare thoughtful questions for leadership team',
                'Review all previous interview discussions',
                'Be ready to discuss salary expectations and start date'
            ]
        }
        
        interview_type_lower = interview_type.lower()
        prep_tips = tips.get(interview_type_lower, tips['hr'])
        tips_html = '\n'.join([f'<li>{tip}</li>' for tip in prep_tips])
        
        body = f"""<p>Dear {name},</p>

<p>Congratulations! We are delighted to inform you that your application for the <strong>{position}</strong> position at {company} has been shortlisted.</p>

<p>We would like to invite you for a <strong>{interview_type}</strong> to discuss your qualifications and learn more about how you can contribute to our team.</p>

<div class="highlight-box" style="background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
<p style="margin: 5px 0;"><strong>📅 Interview Details:</strong></p>
<p style="margin: 5px 0;"><strong>Date & Time:</strong> {interview_date}</p>
<p style="margin: 5px 0;"><strong>Location:</strong> {interview_location}</p>
<p style="margin: 5px 0;"><strong>Interview Type:</strong> {interview_type}</p>
</div>

{f'<p><strong>⚠️ Important Notes:</strong><br>{additional_notes}</p>' if additional_notes else ''}

<p><strong>To help you prepare:</strong></p>
<ul>
{tips_html}
</ul>

{f'''
<div style="text-align: center; margin: 30px 0;">
<a href="{interview_link}" style="display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">🎯 Join Interview</a>
<p style="margin-top: 10px; font-size: 14px; color: #666;"><em>Click this link at the scheduled time to start your interview</em></p>
<p style="font-size: 12px; color: #999;">If you arrive early, you'll see a waiting page with countdown</p>
</div>
''' if interview_link else '<p><em>The meeting link will be shared with you 30 minutes before the scheduled time.</em></p>'}

<p><strong>Next Steps:</strong></p>
<p>Please confirm your availability by replying to this email at your earliest convenience. If you need to reschedule, let us know and we'll find an alternative time.</p>

<p>Should you have any questions or require additional information, please don't hesitate to contact us.</p>

<p>We look forward to meeting you and discussing this exciting opportunity!</p>

<p>Best regards,<br>
<strong>{company} Recruitment Team</strong></p>"""
        
        return body
