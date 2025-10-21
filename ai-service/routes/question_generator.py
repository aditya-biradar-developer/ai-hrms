from flask import Blueprint, request, jsonify
from services.groq_question_generator import GroqQuestionGenerator
import logging

logger = logging.getLogger(__name__)

question_generator_bp = Blueprint('question_generator', __name__)
groq_generator = GroqQuestionGenerator()

@question_generator_bp.route('/generate-questions', methods=['POST'])
def generate_questions():
    """Generate questions for different interview rounds using GROQ AI"""
    try:
        data = request.get_json()
        
        round_type = data.get('roundType')
        config = data.get('config', {})
        job_title = data.get('jobTitle', 'Software Developer')
        job_description = data.get('jobDescription', '')
        
        if not round_type:
            return jsonify({
                'success': False,
                'message': 'Round type is required'
            }), 400
        
        logger.info(f"🎯 Generating questions for {round_type} round")
        logger.info(f"📋 Config: {config}")
        
        # Generate questions based on round type
        if round_type == 'aptitude':
            # Check if we have new topic-based configuration
            topic_configs = config.get('topicConfigs', None)
            
            if topic_configs:
                # New format: per-topic difficulty counts
                result = groq_generator.generate_aptitude_questions_by_topic(
                    topic_configs=topic_configs,
                    time_per_question=config.get('timePerQuestion', 60),
                    job_title=job_title
                )
            else:
                # Check for difficulty levels format
                difficulty_levels = config.get('difficultyLevels', None)
                
                if difficulty_levels:
                    # Difficulty-based format
                    result = groq_generator.generate_aptitude_questions_by_difficulty(
                        topics=config.get('topics', []),
                        difficulty_levels=difficulty_levels,
                        time_per_question=config.get('timePerQuestion', 60),
                        job_title=job_title
                    )
                else:
                    # Legacy format
                    topics_with_difficulty = config.get('topicsWithDifficulty', None)
                    result = groq_generator.generate_aptitude_questions(
                        topics=config.get('topics', []) if not topics_with_difficulty else None,
                        questions_per_topic=config.get('questionsPerTopic', 10),
                        difficulty=config.get('difficulty', 'medium'),
                        job_title=job_title,
                        topics_with_difficulty=topics_with_difficulty
                    )
        
        elif round_type == 'coding':
            result = groq_generator.generate_coding_problems(
                difficulty=config.get('difficulty', 'medium'),
                language=config.get('language', 'javascript'),
                job_title=job_title,
                job_description=job_description
            )
        
        elif round_type == 'communication':
            # Check if we have new structured configuration
            if 'reading' in config or 'listening' in config or 'grammar' in config:
                # Use structured batch generation to respect exact counts
                result = groq_generator.generate_structured_communication_assessment(
                    reading_config=config.get('reading', {}),
                    listening_config=config.get('listening', {}),
                    grammar_config=config.get('grammar', {}),
                    skills=config.get('skills', []),
                    time_limit=config.get('timeLimit', 30),
                    job_title=job_title
                )
            else:
                # Legacy format
                result = groq_generator.generate_communication_challenges(
                    skills=config.get('skills', ['listening', 'speaking', 'reading']),
                    topics=config.get('topics', []),
                    time_limit=config.get('timeLimit', 30),
                    job_title=job_title
                )
        
        elif round_type == 'faceToFace':
            result = groq_generator.generate_interview_questions(
                job_title=job_title,
                job_description=job_description,
                personality=config.get('aiPersonality', 'professional'),
                duration=config.get('duration', 45)
            )
        
        else:
            return jsonify({
                'success': False,
                'message': f'Unsupported round type: {round_type}'
            }), 400
        
        if result['success']:
            logger.info(f"✅ Generated {len(result.get('questions', result.get('problems', [])))} items successfully")
            return jsonify(result)
        else:
            logger.error(f"❌ Failed to generate questions: {result.get('message')}")
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"❌ Error in generate_questions: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}'
        }), 500

@question_generator_bp.route('/save-questions', methods=['POST'])
def save_questions():
    """Save generated questions to database"""
    try:
        data = request.get_json()
        
        application_id = data.get('applicationId')
        round_type = data.get('roundType')
        questions = data.get('questions', [])
        
        if not all([application_id, round_type, questions]):
            return jsonify({
                'success': False,
                'message': 'Application ID, round type, and questions are required'
            }), 400
        
        # Save questions to database
        result = groq_generator.save_questions_to_db(
            application_id=application_id,
            round_type=round_type,
            questions=questions
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Error saving questions: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to save questions: {str(e)}'
        }), 500

@question_generator_bp.route('/preview-assessment/<round_type>', methods=['GET'])
def preview_assessment(round_type):
    """Preview assessment interface for different round types"""
    try:
        # Return assessment interface configuration
        interfaces = {
            'aptitude': {
                'type': 'mcq',
                'features': ['timer', 'progress_bar', 'question_navigation', 'auto_submit'],
                'layout': 'single_question',
                'scoring': 'automatic'
            },
            'coding': {
                'type': 'code_editor',
                'features': ['split_view', 'test_cases', 'multiple_languages', 'syntax_highlighting'],
                'layout': 'problem_editor_split',
                'scoring': 'test_case_based'
            },
            'communication': {
                'type': 'voice_assessment',
                'features': ['voice_recording', 'speech_to_text', 'listening_tests', 'reading_comprehension'],
                'layout': 'multimedia',
                'scoring': 'ai_evaluation'
            },
            'faceToFace': {
                'type': 'video_interview',
                'features': ['video_recording', 'ai_interviewer', 'natural_conversation', 'real_time_response'],
                'layout': 'video_chat',
                'scoring': 'conversation_analysis'
            }
        }
        
        if round_type not in interfaces:
            return jsonify({
                'success': False,
                'message': f'Unknown round type: {round_type}'
            }), 400
        
        return jsonify({
            'success': True,
            'interface': interfaces[round_type]
        })
        
    except Exception as e:
        logger.error(f"❌ Error getting assessment preview: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get preview: {str(e)}'
        }), 500
