"""
AI Microservice for HRMS
Handles all AI-powered features using local LLaMA model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import AI modules
from services.llm_service import LLMService
from services.gemini_service import GeminiService
from services.resume_service import ResumeService
from services.resume_screening_service import ResumeScreeningService
from services.job_description_service import JobDescriptionService
from services.email_service import EmailService
from services.performance_service import PerformanceService
from services.interview_service import InterviewService
from services.pdf_service import pdf_extractor

# Import new routes
from routes.question_generator import question_generator_bp


# Initialize services
llm_service = LLMService()
gemini_service = GeminiService()
resume_service = ResumeService(llm_service)
resume_screening_service = ResumeScreeningService(llm_service)
job_description_service = JobDescriptionService(llm_service)
email_service = EmailService(llm_service, gemini_service)
performance_service = PerformanceService(llm_service)
interview_service = InterviewService(llm_service, gemini_service)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'AI HRMS Service',
        'model_loaded': llm_service.is_loaded()
    })

@app.route('/api/ai/resume/screen', methods=['POST'])
def screen_resume():
    """
    Screen resume against job description
    Body: { resume_text OR resume_url, job_description }
    """
    try:
        data = request.json
        resume_text = data.get('resume_text')
        resume_url = data.get('resume_url')
        job_description = data.get('job_description')
        
        if not job_description:
            return jsonify({'error': 'Missing job_description'}), 400
        
        # If resume_url is provided, fetch and parse it
        if resume_url and not resume_text:
            logger.info(f"📄 Fetching resume from URL: {resume_url[:50]}...")
            result = resume_service.screen_resume_from_url(resume_url, job_description)
        elif resume_text:
            # Use provided text directly
            result = resume_service.screen_resume(resume_text, job_description)
        else:
            return jsonify({'error': 'Missing resume_text or resume_url'}), 400
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error screening resume: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/resume/parse', methods=['POST'])
def parse_resume():
    """
    Parse resume file (PDF/DOCX) and extract text
    Body: multipart/form-data with 'file' field
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        result = resume_service.parse_resume_file(file)
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error parsing resume: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/resume/rank', methods=['POST'])
def rank_candidates():
    """
    Rank multiple candidates against job description
    Body: { candidates: [{id, resume_text}], job_description }
    """
    try:
        data = request.json
        candidates = data.get('candidates', [])
        job_description = data.get('job_description')
        
        if not candidates or not job_description:
            return jsonify({'error': 'Missing candidates or job_description'}), 400
        
        result = resume_service.rank_candidates(candidates, job_description)
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error ranking candidates: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/resume/screen-comprehensive', methods=['POST'])
def screen_resume_comprehensive():
    """
    Comprehensive ATS-style resume screening
    Body: { resume_text OR resume_url, job_description, job_title }
    """
    try:
        data = request.json
        resume_text = data.get('resume_text')
        resume_url = data.get('resume_url')
        job_description = data.get('job_description')
        job_title = data.get('job_title', '')
        
        if not job_description:
            return jsonify({'error': 'Missing job_description'}), 400
        
        # If resume_url is provided, fetch and parse it
        if resume_url and not resume_text:
            logger.info(f"📄 Fetching resume from URL: {resume_url[:50]}...")
            from services.resume_parser import ResumeParser
            parser = ResumeParser()
            resume_text = parser.parse_from_url(resume_url)
            
            if not resume_text:
                return jsonify({
                    'success': False,
                    'error': 'Failed to extract text from resume'
                }), 400
        
        if not resume_text:
            return jsonify({'error': 'Missing resume_text or resume_url'}), 400
        
        # Perform comprehensive screening
        result = resume_screening_service.screen_resume_comprehensive(
            resume_text, 
            job_description,
            job_title
        )
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error in comprehensive screening: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/job-description/generate', methods=['POST'])
def generate_job_description():
    """
    Generate job description from title and skills
    Body: { title, skills: [], department, experience_level }
    """
    try:
        data = request.json
        result = job_description_service.generate(data)
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error generating job description: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/email/generate', methods=['POST'])
def generate_email():
    """
    Generate professional email
    Body: { type, context, recipient_name }
    """
    try:
        data = request.json
        result = email_service.generate(data)
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error generating email: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/performance/summarize', methods=['POST'])
def summarize_performance():
    """
    Summarize employee performance data
    Body: { employee_data, performance_metrics, attendance, feedback }
    """
    try:
        data = request.json
        result = performance_service.summarize(data)
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error summarizing performance: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/chat', methods=['POST'])
def chat():
    """
    Autonomous AI Assistant with action execution
    Body: { message, user_role, context }
    """
    try:
        from services.data_access_service import data_access_service
        from services.action_executor_service import action_executor
        from services.role_based_assistant import role_based_assistant
        
        data = request.json
        message = data.get('message')
        user_role = data.get('user_role', 'employee')
        context = data.get('context', {})
        user_name = context.get('user_name', 'User')
        
        if not message:
            return jsonify({'error': 'Missing message'}), 400
        
        message_lower = message.lower()
        
        # STEP 0: Parse intent and check permissions (Role-Based Assistant)
        intent_data = role_based_assistant.parse_intent(message, user_role, context)
        
        if intent_data['requires_permission']:
            # Execute with permission check
            result = role_based_assistant.execute_with_permission(
                intent_data, user_role, user_name, context
            )
            
            return jsonify({
                'success': result['success'],
                'data': {
                    'response': result['message'],
                    'has_action': result['logged'],
                    'action_type': intent_data['intent'],
                    'action_data': result.get('data'),
                    'permission_checked': True
                }
            })
        
        # STEP 1: Check if user wants to execute an action (Legacy support)
        action_intent = action_executor.detect_action_intent(message, user_role)
        
        if action_intent['has_action']:
            logger.info(f"Action detected: {action_intent['action_type']} for role: {user_role}")
            
            # Execute the action
            action_result = action_executor.execute_action(
                action_intent['action_type'],
                action_intent['parameters'],
                user_role,
                context
            )
            
            return jsonify({
                'success': True,
                'data': {
                    'response': action_result['message'],
                    'has_action': True,
                    'action_type': action_intent['action_type'],
                    'action_data': action_result.get('data'),
                    'next_steps': action_result.get('next_steps', [])
                }
            })
        
        # STEP 2: Check if user is asking for data
        data_request = None
        if any(word in message_lower for word in ['show', 'view', 'get', 'list', 'how many', 'statistics', 'stats', 'analytics']):
            if 'job' in message_lower and 'application' not in message_lower:
                data_request = 'jobs'
            elif 'application' in message_lower or 'candidate' in message_lower:
                data_request = 'applications'
            elif 'analytic' in message_lower or 'metric' in message_lower:
                data_request = 'recruitment_analytics'
        
        # If data is requested, fetch and format it
        if data_request:
            logger.info(f"Data request detected: {data_request} for role: {user_role}")
            data_result = data_access_service.get_accessible_data(user_role, data_request, context)
            formatted_data = data_access_service.format_data_for_chat(data_result, message)
            
            # Combine with AI response
            ai_response = llm_service.chat(message, user_role, context)
            
            # Return data + AI insights
            combined_response = f"{formatted_data}\n\n{ai_response}"
            
            return jsonify({
                'success': True,
                'data': {
                    'response': combined_response,
                    'has_data': True,
                    'data_type': data_request
                }
            })
        else:
            # STEP 3: Regular conversational chat
            result = llm_service.chat(message, user_role, context)
            
            return jsonify({
                'success': True,
                'data': {
                    'response': result,
                    'has_data': False,
                    'has_action': False
                }
            })
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/interview/questions', methods=['POST'])
def generate_interview_questions():
    """
    Generate AI interview questions OR load custom questions from PDF
    Body: { job_title, interview_type, num_questions, application_id }
    """
    try:
        data = request.json
        job_title = data.get('job_title', 'Software Developer')
        interview_type = data.get('interview_type', 'technical')
        num_questions = data.get('num_questions', 5)
        application_id = data.get('application_id')
        
        # Check if custom questions exist for this application
        if application_id:
            logger.info(f"🔍 Checking for custom questions for application {application_id}")
            try:
                import requests
                backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
                response = requests.get(f"{backend_url}/api/interview-questions/{application_id}")
                
                if response.status_code == 200:
                    custom_questions_data = response.json()
                    custom_questions = custom_questions_data.get('data', [])
                    
                    if custom_questions and len(custom_questions) > 0:
                        logger.info(f"✅ Found {len(custom_questions)} custom questions from PDF!")
                        
                        # Convert custom questions to expected format
                        questions = []
                        for q in custom_questions:
                            questions.append({
                                'text': q.get('question_text'),
                                'type': q.get('question_type', 'general'),
                                'duration': q.get('duration', 180),
                                'code': q.get('code_snippet'),
                                'language': q.get('code_language', 'javascript'),
                                'expected_answer': q.get('expected_answer'),
                                'answer_mode': q.get('answer_mode', 'voice')  # 'voice' or 'write'
                            })
                        
                        total_duration = sum(q['duration'] for q in questions)
                        
                        return jsonify({
                            'success': True,
                            'data': {
                                'questions': questions,
                                'estimated_duration': total_duration // 60,
                                'source': 'custom_pdf'
                            }
                        })
            except Exception as e:
                logger.warning(f"Could not fetch custom questions: {e}")
        
        # No custom questions found, generate new ones
        logger.info(f"🎯 Generating {num_questions} {interview_type} interview questions for {job_title}")
        
        result = interview_service.generate_questions(job_title, interview_type, num_questions)
        result['source'] = 'ai_generated'
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/interview/generate-questions', methods=['POST'])
def generate_questions_by_category():
    """
    Generate AI interview questions based on category and difficulty
    Body: { job_role, category, difficulty, num_questions }
    """
    try:
        data = request.json
        job_role = data.get('job_role', 'Software Developer')
        category = data.get('category', 'technical')
        difficulty = data.get('difficulty', 'intermediate')
        num_questions = data.get('num_questions', 5)
        
        logger.info(f"🎯 Generating {num_questions} {difficulty} {category} questions for {job_role}")
        
        result = interview_service.generate_questions_by_category(job_role, category, difficulty, num_questions)
        
        return jsonify({
            'success': True,
            'data': result,
            'message': f'Generated {len(result.get("questions", []))} {difficulty} {category} questions for {job_role}'
        })
        
    except Exception as e:
        logger.error(f"❌ Error generating questions by category: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/ai/interview/evaluate', methods=['POST'])
def evaluate_interview():
    """
    Evaluate interview responses and generate score
    Body: { interview_token, questions, answers, job_title, candidate_name }
    """
    try:
        data = request.json
        interview_token = data.get('interview_token')
        questions = data.get('questions', [])
        answers = data.get('answers', [])
        job_title = data.get('job_title', 'Position')
        candidate_name = data.get('candidate_name', 'Candidate')
        
        logger.info(f"📊 Evaluating interview for {candidate_name} - {job_title}")
        logger.info(f"📝 Questions: {len(questions)}, Answers: {len(answers)}")
        
        result = interview_service.evaluate_interview(questions, answers, job_title, candidate_name)
        
        # Save results to backend if token provided
        if interview_token:
            try:
                import requests
                backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
                response = requests.post(
                    f"{backend_url}/api/applications/interview/{interview_token}/results",
                    json=result,
                    headers={'Content-Type': 'application/json'}
                )
                logger.info(f"✅ Results saved to backend: {response.status_code}")
            except Exception as e:
                logger.error(f"Failed to save results to backend: {e}")
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error evaluating interview: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/interview/extract-from-pdf', methods=['POST'])
def extract_questions_from_pdf():
    """
    Extract interview questions from uploaded PDF
    Files: pdf_file (PDF document)
    Form data: job_title, num_questions
    """
    try:
        # Check if PDF file is provided
        if 'pdf_file' not in request.files:
            return jsonify({'error': 'No PDF file provided'}), 400
        
        pdf_file = request.files['pdf_file']
        
        if pdf_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not pdf_file.filename.endswith('.pdf'):
            return jsonify({'error': 'File must be a PDF'}), 400
        
        # Get optional parameters
        job_title = request.form.get('job_title', 'Position')
        num_questions = int(request.form.get('num_questions', 10))
        
        logger.info(f"📄 Extracting questions from PDF: {pdf_file.filename}")
        logger.info(f"🎯 Job Title: {job_title}, Max Questions: {num_questions}")
        
        # Extract questions
        result = pdf_extractor.extract_questions_from_pdf(
            pdf_file, 
            job_title, 
            num_questions
        )
        
        if not result.get('success'):
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to extract questions')
            }), 500
        
        return jsonify({
            'success': True,
            'data': {
                'questions': result['questions'],
                'total_questions': result['total_questions'],
                'estimated_duration': result['estimated_duration'],
                'source': 'pdf',
                'filename': pdf_file.filename
            }
        })
        
    except Exception as e:
        logger.error(f"Error extracting questions from PDF: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Register blueprints
app.register_blueprint(question_generator_bp, url_prefix='/api/ai')

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
