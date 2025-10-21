"""
LLM Service - Handles LLaMA model initialization and inference
Supports both Ollama and llama-cpp-python
"""

import os
import logging
from typing import Optional, Dict, Any
import requests

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.model = None
        self.use_ollama = os.getenv('USE_OLLAMA', 'true').lower() == 'true'
        self.ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
        self.ollama_model = os.getenv('OLLAMA_MODEL', 'llama2:7b-chat')
        self.model_path = os.getenv('MODEL_PATH', './models/llama-2-7b-chat.gguf')
        self.max_tokens = int(os.getenv('MAX_TOKENS', 2048))
        self.temperature = float(os.getenv('TEMPERATURE', 0.7))
        self.top_p = float(os.getenv('TOP_P', 0.95))
        
        if self.use_ollama:
            self._check_ollama()
        else:
            self._load_model()
    
    def _check_ollama(self):
        """Check if Ollama is running and model is available"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get('models', [])
                model_names = [m['name'] for m in models]
                
                if self.ollama_model in model_names:
                    logger.info(f"✅ Ollama connected! Using model: {self.ollama_model}")
                    self.model = "ollama"  # Flag to indicate Ollama is available
                else:
                    logger.warning(f"⚠️ Model {self.ollama_model} not found in Ollama")
                    logger.info(f"Available models: {model_names}")
                    logger.info(f"Run: ollama pull {self.ollama_model}")
                    self.model = None
            else:
                logger.warning("⚠️ Ollama is not responding")
                self.model = None
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️ Cannot connect to Ollama at {self.ollama_url}")
            logger.warning("Make sure Ollama is running: ollama serve")
            self.model = None
    
    def _load_model(self):
        """Load LLaMA model using llama-cpp-python"""
        try:
            from llama_cpp import Llama
            
            logger.info(f"Loading LLaMA model from {self.model_path}")
            
            self.model = Llama(
                model_path=self.model_path,
                n_ctx=4096,  # Context window
                n_threads=4,  # CPU threads
                n_gpu_layers=0,  # Set to >0 if you have GPU
                verbose=False
            )
            
            logger.info("✅ LLaMA model loaded successfully")
        except FileNotFoundError:
            logger.warning(f"⚠️ Model file not found at {self.model_path}")
            logger.warning("AI features will use fallback responses")
            self.model = None
        except Exception as e:
            logger.error(f"❌ Error loading model: {str(e)}")
            self.model = None
    
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.model is not None
    
    def generate(self, prompt: str, max_tokens: Optional[int] = None, 
                 temperature: Optional[float] = None, 
                 stop: Optional[list] = None) -> str:
        """
        Generate text from prompt
        
        Args:
            prompt: Input prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            stop: Stop sequences
            
        Returns:
            Generated text
        """
        if not self.model:
            return self._fallback_response(prompt)
        
        try:
            if self.use_ollama and self.model == "ollama":
                return self._generate_ollama(prompt, max_tokens, temperature)
            else:
                response = self.model(
                    prompt,
                    max_tokens=max_tokens or self.max_tokens,
                    temperature=temperature or self.temperature,
                    top_p=self.top_p,
                    stop=stop or ["</s>", "Human:", "User:"],
                    echo=False
                )
                
                return response['choices'][0]['text'].strip()
        except Exception as e:
            logger.error(f"Error generating text: {str(e)}")
            return self._fallback_response(prompt)
    
    def _generate_ollama(self, prompt: str, max_tokens: Optional[int] = None,
                         temperature: Optional[float] = None) -> str:
        """Generate text using Ollama API"""
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "num_predict": max_tokens or self.max_tokens,
                        "temperature": temperature or self.temperature,
                        "top_p": self.top_p
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                return response.json().get('response', '').strip()
            else:
                logger.error(f"Ollama API error: {response.status_code}")
                return self._fallback_response(prompt)
        except Exception as e:
            logger.error(f"Error calling Ollama: {str(e)}")
            return self._fallback_response(prompt)
    
    def chat(self, message: str, user_role: str = 'employee', 
             context: Dict[str, Any] = None) -> str:
        """
        Role-based chat completion with context awareness
        
        Args:
            message: User message
            user_role: User's role (admin, hr, manager, employee, candidate)
            context: Additional context including conversation history
            
        Returns:
            AI response
        """
        if context is None:
            context = {}
        
        user_name = context.get('user_name', 'there')
        conversation_history = context.get('conversation_history', [])
        
        system_prompts = {
            'admin': f"""You are an AI HR Assistant helping {user_name}, an HR Admin. 

Your capabilities:
- Generate job descriptions
- Screen candidates and explain ATS system
- Draft professional emails (interview invites, offers, rejections)
- Provide recruitment analytics insights
- Explain HR policies and best practices
- Guide through HRMS features

Be helpful, professional, and provide actionable advice. If asked about system features, explain step-by-step.""",
            
            'hr': f"""You are an AI HR Assistant helping {user_name}, an HR professional.

Your capabilities:
- Generate job descriptions for any role
- Explain ATS screening system (Skills 35%, Keywords 20%, Experience 25%, Education 10%, AI 10%)
- Draft professional emails (interview invitations, job offers, rejections, reminders)
- Guide through candidate screening process
- Provide recruitment best practices
- Help with employee relations questions

Be conversational, helpful, and provide specific examples when possible.""",
            
            'manager': f"""You are an AI assistant helping {user_name}, a team manager.

Your capabilities:
- Provide guidance on team performance management
- Help with employee development strategies
- Explain leave and attendance policies
- Assist with performance review questions
- Offer leadership tips

Be supportive and provide practical management advice.""",
            
            'employee': f"""You are an AI assistant helping {user_name}, an employee.

Your capabilities:
- Answer questions about leave policies
- Explain payroll and benefits
- Help with attendance queries
- Provide general HR information
- Guide through self-service features

Be friendly and helpful. Do not share confidential company data.""",
            
            'candidate': f"""You are an AI assistant helping {user_name}, a job candidate.

Your capabilities:
- Help with application status questions
- Provide interview preparation tips
- Explain the hiring process
- Answer job-related questions

Be encouraging and professional."""
        }
        
        system_prompt = system_prompts.get(user_role, system_prompts['employee'])
        
        # Build conversation context
        conversation_context = ""
        if conversation_history:
            recent_messages = conversation_history[-3:]  # Last 3 messages
            for msg in recent_messages:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                if role == 'user':
                    conversation_context += f"User: {content}\n"
                elif role == 'assistant':
                    conversation_context += f"Assistant: {content}\n"
        
        # Create prompt with context
        if conversation_context:
            prompt = f"""<s>[INST] <<SYS>>
{system_prompt}

Previous conversation:
{conversation_context}
<</SYS>>

Current question: {message}

Provide a helpful, specific response based on the conversation context. [/INST]"""
        else:
            prompt = f"""<s>[INST] <<SYS>>
{system_prompt}
<</SYS>>

{message}

Provide a helpful, specific response. [/INST]"""
        
        return self.generate(prompt, max_tokens=512, temperature=0.7)
    
    def extract_json(self, text: str, prompt: str) -> Dict[str, Any]:
        """
        Extract structured JSON from text using LLM
        
        Args:
            text: Input text
            prompt: Extraction prompt
            
        Returns:
            Extracted data as dictionary
        """
        full_prompt = f"""<s>[INST] {prompt}

Text:
{text}

Respond ONLY with valid JSON, no additional text. [/INST]"""
        
        response = self.generate(full_prompt, max_tokens=1024, temperature=0.3)
        
        # Try to parse JSON
        import json
        try:
            # Find JSON in response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                json_str = response[start:end]
                return json.loads(json_str)
            else:
                return {}
        except:
            return {}
    
    def _fallback_response(self, prompt: str) -> str:
        """Enhanced fallback response when model is not available"""
        # Extract just the user message from the full prompt
        if '[/INST]' in prompt:
            # Extract the actual user message
            parts = prompt.split('Current question:')
            if len(parts) > 1:
                user_message = parts[1].split('[/INST]')[0].strip()
            else:
                # Try alternative format
                parts = prompt.split('<</SYS>>')
                if len(parts) > 1:
                    user_message = parts[1].split('[/INST]')[0].strip()
                else:
                    user_message = prompt
        else:
            user_message = prompt
        
        message_lower = user_message.lower().strip()
        
        # Greetings - exact match
        greeting_words = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings']
        if message_lower in greeting_words or message_lower.replace('!', '').replace('.', '') in greeting_words:
            return """Hello! 👋 I'm your AI HR Assistant.

I can help you with:
• Posting jobs and managing applications
• Screening candidates with ATS
• Sending emails to candidates
• Generating job descriptions
• HR best practices and guidance

What would you like to do today?"""
        
        # Thank you
        elif any(word in message_lower for word in ['thank', 'thanks', 'appreciate']):
            return "You're welcome! Let me know if you need anything else. Happy to help! 😊"
        
        # Job posting/application questions
        elif "how" in message_lower and ("post" in message_lower or "application" in message_lower):
            return """To post a job application, follow these steps:

1. **Go to Jobs Page**
   - Click on "Jobs" in the sidebar
   - Click "Post New Job" button

2. **Fill Job Details**
   - Job Title (e.g., "Senior Software Engineer")
   - Department
   - Location
   - Employment Type (Full-time, Part-time, Contract)
   - Salary Range
   - Job Description
   - Requirements
   - Skills needed

3. **Publish**
   - Click "Post Job"
   - Job will be visible to candidates

4. **Manage Applications**
   - Go to "Applications" page
   - View all applications for your jobs
   - Use AI screening to rank candidates
   - Send emails to top candidates

Would you like help with any specific step?"""
        
        # ATS/Screening questions
        elif "ats" in message_lower or "screen" in message_lower or "rank" in message_lower:
            return """The ATS (Applicant Tracking System) screens candidates automatically:

**How it works:**
1. Click "Rank All Candidates" on Applications page
2. System analyzes each resume against job description
3. Assigns scores based on:
   - Skills Match (35%)
   - Keywords (20%)
   - Experience (25%)
   - Education (10%)
   - AI Analysis (10%)

**ATS Score Ranges:**
- 80-100%: Highly Recommended
- 60-79%: Recommended
- 40-59%: Consider
- 20-39%: Weak Candidate
- 0-19%: Not Recommended

**Next Steps:**
- View detailed analysis for each candidate
- Select top X candidates
- Send interview invitations automatically

Try it now on the Applications page!"""
        
        # Email questions
        elif "email" in message_lower and ("send" in message_lower or "candidate" in message_lower):
            return """To send emails to candidates:

1. **Screen Candidates First**
   - Go to Applications page
   - Click "Rank All Candidates"
   - Wait for ATS scoring to complete

2. **Select Top Candidates**
   - Enter number (e.g., 5) in the input box
   - Click "Email Top X" button

3. **Configure Email**
   - Choose email type:
     * Interview Invitation
     * Job Offer
     * Rejection (Polite)
     * Application Reminder
   - Add custom message (optional)

4. **Send**
   - Click "Send Real Emails to X Candidates"
   - Confirm the action
   - System sends personalized emails with ATS scores

**Email Features:**
- AI-generated personalized content
- Includes candidate's ATS score
- Professional HTML template
- Delivery tracking

Need help with email setup? Check EMAIL_SETUP_GUIDE.md"""
        
        # Job description generation
        elif "generate" in message_lower and "job" in message_lower:
            return """I can help you generate a job description! Please provide:

1. **Job Title** (e.g., "Senior Full Stack Developer")
2. **Key Requirements** (e.g., "5+ years experience, React, Node.js")
3. **Department** (e.g., "Engineering")

Example:
"Generate a job description for a Senior DevOps Engineer with 5+ years experience in AWS, Docker, and Kubernetes"

Or use the Job Description Generator:
- Go to Jobs page
- Click "Generate with AI"
- Fill in the details
- Get a complete, professional job description

What role would you like to create a job description for?"""
        
        # Resume/candidate questions
        elif "resume" in message_lower:
            return """For resume screening:

**Automatic Screening:**
1. Go to Applications page
2. Click "Rank All Candidates"
3. System analyzes all resumes automatically
4. View ATS scores and detailed analysis

**Manual Review:**
1. Click on any application
2. Click "Download" to view resume
3. Click "AI Screen" for individual analysis
4. View detailed breakdown:
   - Skills match
   - Keywords found
   - Experience analysis
   - Education verification
   - AI insights
   - Interview questions

**Best Practices:**
- Screen all candidates at once for consistency
- Review top 20% manually
- Use interview questions provided by AI
- Check for red flags in gaps analysis

Need help with a specific candidate?"""
        
        # Performance questions
        elif "performance" in message_lower:
            return """Performance Management features:

**For Managers:**
- View team performance metrics
- Track individual goals
- Schedule performance reviews
- Provide feedback

**For HR/Admin:**
- Company-wide performance analytics
- Identify top performers
- Track improvement areas
- Generate performance reports

**Best Practices:**
- Regular 1-on-1 meetings
- Set SMART goals
- Provide constructive feedback
- Document achievements

Go to Performance page to get started!"""
        
        # General help
        else:
            return """I'm your AI HR Assistant! I can help you with:

**Recruitment:**
- Post job openings
- Screen candidates with ATS
- Send emails to candidates
- Generate job descriptions

**System Features:**
- How to use ATS screening
- Email automation setup
- Application management
- Candidate ranking

**HR Tasks:**
- Performance management
- Leave policies
- Payroll questions
- Best practices

What would you like help with? Please be specific, for example:
- "How do I post a job?"
- "Explain the ATS scoring system"
- "Help me send emails to top 5 candidates"
- "Generate a job description for a Data Scientist"

Ask me anything!"""
