"""
Email Service - AI-generated professional emails
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self, llm_service, gemini_service=None):
        self.llm = llm_service
        self.gemini = gemini_service
    
    def generate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate professional email
        
        Args:
            data: {
                type: str (rejection, interview_invite, offer, reminder, etc.),
                context: Dict (additional context),
                recipient_name: str,
                tone: str (formal/friendly)
            }
            
        Returns:
            Generated email with subject and body
        """
        email_type = data.get('type', 'general')
        context = data.get('context', {})
        recipient_name = data.get('recipient_name', 'there')
        tone = data.get('tone', 'professional')
        
        # Use Gemini for interview invitations if available (better quality)
        if email_type == 'interview_invite' and self.gemini and self.gemini.is_available():
            try:
                logger.info("🌟 Using Gemini AI for professional interview email")
                result = self.gemini.generate_interview_email(recipient_name, context)
                return {
                    'subject': result['subject'],
                    'body': result['body'],
                    'full_text': result['body']
                }
            except Exception as e:
                logger.error(f"Gemini error, falling back to LLM: {e}")
        
        # Fallback to LLM service
        prompts = {
            'rejection': self._rejection_prompt(recipient_name, context, tone),
            'interview_invite': self._interview_invite_prompt(recipient_name, context, tone),
            'offer': self._offer_prompt(recipient_name, context, tone),
            'reminder': self._reminder_prompt(recipient_name, context, tone),
            'welcome': self._welcome_prompt(recipient_name, context, tone),
            'performance_review': self._performance_review_prompt(recipient_name, context, tone)
        }
        
        prompt = prompts.get(email_type, self._general_prompt(recipient_name, context, tone))
        
        response = self.llm.generate(prompt, max_tokens=600, temperature=0.6)
        
        # Extract subject and body
        subject, body = self._parse_email(response)
        
        return {
            'subject': subject,
            'body': body,
            'full_text': response
        }
    
    def _rejection_prompt(self, name: str, context: Dict, tone: str) -> str:
        position = context.get('position', 'the position')
        
        return f"""<s>[INST] You are a professional HR manager. Write a polite, empathetic rejection email.

DETAILS:
- Candidate Name: {name}
- Position Applied: {position}

REQUIREMENTS:
1. Use professional, compassionate tone
2. Start with "Dear {name},"
3. Thank them for their time and interest
4. Politely inform them they were not selected
5. Acknowledge their qualifications positively
6. Encourage future applications
7. Wish them well in their career
8. End with "Best regards," and "HR Department"

Write ONLY the email:

Subject: [Professional, respectful subject line]

Dear {name},

[Empathetic, professional rejection letter with proper paragraphs]

We wish you all the best in your future endeavors.

Best regards,
HR Department
[Company Name] [/INST]"""
    
    def _interview_invite_prompt(self, name: str, context: Dict, tone: str) -> str:
        position = context.get('position', 'the position')
        company = context.get('company', 'Our Company')
        interview_date = context.get('interview_date', 'TBD')
        interview_location = context.get('interview_location', 'Our office')
        interview_type = context.get('interview_type', 'HR Interview')
        additional_notes = context.get('additional_notes', '')
        
        return f"""<s>[INST] You are a professional HR manager at {company}. Write an engaging, well-formatted HTML interview invitation email.

CANDIDATE DETAILS:
- Name: {name}
- Position Applied: {position}
- Company: {company}

INTERVIEW DETAILS:
- Type: {interview_type}
- Date & Time: {interview_date}
- Location: {interview_location}
- Additional Notes: {additional_notes}

REQUIREMENTS:
1. Use professional yet warm tone
2. Format in HTML with proper structure
3. Start with "Dear {name},"
4. Congratulate them on being selected for interview
5. Clearly present interview details in an organized way
6. Explain what type of interview it is ({interview_type})
7. If location is "Virtual", mention that meeting link will be shared
8. Include preparation tips relevant to the interview type
9. Request confirmation of attendance
10. End with "Best regards," and "{company} Recruitment Team"

Write ONLY the email in this EXACT format:

Subject: Interview Invitation - {position} at {company}

<p>Dear {name},</p>

<p>Congratulations! We are pleased to inform you that your application for the <strong>{position}</strong> position at {company} has been shortlisted.</p>

<p>We would like to invite you for a <strong>{interview_type}</strong> to discuss your qualifications and learn more about your experience.</p>

<div class="highlight-box">
<p><strong>Interview Details:</strong></p>
<p>📅 <strong>Date & Time:</strong> {interview_date}</p>
<p>📍 <strong>Location:</strong> {interview_location}</p>
<p>🎯 <strong>Interview Type:</strong> {interview_type}</p>
</div>

{f"<p><strong>Important Notes:</strong><br>{additional_notes}</p>" if additional_notes else ""}

<p><strong>What to Expect:</strong></p>
[Add 2-3 relevant bullet points about the interview based on type]

<p><strong>Please Bring/Prepare:</strong></p>
[Add relevant items to bring or prepare]

<p>Kindly confirm your availability by replying to this email at your earliest convenience.</p>

<p>Should you have any questions or need to reschedule, please don't hesitate to reach out to us.</p>

<p>We look forward to meeting you and discussing how your skills align with this exciting opportunity!</p>

<p>Best regards,<br>
<strong>{company} Recruitment Team</strong><br>
Email: hr@{company.lower().replace(' ', '')}.com</p>
[/INST]"""
    
    def _offer_prompt(self, name: str, context: Dict, tone: str) -> str:
        position = context.get('position', 'the position')
        salary = context.get('salary', 'Competitive')
        
        return f"""<s>[INST] You are a professional HR manager. Write a formal job offer letter.

DETAILS:
- Candidate Name: {name}
- Position: {position}
- Compensation: {salary}

REQUIREMENTS:
1. Use formal business letter format
2. Start with "Dear {name},"
3. Congratulate them on receiving the offer
4. Clearly state position title and key terms
5. Mention start date, compensation, and benefits
6. Express enthusiasm about them joining
7. Mention next steps (offer acceptance, documentation)
8. End professionally with "Sincerely," and "HR Department"

Write ONLY the email:

Subject: [Professional subject line about job offer]

Dear {name},

[Professional offer letter with clear paragraphs]

We are excited to welcome you to our team.

Sincerely,
HR Department
[Company Name] [/INST]"""
    
    def _reminder_prompt(self, name: str, context: Dict, tone: str) -> str:
        task = context.get('task', 'complete your pending task')
        deadline = context.get('deadline', 'soon')
        
        return f"""<s>[INST] Write a friendly reminder email.

Recipient: {name}
Task: {task}
Deadline: {deadline}
Tone: {tone}

The email should:
- Politely remind them of the task
- Mention the deadline
- Offer help if needed
- Be friendly and supportive

Format:
Subject: [subject line]

[email body]

Best regards,
HR Team [/INST]"""
    
    def _welcome_prompt(self, name: str, context: Dict, tone: str) -> str:
        position = context.get('position', 'the team')
        start_date = context.get('start_date', '[Start Date]')
        
        return f"""<s>[INST] Write a warm welcome email for a new employee.

Recipient: {name}
Position: {position}
Start Date: {start_date}
Tone: friendly and welcoming

The email should:
- Welcome them to the company
- Express excitement about them joining
- Provide first-day information
- Make them feel valued

Format:
Subject: [subject line]

[email body]

Best regards,
HR Team [/INST]"""
    
    def _performance_review_prompt(self, name: str, context: Dict, tone: str) -> str:
        review_date = context.get('review_date', '[Date]')
        
        return f"""<s>[INST] Write a professional performance review meeting invitation.

Recipient: {name}
Review Date: {review_date}
Tone: {tone}

The email should:
- Invite them to the performance review meeting
- Mention it's a regular review process
- Ask them to prepare self-assessment
- Be professional and encouraging

Format:
Subject: [subject line]

[email body]

Best regards,
HR Team [/INST]"""
    
    def _general_prompt(self, name: str, context: Dict, tone: str) -> str:
        message = context.get('message', 'a general HR communication')
        
        return f"""<s>[INST] Write a professional HR email.

Recipient: {name}
Message: {message}
Tone: {tone}

Format:
Subject: [subject line]

[email body]

Best regards,
HR Team [/INST]"""
    
    def _parse_email(self, text: str) -> tuple:
        """Parse email into subject and body"""
        lines = text.strip().split('\n')
        
        subject = ""
        body_lines = []
        found_subject = False
        
        for line in lines:
            if line.strip().startswith('Subject:'):
                subject = line.replace('Subject:', '').strip()
                found_subject = True
            elif found_subject:
                body_lines.append(line)
        
        body = '\n'.join(body_lines).strip()
        
        if not subject:
            subject = "Message from HR"
        
        if not body:
            body = text
        
        return subject, body
