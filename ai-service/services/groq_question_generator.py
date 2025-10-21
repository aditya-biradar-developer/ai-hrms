"""
GROQ Question Generator - FREE and ULTRA-FAST
Generate interview questions using GROQ's lightning-fast LPU inference
Get free API key: https://console.groq.com/
"""

import os
import json
import requests
import logging
import time
from typing import List, Dict, Any
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class GroqQuestionGenerator:
    """Ultra-fast question generation using GROQ API"""
    
    def __init__(self):
        # Load multiple API keys for rotation
        self.api_keys = []
        
        # Primary API key
        primary_key = os.getenv('GROQ_API_KEY')
        if primary_key:
            self.api_keys.append(primary_key)
        
        # Additional API keys from comma-separated list
        additional_keys = os.getenv('GROQ_API_KEYS', '')
        if additional_keys:
            keys_list = [key.strip() for key in additional_keys.split(',') if key.strip()]
            # Remove duplicates and add to list
            for key in keys_list:
                if key not in self.api_keys:
                    self.api_keys.append(key)
        
        self.current_key_index = 0
        self.api_base = "https://api.groq.com/openai/v1"
        # Use fastest model for question generation
        self.model = os.getenv('GROQ_MODEL', 'llama-3.1-70b-versatile')
        
        # Initialize Supabase client for database operations
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        self.supabase = None
        if supabase_url and supabase_key:
            try:
                self.supabase = create_client(supabase_url, supabase_key)
                logger.info("✅ Supabase client initialized for question management")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize Supabase client: {str(e)}")
        
        # Global template tracking to prevent repetition
        self.used_reading_templates = set()
        self.used_listening_templates = set()
        self.used_grammar_templates = set()
        
        if self.api_keys:
            logger.info(f"✅ GROQ Question Generator initialized with {len(self.api_keys)} API keys (Model: {self.model})")
        else:
            logger.warning("⚠️ No GROQ API keys found - AI question generation will be limited")

    def get_current_api_key(self):
        """Get the current API key"""
        if not self.api_keys:
            return None
        return self.api_keys[self.current_key_index]
    
    def reset_template_tracking(self):
        """Reset template tracking when all templates are exhausted"""
        self.used_reading_templates.clear()
        self.used_listening_templates.clear()
        self.used_grammar_templates.clear()
        logger.info("🔄 Template tracking reset - all templates available again")
    
    def get_template_usage_stats(self):
        """Get current template usage statistics"""
        return {
            'reading_used': len(self.used_reading_templates),
            'listening_used': len(self.used_listening_templates),
            'grammar_used': len(self.used_grammar_templates)
        }
    
    def rotate_api_key(self):
        """Rotate to the next API key"""
        if len(self.api_keys) <= 1:
            logger.warning("⚠️ No additional API keys available for rotation")
            return False
        
        old_index = self.current_key_index
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        
        logger.info(f"🔄 Rotated API key from index {old_index} to {self.current_key_index}")
        return True

    def _check_existing_questions(self, topic_configs: List[Dict]) -> Dict[str, Dict[str, int]]:
        """Check existing questions in database and return counts by topic and difficulty"""
        if not self.supabase:
            logger.warning("⚠️ No database connection - cannot check existing questions")
            return {}
        
        try:
            existing_counts = {}
            self.existing_questions_content = {}  # Store existing question content for duplicate checking
            
            for topic_config in topic_configs:
                topic = topic_config['topic']
                existing_counts[topic] = {'easy': 0, 'medium': 0, 'hard': 0}
                self.existing_questions_content[topic] = []
                
                # Query existing questions for this topic (get full content for duplicate checking)
                response = self.supabase.table('aptitude_questions').select('difficulty, question_text').eq('topic', topic).execute()
                
                if response.data:
                    # Count questions by difficulty and store content
                    for question in response.data:
                        difficulty = question.get('difficulty', 'medium')
                        if difficulty in existing_counts[topic]:
                            existing_counts[topic][difficulty] += 1
                        
                        # Store question text for duplicate checking
                        question_text = question.get('question_text', '').lower().strip()
                        if question_text:
                            self.existing_questions_content[topic].append(question_text)
                
                logger.info(f"📊 Existing {topic}: {existing_counts[topic]} (content stored for duplicate check)")
            
            return existing_counts
            
        except Exception as e:
            logger.error(f"❌ Error checking existing questions: {str(e)}")
            return {}

    def _calculate_missing_questions(self, topic_configs: List[Dict], existing_counts: Dict[str, Dict[str, int]]) -> List[Dict]:
        """Calculate only the missing questions needed to reach target"""
        missing_configs = []
        
        for topic_config in topic_configs:
            topic = topic_config['topic']
            existing = existing_counts.get(topic, {'easy': 0, 'medium': 0, 'hard': 0})
            
            missing_config = {
                'topic': topic,
                'easy': max(0, topic_config.get('easy', 0) - existing['easy']),
                'medium': max(0, topic_config.get('medium', 0) - existing['medium']),
                'hard': max(0, topic_config.get('hard', 0) - existing['hard'])
            }
            
            missing_config['total'] = missing_config['easy'] + missing_config['medium'] + missing_config['hard']
            
            if missing_config['total'] > 0:
                missing_configs.append(missing_config)
                logger.info(f"🎯 Missing {topic}: {missing_config['easy']} easy, {missing_config['medium']} medium, {missing_config['hard']} hard (Total: {missing_config['total']})")
            else:
                logger.info(f"✅ {topic}: Already has enough questions")
        
        return missing_configs

    def generate_communication_questions_incremental(self, reading_config: Dict, listening_config: Dict,
                                                   grammar_config: Dict, skills: List[str],
                                                   time_limit: int = 30, job_title: str = 'Software Developer',
                                                   application_id: str = None) -> Dict[str, Any]:
        """Generate communication questions incrementally - one batch at a time like aptitude"""
        try:
            # Calculate target total from configs
            target_total = 0
            if 'reading' in skills:
                target_total += reading_config.get('easy', 0) + reading_config.get('medium', 0) + reading_config.get('hard', 0)
            if 'listening' in skills:
                sentences_config = listening_config.get('sentences', {})
                target_total += sentences_config.get('easy', 0) + sentences_config.get('medium', 0) + sentences_config.get('hard', 0)
            if 'grammar' in skills:
                topic_questions = grammar_config.get('topicQuestions', {})
                for topic_config in topic_questions.values():
                    target_total += topic_config.get('easy', 0) + topic_config.get('medium', 0) + topic_config.get('hard', 0)
            
            # Check existing questions if application_id provided
            existing_count = 0
            if application_id:
                try:
                    backend_url = "http://localhost:3000"
                    response = requests.get(f"{backend_url}/api/applications/{application_id}/questions", 
                                          params={'type': 'communication'})
                    if response.status_code == 200:
                        existing_questions = response.json().get('questions', [])
                        existing_count = len(existing_questions)
                        logger.info(f"📊 Found {existing_count} existing communication questions")
                    else:
                        logger.warning(f"⚠️ Could not fetch existing questions: HTTP {response.status_code}")
                except Exception as e:
                    logger.warning(f"⚠️ Could not check existing questions: {str(e)}")
            
            # Generate one batch (try reading first, then listening, then grammar)
            all_questions = []
            batch_size = min(10, target_total - existing_count)  # Generate up to 10 questions per batch
            
            # Get existing questions to avoid duplicates
            existing_questions = []
            if application_id:
                try:
                    backend_url = "http://localhost:3000"
                    response = requests.get(f"{backend_url}/api/applications/{application_id}/questions", 
                                          params={'type': 'communication'})
                    if response.status_code == 200:
                        existing_questions = response.json().get('questions', [])
                        logger.info(f"📋 Found {len(existing_questions)} existing questions for deduplication")
                except Exception as e:
                    logger.warning(f"⚠️ Could not fetch existing questions for deduplication: {str(e)}")
            
            # Try reading questions first
            if 'reading' in skills and len(all_questions) < batch_size:
                reading_questions = self._generate_small_reading_batch(reading_config, job_title, batch_size, existing_questions + all_questions)
                all_questions.extend(reading_questions)
                if reading_questions:  # Add delay if questions were generated
                    import time
                    time.sleep(2)  # 2 second delay between API calls
            
            # Then listening if we still need more
            if 'listening' in skills and len(all_questions) < batch_size:
                remaining = batch_size - len(all_questions)
                listening_questions = self._generate_small_listening_batch(listening_config, job_title, remaining, existing_questions + all_questions)
                all_questions.extend(listening_questions)
                if listening_questions:  # Add delay if questions were generated
                    import time
                    time.sleep(2)  # 2 second delay between API calls
            
            # Finally grammar if we still need more
            if 'grammar' in skills and len(all_questions) < batch_size:
                remaining = batch_size - len(all_questions)
                grammar_questions = self._generate_small_grammar_batch(grammar_config, job_title, remaining, existing_questions + all_questions)
                all_questions.extend(grammar_questions)
            
            # Calculate progress
            new_total = existing_count + len(all_questions)
            is_complete = new_total >= target_total
            remaining_after = max(0, target_total - new_total)
            
            # User guidance
            if is_complete:
                user_guidance = f"🎉 Communication assessment complete! Generated all {target_total} questions."
            else:
                user_guidance = f"Click 'Generate Remaining Questions' again to create {remaining_after} more questions and reach your target."
            
            logger.info(f"🎉 Successfully generated {len(all_questions)} new communication questions. Progress: {new_total}/{target_total}")
            
            return {
                'success': True,
                'questions': all_questions,
                'total_questions': len(all_questions),
                'progress': {
                    'current': new_total,
                    'target': target_total,
                    'remaining': remaining_after,
                    'is_complete': is_complete
                },
                'user_guidance': user_guidance,
                'estimated_time': sum(q.get('time_limit', 120) for q in all_questions),
                'skills_tested': skills,
                'metadata': {'generated_by': 'groq_incremental', 'type': 'communication_incremental'}
            }
            
        except Exception as e:
            logger.error(f"❌ Exception in generate_communication_questions_incremental: {str(e)}")
            return {'success': False, 'message': f'Error: {str(e)}'}

    def generate_structured_communication_assessment(self, reading_config: Dict, listening_config: Dict, 
                                                   grammar_config: Dict, skills: List[str], 
                                                   time_limit: int = 30, job_title: str = 'Software Developer') -> Dict[str, Any]:
        """Generate structured communication assessment with BATCH generation like aptitude"""
        if not self.api_keys:
            return self._get_fallback_structured_communication(reading_config, listening_config, grammar_config, skills)
        
        try:
            questions = []
            
            # BATCH GENERATION - Single API call per skill type
            
            # Generate Reading Questions in one batch
            if 'reading' in skills and reading_config:
                reading_questions = self._batch_generate_reading_questions(reading_config, job_title)
                questions.extend(reading_questions)
            
            # Generate Listening Questions in one batch
            if 'listening' in skills and listening_config:
                listening_questions = self._batch_generate_listening_questions(listening_config, job_title)
                questions.extend(listening_questions)
            
            # Generate Grammar Questions in one batch
            if 'grammar' in skills and grammar_config:
                grammar_questions = self._batch_generate_grammar_questions(grammar_config, job_title)
                questions.extend(grammar_questions)
            
            logger.info(f"✅ Generated {len(questions)} structured communication questions")
            return {
                'success': True,
                'questions': questions,
                'total_questions': len(questions),
                'estimated_time': sum(q.get('time_limit', 120) for q in questions),
                'skills_tested': skills,
                'metadata': {'generated_by': 'groq', 'type': 'structured_communication'}
            }
                
        except Exception as e:
            logger.error(f"❌ Error generating structured communication assessment: {str(e)}")
            return self._get_fallback_structured_communication(reading_config, listening_config, grammar_config, skills)

    def _generate_reading_questions(self, reading_config: Dict, job_title: str) -> List[Dict]:
        """Generate reading assessment questions using AI ONLY - no fallback templates"""
        
        if not self.api_keys:
            logger.error("❌ No GROQ API key - cannot generate AI reading questions")
            return [{
                'title': 'AI Generation Error',
                'content': 'AI service unavailable - no GROQ API key configured',
                'passage': 'ERROR: AI not able to generate content. Please configure GROQ API key.',
                'skill': 'reading',
                'type': 'error',
                'difficulty': 'error',
                'time_limit': 60,
                'error': True
            }]
        
        # Use ONLY AI generation - no templates
        return self._ai_generate_reading_questions(reading_config, job_title)

    def _ai_generate_reading_questions(self, reading_config: Dict, job_title: str) -> List[Dict]:
        """Generate reading questions using AI instead of templates"""
        questions = []
        import time
        
        for difficulty in ['easy', 'medium', 'hard']:
            count = reading_config.get(difficulty, 0)
            if count > 0:
                logger.info(f"🤖 Generating {count} {difficulty} reading passages using AI...")
                
                # Create AI prompt for reading passages
                prompt = f"""Generate {count} unique reading passages for a {job_title} communication assessment.

Difficulty: {difficulty}
Requirements:
- Each passage should be 3-4 sentences long
- Content should be relevant to {job_title} work
- Passages should test pronunciation, fluency, and clarity
- Make each passage completely unique and different
- Use professional, clear language appropriate for {difficulty} level

Difficulty Guidelines:
- Easy: Simple vocabulary, short sentences, basic concepts
- Medium: Moderate vocabulary, complex sentences, intermediate concepts  
- Hard: Advanced vocabulary, complex sentences, sophisticated concepts

Return ONLY a JSON array of passages like this:
[
  "First unique passage about {job_title} work...",
  "Second completely different passage...",
  "Third unique passage with different content..."
]"""

                try:
                    response = requests.post(
                        f"{self.api_base}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.get_current_api_key()}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": self.model,
                            "messages": [
                                {"role": "system", "content": "You are an expert assessment creator. Generate unique, professional reading passages. Return only valid JSON."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.8,  # Higher creativity for unique content
                            "max_tokens": 1000
                        },
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        content = result['choices'][0]['message']['content'].strip()
                        
                        # Parse the JSON array of passages
                        passages = json.loads(content)
                        
                        # Validate exact count - trim if too many, warn if too few
                        if len(passages) > count:
                            logger.warning(f"⚠️ AI generated {len(passages)} {difficulty} reading passages, expected {count}. Trimming to exact count.")
                            passages = passages[:count]
                        elif len(passages) < count:
                            logger.warning(f"⚠️ AI generated {len(passages)} {difficulty} reading passages, expected {count}. Using what was generated.")
                        
                        # Convert to question format
                        for i, passage in enumerate(passages):
                            time_limit = 120 if difficulty == 'easy' else 180 if difficulty == 'medium' else 240
                            
                            questions.append({
                                'title': f'Reading Assessment - {difficulty.title()} Level',
                                'content': 'Please read the following passage aloud clearly and naturally.',
                                'passage': passage,
                                'skill': 'reading',
                                'type': 'reading_aloud',
                                'difficulty': difficulty,
                                'time_limit': time_limit,
                                'evaluation_criteria': ['pronunciation', 'fluency', 'pace', 'clarity'],
                                'instructions': 'Read the paragraph aloud at a natural pace. Focus on clear pronunciation and proper intonation.'
                            })
                        
                        logger.info(f"✅ AI generated {len(passages)} unique {difficulty} reading passages (requested: {count})")
                        
                        # Add delay to avoid rate limits
                        time.sleep(0.5)
                    else:
                        logger.error(f"❌ AI generation failed for {difficulty} reading: {response.status_code}")
                        logger.info(f"⚠️ Skipping {count} {difficulty} reading questions - user can regenerate later")
                        
                except Exception as e:
                    logger.error(f"❌ Error in AI reading generation: {str(e)}")
                    logger.info(f"⚠️ Skipping {count} {difficulty} reading questions - user can regenerate later")
        
        return questions

    def _batch_generate_reading_questions(self, reading_config: Dict, job_title: str) -> List[Dict]:
        """Generate ALL reading questions in a single API call like aptitude"""
        if not self.api_keys:
            logger.error("❌ No GROQ API key - cannot generate reading questions")
            return []
        
        # Calculate total questions needed
        total_questions = reading_config.get('easy', 0) + reading_config.get('medium', 0) + reading_config.get('hard', 0)
        if total_questions == 0:
            return []
        
        logger.info(f"🤖 Batch generating {total_questions} reading passages using AI...")
        
        # Create batch prompt for all reading questions
        prompt = f"""Generate exactly {total_questions} unique reading passages for a {job_title} communication assessment.

BREAKDOWN REQUIRED:
- {reading_config.get('easy', 0)} EASY passages (simple vocabulary, 3-4 sentences, basic concepts)
- {reading_config.get('medium', 0)} MEDIUM passages (moderate vocabulary, 4-5 sentences, intermediate concepts)  
- {reading_config.get('hard', 0)} HARD passages (advanced vocabulary, 5-6 sentences, sophisticated concepts)

Requirements:
- Each passage should be completely unique and different
- Content should be relevant to {job_title} work
- Passages should test pronunciation, fluency, and clarity
- Use professional, clear language
- Make each passage engaging and realistic

Return ONLY a JSON array with this exact structure:
[
  {{"difficulty": "easy", "passage": "First easy passage about software development..."}},
  {{"difficulty": "easy", "passage": "Second easy passage with different content..."}},
  {{"difficulty": "medium", "passage": "First medium passage with moderate complexity..."}},
  {{"difficulty": "hard", "passage": "First hard passage with advanced concepts..."}}
]

Generate exactly {total_questions} passages total."""

        try:
            response = requests.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.get_current_api_key()}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are an expert assessment creator. Generate unique, professional reading passages in valid JSON format only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.8,
                    "max_tokens": 2000
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content'].strip()
                
                # Parse the JSON array of passages
                passages_data = json.loads(content)
                
                questions = []
                for passage_data in passages_data:
                    difficulty = passage_data['difficulty']
                    passage = passage_data['passage']
                    time_limit = 120 if difficulty == 'easy' else 180 if difficulty == 'medium' else 240
                    
                    questions.append({
                        'title': f'Reading Assessment - {difficulty.title()} Level',
                        'content': 'Please read the following passage aloud clearly and naturally.',
                        'passage': passage,
                        'skill': 'reading',
                        'type': 'reading_aloud',
                        'difficulty': difficulty,
                        'time_limit': time_limit,
                        'evaluation_criteria': ['pronunciation', 'fluency', 'pace', 'clarity'],
                        'instructions': 'Read the paragraph aloud at a natural pace. Focus on clear pronunciation and proper intonation.'
                    })
                
                logger.info(f"✅ Batch generated {len(questions)} reading passages (requested: {total_questions})")
                return questions
            else:
                logger.error(f"❌ Batch reading generation failed: {response.status_code}")
                # Fall back to template generation
                return self._generate_reading_from_templates(reading_config, job_title)
                
        except Exception as e:
            logger.error(f"❌ Batch reading generation failed: {str(e)}")
            # Fall back to template generation
            return self._generate_reading_from_templates(reading_config, job_title)

    def _generate_reading_from_templates(self, reading_config: Dict, job_title: str) -> List[Dict]:
        """Generate reading questions using templates when AI fails"""
        logger.info(f"📝 Using template fallback for reading questions...")
        
        easy_count = reading_config.get('easy', 0)
        medium_count = reading_config.get('medium', 0)
        hard_count = reading_config.get('hard', 0)
        
        reading_templates = {
            'easy': [
                f"Software development is a collaborative process that requires clear communication between team members. In {job_title} roles, professionals must effectively convey technical concepts to both technical and non-technical stakeholders.",
                f"Modern {job_title} work involves continuous learning and adaptation to new technologies. Professionals in this field must stay updated with industry trends and programming languages.",
                f"Quality assurance and testing are integral parts of the {job_title} workflow. Developers must communicate effectively with QA teams and document bug reports clearly."
            ],
            'medium': [
                f"Project management in {job_title} roles requires excellent communication skills to coordinate with cross-functional teams. Developers must participate in daily standups, sprint planning meetings, and retrospectives. They need to clearly communicate progress, blockers, and technical challenges to ensure project success.",
                f"Code review processes in {job_title} positions demand constructive communication and feedback skills. Developers must provide clear, actionable comments on code quality, suggest improvements, and explain best practices to colleagues. This collaborative approach helps maintain code standards."
            ],
            'hard': [
                f"Performance optimization requires {job_title} professionals to analyze system bottlenecks and communicate findings effectively. They must present technical solutions to both technical and business stakeholders, explaining the impact of optimizations on user experience and system reliability while considering trade-offs between performance, maintainability, and development time."
            ]
        }
        
        questions = []
        
        # Generate easy questions
        for i in range(easy_count):
            template_index = i % len(reading_templates['easy'])
            questions.append({
                'title': f'Reading Assessment - Easy Level {i+1}',
                'content': 'Please read the following passage aloud clearly and naturally.',
                'passage': reading_templates['easy'][template_index],
                'skill': 'reading',
                'type': 'reading_aloud',
                'difficulty': 'easy',
                'time_limit': 120,
                'evaluation_criteria': ['pronunciation', 'fluency', 'pace', 'clarity'],
                'instructions': 'Read the paragraph aloud at a natural pace.'
            })
        
        # Generate medium questions
        for i in range(medium_count):
            template_index = i % len(reading_templates['medium'])
            questions.append({
                'title': f'Reading Assessment - Medium Level {i+1}',
                'content': 'Please read the following passage aloud clearly and naturally.',
                'passage': reading_templates['medium'][template_index],
                'skill': 'reading',
                'type': 'reading_aloud',
                'difficulty': 'medium',
                'time_limit': 180,
                'evaluation_criteria': ['pronunciation', 'fluency', 'pace', 'clarity'],
                'instructions': 'Read the paragraph aloud at a natural pace.'
            })
        
        # Generate hard questions
        for i in range(hard_count):
            template_index = i % len(reading_templates['hard'])
            questions.append({
                'title': f'Reading Assessment - Hard Level {i+1}',
                'content': 'Please read the following passage aloud clearly and naturally.',
                'passage': reading_templates['hard'][template_index],
                'skill': 'reading',
                'type': 'reading_aloud',
                'difficulty': 'hard',
                'time_limit': 240,
                'evaluation_criteria': ['pronunciation', 'fluency', 'pace', 'clarity'],
                'instructions': 'Read the paragraph aloud at a natural pace.'
            })
        
        logger.info(f"✅ Generated {len(questions)} reading questions using templates")
        return questions
        return self._ai_generate_listening_questions(listening_config, job_title)

    def _ai_generate_listening_questions(self, listening_config: Dict, job_title: str) -> List[Dict]:
        """Generate listening questions using AI instead of templates"""
        questions = []
        import time
        
        # Generate sentence repetition questions
        sentences_config = listening_config.get('sentences', {})
        for difficulty in ['easy', 'medium', 'hard']:
            count = sentences_config.get(difficulty, 0)
            if count > 0:
                logger.info(f"🤖 Generating {count} {difficulty} listening sentences using AI...")
                
                # Create AI prompt for listening sentences
                prompt = f"""Generate {count} unique sentences for a {job_title} listening assessment.

Difficulty: {difficulty}
Requirements:
- Each sentence should be clear and professional
- Content should be relevant to {job_title} work
- Sentences should test listening comprehension and repetition accuracy
- Make each sentence completely unique and different
- Use appropriate vocabulary for {difficulty} level

Difficulty Guidelines:
- Easy: Simple vocabulary, short sentences (8-12 words), basic concepts
- Medium: Moderate vocabulary, medium sentences (12-16 words), intermediate concepts  
- Hard: Advanced vocabulary, complex sentences (16-20 words), sophisticated concepts

Return ONLY a JSON array of sentences like this:
[
  "First unique sentence about {job_title} work.",
  "Second completely different sentence.",
  "Third unique sentence with different content."
]"""

                try:
                    response = requests.post(
                        f"{self.api_base}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.get_current_api_key()}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": self.model,
                            "messages": [
                                {"role": "system", "content": "You are an expert assessment creator. Generate unique, professional listening sentences. Return only valid JSON."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.8,  # Higher creativity for unique content
                            "max_tokens": 500
                        },
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        content = result['choices'][0]['message']['content'].strip()
                        
                        # Parse the JSON array of sentences
                        sentences = json.loads(content)
                        
                        # Validate exact count - trim if too many, warn if too few
                        if len(sentences) > count:
                            logger.warning(f"⚠️ AI generated {len(sentences)} {difficulty} listening sentences, expected {count}. Trimming to exact count.")
                            sentences = sentences[:count]
                        elif len(sentences) < count:
                            logger.warning(f"⚠️ AI generated {len(sentences)} {difficulty} listening sentences, expected {count}. Using what was generated.")
                        
                        # Convert to question format
                        for i, sentence in enumerate(sentences):
                            time_limit = 60 if difficulty == 'easy' else 90 if difficulty == 'medium' else 120
                            
                            questions.append({
                                'title': f'Sentence Repetition - {difficulty.title()} Level',
                                'content': 'Listen to the sentence and repeat it exactly as you heard it.',
                                'audio_text': sentence,
                                'skill': 'listening',
                                'subtype': 'sentence',
                                'type': 'listening',
                                'difficulty': difficulty,
                                'time_limit': time_limit,
                                'evaluation_criteria': ['accuracy', 'pronunciation', 'fluency'],
                                'instructions': 'Listen carefully to the sentence, then repeat it exactly as you heard it.'
                            })
                        
                        logger.info(f"✅ AI generated {len(sentences)} unique {difficulty} listening sentences (requested: {count})")
                        
                        # Add delay to avoid rate limits
                        time.sleep(0.5)
                    else:
                        logger.error(f"❌ AI generation failed for {difficulty} listening: {response.status_code}")
                        logger.info(f"⚠️ Skipping {count} {difficulty} listening questions - user can regenerate later")
                        
                except Exception as e:
                    logger.error(f"❌ Error in AI listening generation: {str(e)}")
                    logger.info(f"⚠️ Skipping {count} {difficulty} listening questions - user can regenerate later")
        
        return questions

    def _batch_generate_listening_questions(self, listening_config: Dict, job_title: str) -> List[Dict]:
        """Generate ALL listening questions in a single API call like aptitude"""
        if not self.api_keys:
            logger.error("❌ No GROQ API key - cannot generate listening questions")
            return []
        
        # Calculate total questions needed
        sentences_config = listening_config.get('sentences', {})
        total_questions = sentences_config.get('easy', 0) + sentences_config.get('medium', 0) + sentences_config.get('hard', 0)
        if total_questions == 0:
            return []
        
        logger.info(f"🤖 Batch generating {total_questions} listening sentences using AI...")
        
        # Create batch prompt for all listening questions
        prompt = f"""Generate exactly {total_questions} unique sentences for a {job_title} listening assessment.

BREAKDOWN REQUIRED:
- {sentences_config.get('easy', 0)} EASY sentences (8-12 words, simple vocabulary, basic concepts)
- {sentences_config.get('medium', 0)} MEDIUM sentences (12-16 words, moderate vocabulary, intermediate concepts)
- {sentences_config.get('hard', 0)} HARD sentences (16-20 words, advanced vocabulary, sophisticated concepts)

Requirements:
- Each sentence should be completely unique and different
- Content should be relevant to {job_title} work
- Sentences should test listening comprehension and repetition accuracy
- Use professional, clear language
- Make each sentence realistic and engaging

Return ONLY a JSON array with this exact structure:
[
  {{"difficulty": "easy", "sentence": "First easy sentence about software development."}},
  {{"difficulty": "easy", "sentence": "Second easy sentence with different content."}},
  {{"difficulty": "medium", "sentence": "First medium sentence with moderate complexity and length."}},
  {{"difficulty": "hard", "sentence": "First hard sentence with advanced concepts and sophisticated vocabulary structure."}}
]

Generate exactly {total_questions} sentences total."""

        try:
            response = requests.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.get_current_api_key()}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are an expert assessment creator. Generate unique, professional listening sentences in valid JSON format only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.8,
                    "max_tokens": 1500
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content'].strip()
                
                # Parse the JSON array of sentences
                sentences_data = json.loads(content)
                
                questions = []
                for sentence_data in sentences_data:
                    difficulty = sentence_data['difficulty']
                    sentence = sentence_data['sentence']
                    time_limit = 60 if difficulty == 'easy' else 90 if difficulty == 'medium' else 120
                    
                    questions.append({
                        'title': f'Sentence Repetition - {difficulty.title()} Level',
                        'content': 'Listen to the sentence and repeat it exactly as you heard it.',
                        'audio_text': sentence,
                        'skill': 'listening',
                        'subtype': 'sentence',
                        'type': 'listening',
                        'difficulty': difficulty,
                        'time_limit': time_limit,
                        'evaluation_criteria': ['accuracy', 'pronunciation', 'fluency'],
                        'instructions': 'Listen carefully to the sentence, then repeat it exactly as you heard it.'
                    })
                
                logger.info(f"✅ Batch generated {len(questions)} listening sentences (requested: {total_questions})")
                return questions
            else:
                logger.error(f"❌ Batch listening generation failed: {response.status_code}")
                # Fall back to template generation
                return self._generate_listening_from_templates(listening_config, job_title)
                
        except Exception as e:
            logger.error(f"❌ Batch listening generation failed: {str(e)}")
            # Fall back to template generation
            return self._generate_listening_from_templates(listening_config, job_title)

    def _generate_listening_from_templates(self, listening_config: Dict, job_title: str) -> List[Dict]:
        """Generate listening questions using templates when AI fails"""
        logger.info(f"📝 Using template fallback for listening questions...")
        
        sentences_config = listening_config.get('sentences', {})
        easy_count = sentences_config.get('easy', 0)
        medium_count = sentences_config.get('medium', 0)
        hard_count = sentences_config.get('hard', 0)
        
        listening_templates = {
            'easy': [
                f"Effective {job_title} professionals collaborate with teams.",
                f"Modern {job_title} roles require continuous learning.",
                f"Code reviews help maintain quality standards."
            ],
            'medium': [
                f"Agile methodologies enable {job_title} teams to respond quickly to changing requirements.",
                f"Technical documentation is essential for {job_title} professionals to communicate concepts clearly.",
                f"Version control systems help {job_title} teams track changes and collaborate efficiently."
            ],
            'hard': [
                f"Performance optimization is a critical skill for {job_title} professionals working on large-scale applications with complex architectural requirements."
            ]
        }
        
        questions = []
        
        # Generate easy questions
        for i in range(easy_count):
            template_index = i % len(listening_templates['easy'])
            questions.append({
                'title': f'Sentence Repetition - Easy Level {i+1}',
                'content': 'Listen to the sentence and repeat it exactly as you heard it.',
                'audio_text': listening_templates['easy'][template_index],
                'skill': 'listening',
                'subtype': 'sentence',
                'type': 'listening',
                'difficulty': 'easy',
                'time_limit': 60,
                'evaluation_criteria': ['accuracy', 'pronunciation', 'fluency'],
                'instructions': 'Listen carefully, then repeat exactly as you heard it.'
            })
        
        # Generate medium questions
        for i in range(medium_count):
            template_index = i % len(listening_templates['medium'])
            questions.append({
                'title': f'Sentence Repetition - Medium Level {i+1}',
                'content': 'Listen to the sentence and repeat it exactly as you heard it.',
                'audio_text': listening_templates['medium'][template_index],
                'skill': 'listening',
                'subtype': 'sentence',
                'type': 'listening',
                'difficulty': 'medium',
                'time_limit': 90,
                'evaluation_criteria': ['accuracy', 'pronunciation', 'fluency'],
                'instructions': 'Listen carefully, then repeat exactly as you heard it.'
            })
        
        # Generate hard questions
        for i in range(hard_count):
            template_index = i % len(listening_templates['hard'])
            questions.append({
                'title': f'Sentence Repetition - Hard Level {i+1}',
                'content': 'Listen to the sentence and repeat it exactly as you heard it.',
                'audio_text': listening_templates['hard'][template_index],
                'skill': 'listening',
                'subtype': 'sentence',
                'type': 'listening',
                'difficulty': 'hard',
                'time_limit': 120,
                'evaluation_criteria': ['accuracy', 'pronunciation', 'fluency'],
                'instructions': 'Listen carefully, then repeat exactly as you heard it.'
            })
        
        logger.info(f"✅ Generated {len(questions)} listening questions using templates")
        return questions

    def _generate_grammar_questions(self, grammar_config: Dict, job_title: str) -> List[Dict]:
        """Generate grammar assessment questions using AI ONLY - no fallback templates"""
        
        topics = grammar_config.get('topics', [])
        topic_questions = grammar_config.get('topicQuestions', {})
        
        logger.info(f"🔍 Grammar config received: {grammar_config}")
        logger.info(f"📝 Topics: {topics}")
        logger.info(f"📊 Topic questions: {topic_questions}")
        
        if not self.api_keys:
            logger.error("❌ No GROQ API key - cannot generate AI grammar questions")
            return [{
                'title': 'AI Generation Error',
                'content': 'AI service unavailable - no GROQ API key configured',
                'options': {'A': 'ERROR', 'B': 'AI not', 'C': 'able to', 'D': 'generate content'},
                'correct_answer': 'A',
                'skill': 'grammar',
                'type': 'error',
                'difficulty': 'error',
                'time_limit': 60,
                'error': True
            }]
        
        if not topics:
            logger.error("❌ No grammar topics specified - cannot generate questions")
            return [{
                'title': 'Configuration Error',
                'content': 'No grammar topics specified for assessment',
                'options': {'A': 'ERROR', 'B': 'No topics', 'C': 'specified', 'D': 'for assessment'},
                'correct_answer': 'A',
                'skill': 'grammar',
                'type': 'error',
                'difficulty': 'error',
                'time_limit': 60,
                'error': True
            }]
        
        # Use ONLY AI generation - no templates
        return self._ai_generate_grammar_questions(topics, topic_questions, job_title)

    def _ai_generate_grammar_questions(self, topics: List[str], topic_questions: Dict, job_title: str) -> List[Dict]:
        """Generate grammar questions using AI instead of templates"""
        questions = []
        import time
        
        for topic in topics:
            topic_config = topic_questions.get(topic, {})
            
            for difficulty in ['easy', 'medium', 'hard']:
                count = topic_config.get(difficulty, 0)
                if count > 0:
                    logger.info(f"🤖 Generating {count} {difficulty} {topic} grammar questions using AI...")
                    
                    # Create AI prompt for grammar questions
                    prompt = f"""Generate {count} unique multiple choice grammar questions about {topic} for a {job_title} assessment.

Topic: {topic}
Difficulty: {difficulty}
Requirements:
- Each question should test {topic} knowledge
- Questions should be relevant to {job_title} work context
- Provide 4 options (A, B, C, D) for each question
- Make each question completely unique and different
- Use professional language appropriate for {difficulty} level

Difficulty Guidelines:
- Easy: Basic {topic} rules, simple examples
- Medium: Intermediate {topic} usage, moderate complexity
- Hard: Advanced {topic} concepts, complex scenarios

Return ONLY a JSON array of questions like this:
[
  {{
    "question": "Choose the correct {topic}: 'The developer ____ working on the project.'",
    "options": {{"A": "is", "B": "are", "C": "was", "D": "were"}},
    "correct_answer": "A",
    "explanation": "Brief explanation of why A is correct"
  }}
]"""

                    try:
                        response = requests.post(
                            f"{self.api_base}/chat/completions",
                            headers={
                                "Authorization": f"Bearer {self.get_current_api_key()}",
                                "Content-Type": "application/json"
                            },
                            json={
                                "model": self.model,
                                "messages": [
                                    {"role": "system", "content": "You are an expert grammar assessment creator. Generate unique, professional grammar questions. Return only valid JSON."},
                                    {"role": "user", "content": prompt}
                                ],
                                "temperature": 0.7,  # Balanced creativity for grammar
                                "max_tokens": 1000
                            },
                            timeout=30
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            content = result['choices'][0]['message']['content'].strip()
                            
                            # Parse the JSON array of questions
                            ai_questions = json.loads(content)
                            
                            # Validate exact count - trim if too many, warn if too few
                            if len(ai_questions) > count:
                                logger.warning(f"⚠️ AI generated {len(ai_questions)} {difficulty} {topic} questions, expected {count}. Trimming to exact count.")
                                ai_questions = ai_questions[:count]
                            elif len(ai_questions) < count:
                                logger.warning(f"⚠️ AI generated {len(ai_questions)} {difficulty} {topic} questions, expected {count}. Using what was generated.")
                            
                            # Convert to question format
                            for i, q in enumerate(ai_questions):
                                time_limit = 90
                                
                                questions.append({
                                    'title': f'Grammar: {topic.title()} - {difficulty.title()}',
                                    'content': q['question'],
                                    'options': q['options'],
                                    'correct_answer': q['correct_answer'],
                                    'explanation': q.get('explanation', ''),
                                    'skill': 'grammar',
                                    'type': 'grammar',
                                    'topic': topic,
                                    'difficulty': difficulty,
                                    'time_limit': time_limit,
                                    'evaluation_criteria': ['grammatical_accuracy', 'language_knowledge'],
                                    'instructions': 'Select the most grammatically correct option.'
                                })
                            
                            logger.info(f"✅ AI generated {len(ai_questions)} unique {difficulty} {topic} questions (requested: {count})")
                            
                            # Add delay to avoid rate limits
                            time.sleep(0.5)
                        else:
                            logger.error(f"❌ AI generation failed for {difficulty} {topic}: {response.status_code}")
                            logger.info(f"⚠️ Skipping {count} {difficulty} {topic} questions - user can regenerate later")
                            
                    except Exception as e:
                        logger.error(f"❌ Error in AI grammar generation: {str(e)}")
                        logger.info(f"⚠️ Skipping {count} {difficulty} {topic} questions - user can regenerate later")
        
        return questions

    def _batch_generate_grammar_questions(self, grammar_config: Dict, job_title: str) -> List[Dict]:
        """Generate ALL grammar questions in a single API call like aptitude"""
        if not self.api_keys:
            logger.error("❌ No GROQ API key - cannot generate grammar questions")
            return []
        
        topics = grammar_config.get('topics', [])
        topic_questions = grammar_config.get('topicQuestions', {})
        
        if not topics:
            logger.error("❌ No grammar topics specified")
            return []
        
        # Calculate total questions needed
        total_questions = 0
        topic_breakdown = []
        for topic in topics:
            topic_config = topic_questions.get(topic, {})
            easy_count = topic_config.get('easy', 0)
            medium_count = topic_config.get('medium', 0)
            hard_count = topic_config.get('hard', 0)
            topic_total = easy_count + medium_count + hard_count
            
            if topic_total > 0:
                total_questions += topic_total
                topic_breakdown.append(f"- {topic.upper()}: {easy_count} easy, {medium_count} medium, {hard_count} hard (Total: {topic_total})")
        
        if total_questions == 0:
            return []
        
        logger.info(f"🤖 Batch generating {total_questions} grammar questions using AI...")
        
        # Create batch prompt for all grammar questions
        prompt = f"""Generate exactly {total_questions} unique multiple choice grammar questions for a {job_title} assessment.

BREAKDOWN REQUIRED:
{chr(10).join(topic_breakdown)}

Requirements:
- Each question should test the specified grammar topic
- Questions should be relevant to {job_title} work context
- Provide 4 options (A, B, C, D) for each question
- Make each question completely unique and different
- Use professional language appropriate for difficulty level

Difficulty Guidelines:
- Easy: Basic grammar rules, simple examples
- Medium: Intermediate grammar usage, moderate complexity
- Hard: Advanced grammar concepts, complex scenarios

Return ONLY a JSON array with this exact structure:
[
  {{
    "topic": "tenses",
    "difficulty": "easy", 
    "question": "Which sentence uses the correct present perfect tense?",
    "options": {{
      "A": "I have completed the project yesterday.",
      "B": "I completed the project yesterday.", 
      "C": "I have completed the project.",
      "D": "I am completing the project yesterday."
    }},
    "correct_answer": "C",
    "explanation": "Present perfect tense is used for actions completed at an unspecified time."
  }}
]

Generate exactly {total_questions} questions total covering all specified topics and difficulties."""

        try:
            response = requests.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.get_current_api_key()}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are an expert grammar assessment creator. Generate unique, professional grammar questions in valid JSON format only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 3000
                },
                timeout=45
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content'].strip()
                
                # Parse the JSON array of questions
                questions_data = json.loads(content)
                
                questions = []
                for q_data in questions_data:
                    topic = q_data['topic']
                    difficulty = q_data['difficulty']
                    time_limit = 60 if difficulty == 'easy' else 90 if difficulty == 'medium' else 120
                    
                    questions.append({
                        'title': f'Grammar Assessment - {difficulty.title()} {topic.title()}',
                        'content': q_data['question'],
                        'options': q_data['options'],
                        'correct_answer': q_data['correct_answer'],
                        'explanation': q_data.get('explanation', ''),
                        'skill': 'grammar',
                        'type': 'grammar',
                        'topic': topic,
                        'difficulty': difficulty,
                        'time_limit': time_limit,
                        'evaluation_criteria': ['grammatical_accuracy', 'language_knowledge'],
                        'instructions': 'Select the most grammatically correct option.'
                    })
                
                logger.info(f"✅ Batch generated {len(questions)} grammar questions (requested: {total_questions})")
                return questions
            else:
                logger.error(f"❌ Batch grammar generation failed: {response.status_code}")
                # Fall back to template generation
                return self._generate_grammar_from_templates(grammar_config, job_title)
                
        except Exception as e:
            logger.error(f"❌ Batch grammar generation failed: {str(e)}")
            # Fall back to template generation
            return self._generate_grammar_from_templates(grammar_config, job_title)

    def _generate_grammar_from_templates(self, grammar_config: Dict, job_title: str) -> List[Dict]:
        """Generate grammar questions using templates when AI fails"""
        logger.info(f"📝 Using template fallback for grammar questions...")
        
        topics = grammar_config.get('topics', [])
        topic_questions = grammar_config.get('topicQuestions', {})
        
        grammar_templates = {
            'tenses': {
                'easy': [
                    {"question": "Which sentence uses the correct present tense?", "options": {"A": "I work as a developer.", "B": "I working as a developer.", "C": "I am work as a developer.", "D": "I works as a developer."}, "correct_answer": "A"},
                    {"question": "Select the correct present tense form:", "options": {"A": "She codes every day.", "B": "She coding every day.", "C": "She is code every day.", "D": "She code every day."}, "correct_answer": "A"},
                    {"question": "Which sentence is in the correct present tense?", "options": {"A": "They tests the software.", "B": "They test the software.", "C": "They testing the software.", "D": "They are test the software."}, "correct_answer": "B"},
                    {"question": "Choose the correct present tense:", "options": {"A": "He debug the code.", "B": "He debugs the code.", "C": "He debugging the code.", "D": "He is debug the code."}, "correct_answer": "B"},
                    {"question": "Which is the correct present tense?", "options": {"A": "We writes clean code.", "B": "We writing clean code.", "C": "We write clean code.", "D": "We are write clean code."}, "correct_answer": "C"},
                    {"question": "Select the proper present tense:", "options": {"A": "The team meets every Monday.", "B": "The team meeting every Monday.", "C": "The team meet every Monday.", "D": "The team is meet every Monday."}, "correct_answer": "A"},
                    {"question": "Which sentence shows correct present tense?", "options": {"A": "She tests the application.", "B": "She testing the application.", "C": "She test the application.", "D": "She is test the application."}, "correct_answer": "A"},
                    {"question": "Choose the right present tense form:", "options": {"A": "It works perfectly.", "B": "It working perfectly.", "C": "It work perfectly.", "D": "It is work perfectly."}, "correct_answer": "A"},
                    {"question": "Which uses correct present tense?", "options": {"A": "They develops software.", "B": "They developing software.", "C": "They develop software.", "D": "They are develop software."}, "correct_answer": "C"},
                    {"question": "Select correct present tense:", "options": {"A": "The code runs smoothly.", "B": "The code running smoothly.", "C": "The code run smoothly.", "D": "The code is run smoothly."}, "correct_answer": "A"},
                    {"question": "Which is in present tense?", "options": {"A": "I creates websites.", "B": "I creating websites.", "C": "I create websites.", "D": "I am create websites."}, "correct_answer": "C"},
                    {"question": "Choose present tense form:", "options": {"A": "She learns new technologies.", "B": "She learning new technologies.", "C": "She learn new technologies.", "D": "She is learn new technologies."}, "correct_answer": "A"},
                    {"question": "Which shows present tense?", "options": {"A": "We uses Git for version control.", "B": "We using Git for version control.", "C": "We use Git for version control.", "D": "We are use Git for version control."}, "correct_answer": "C"},
                    {"question": "Select the present tense:", "options": {"A": "The system processes data.", "B": "The system processing data.", "C": "The system process data.", "D": "The system is process data."}, "correct_answer": "A"},
                    {"question": "Which is correct present tense?", "options": {"A": "He fixes bugs quickly.", "B": "He fixing bugs quickly.", "C": "He fix bugs quickly.", "D": "He is fix bugs quickly."}, "correct_answer": "A"}
                ],
                'medium': [
                    {"question": "Which sentence uses the correct present perfect tense?", "options": {"A": "I have completed the project yesterday.", "B": "I completed the project yesterday.", "C": "I have completed the project.", "D": "I am completing the project yesterday."}, "correct_answer": "C"},
                    {"question": "Select the correct present continuous tense:", "options": {"A": "We working on the new feature.", "B": "We are working on the new feature.", "C": "We have working on the new feature.", "D": "We work on the new feature now."}, "correct_answer": "B"},
                    {"question": "Choose the right present perfect:", "options": {"A": "She has written the documentation.", "B": "She has wrote the documentation.", "C": "She have written the documentation.", "D": "She is written the documentation."}, "correct_answer": "A"},
                    {"question": "Which uses present continuous correctly?", "options": {"A": "They developing the app.", "B": "They are developing the app.", "C": "They have developing the app.", "D": "They develops the app."}, "correct_answer": "B"},
                    {"question": "Select correct present perfect:", "options": {"A": "We have finish the sprint.", "B": "We have finished the sprint.", "C": "We has finished the sprint.", "D": "We are finished the sprint."}, "correct_answer": "B"},
                    {"question": "Which shows present continuous?", "options": {"A": "He debugging the issue.", "B": "He is debugging the issue.", "C": "He have debugging the issue.", "D": "He debugs the issue."}, "correct_answer": "B"},
                    {"question": "Choose present perfect form:", "options": {"A": "The team has deployed the code.", "B": "The team have deployed the code.", "C": "The team has deploy the code.", "D": "The team is deployed the code."}, "correct_answer": "A"},
                    {"question": "Which is present continuous?", "options": {"A": "I testing the feature.", "B": "I am testing the feature.", "C": "I have testing the feature.", "D": "I tests the feature."}, "correct_answer": "B"},
                    {"question": "Select present perfect tense:", "options": {"A": "She has learn React.", "B": "She has learned React.", "C": "She have learned React.", "D": "She is learned React."}, "correct_answer": "B"},
                    {"question": "Which uses present continuous?", "options": {"A": "We reviewing the code.", "B": "We are reviewing the code.", "C": "We have reviewing the code.", "D": "We reviews the code."}, "correct_answer": "B"},
                    {"question": "Choose correct present perfect:", "options": {"A": "They has completed the task.", "B": "They have completed the task.", "C": "They have complete the task.", "D": "They are completed the task."}, "correct_answer": "B"},
                    {"question": "Which is present continuous tense?", "options": {"A": "The server running smoothly.", "B": "The server is running smoothly.", "C": "The server have running smoothly.", "D": "The server runs smoothly."}, "correct_answer": "B"},
                    {"question": "Select present perfect form:", "options": {"A": "I has fixed the bug.", "B": "I have fixed the bug.", "C": "I have fix the bug.", "D": "I am fixed the bug."}, "correct_answer": "B"},
                    {"question": "Which shows present continuous?", "options": {"A": "She implementing the feature.", "B": "She is implementing the feature.", "C": "She have implementing the feature.", "D": "She implements the feature."}, "correct_answer": "B"},
                    {"question": "Choose present perfect tense:", "options": {"A": "We has updated the database.", "B": "We have updated the database.", "C": "We have update the database.", "D": "We are updated the database."}, "correct_answer": "B"}
                ],
                'hard': [
                    {"question": "Which sentence uses the past perfect tense correctly?", "options": {"A": "I had finished the code before the meeting started.", "B": "I have finished the code before the meeting started.", "C": "I finished the code before the meeting started.", "D": "I was finishing the code before the meeting started."}, "correct_answer": "A"},
                    {"question": "Select the correct past perfect continuous:", "options": {"A": "She had been working on the project for months.", "B": "She has been working on the project for months.", "C": "She was working on the project for months.", "D": "She is working on the project for months."}, "correct_answer": "A"},
                    {"question": "Which uses future perfect correctly?", "options": {"A": "By next week, we will finished the development.", "B": "By next week, we will have finished the development.", "C": "By next week, we will finish the development.", "D": "By next week, we are finishing the development."}, "correct_answer": "B"},
                    {"question": "Choose the right past perfect:", "options": {"A": "They had deploy the application before the deadline.", "B": "They had deployed the application before the deadline.", "C": "They have deployed the application before the deadline.", "D": "They were deploying the application before the deadline."}, "correct_answer": "B"},
                    {"question": "Which shows future perfect tense?", "options": {"A": "I will complete the task by tomorrow.", "B": "I will have complete the task by tomorrow.", "C": "I will have completed the task by tomorrow.", "D": "I am completing the task by tomorrow."}, "correct_answer": "C"},
                    {"question": "Select past perfect continuous:", "options": {"A": "He had been debugging for hours.", "B": "He has been debugging for hours.", "C": "He was debugging for hours.", "D": "He is debugging for hours."}, "correct_answer": "A"},
                    {"question": "Which uses conditional perfect?", "options": {"A": "If I had known, I would fix the bug.", "B": "If I had known, I would have fixed the bug.", "C": "If I know, I would have fixed the bug.", "D": "If I knew, I will fix the bug."}, "correct_answer": "B"},
                    {"question": "Choose future perfect form:", "options": {"A": "She will has learned Python by December.", "B": "She will have learn Python by December.", "C": "She will have learned Python by December.", "D": "She will learning Python by December."}, "correct_answer": "C"},
                    {"question": "Which is past perfect tense?", "options": {"A": "The team had tested the application thoroughly.", "B": "The team has tested the application thoroughly.", "C": "The team tested the application thoroughly.", "D": "The team was testing the application thoroughly."}, "correct_answer": "A"},
                    {"question": "Select correct conditional perfect:", "options": {"A": "We would completed the project if we had more time.", "B": "We would have completed the project if we had more time.", "C": "We would complete the project if we had more time.", "D": "We will complete the project if we have more time."}, "correct_answer": "B"},
                    {"question": "Which shows past perfect continuous?", "options": {"A": "I had been coding all night.", "B": "I have been coding all night.", "C": "I was coding all night.", "D": "I am coding all night."}, "correct_answer": "A"},
                    {"question": "Choose future perfect tense:", "options": {"A": "By 2025, AI will revolutionize software development.", "B": "By 2025, AI will have revolutionize software development.", "C": "By 2025, AI will have revolutionized software development.", "D": "By 2025, AI is revolutionizing software development."}, "correct_answer": "C"},
                    {"question": "Which uses past perfect correctly?", "options": {"A": "She had wrote the code before the review.", "B": "She had written the code before the review.", "C": "She has written the code before the review.", "D": "She wrote the code before the review."}, "correct_answer": "B"},
                    {"question": "Select past perfect continuous form:", "options": {"A": "They had been working remotely since March.", "B": "They have been working remotely since March.", "C": "They were working remotely since March.", "D": "They are working remotely since March."}, "correct_answer": "A"},
                    {"question": "Which is future perfect tense?", "options": {"A": "The system will process all data by midnight.", "B": "The system will have process all data by midnight.", "C": "The system will have processed all data by midnight.", "D": "The system is processing all data by midnight."}, "correct_answer": "C"}
                ]
            },
            'articles': {
                'easy': [
                    {"question": "Choose the correct article: 'She is ___ developer.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article needed"}, "correct_answer": "A"},
                    {"question": "Select the right article: 'He works as ___ engineer.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "B"},
                    {"question": "Which article fits: 'I need ___ computer for work.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "A"},
                    {"question": "Choose the article: 'We hired ___ new programmer.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "A"},
                    {"question": "Select correct article: 'She bought ___ iPhone.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "B"},
                    {"question": "Which article: 'He is ___ software architect.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "A"},
                    {"question": "Choose article: 'I work at ___ startup company.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "A"},
                    {"question": "Select article: 'She uses ___ Android phone.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "B"},
                    {"question": "Which fits: 'We need ___ database administrator.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "A"},
                    {"question": "Choose: 'He is ___ UI/UX designer.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "A"},
                    {"question": "Select: 'I bought ___ laptop yesterday.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "A"},
                    {"question": "Which: 'She is ___ excellent coder.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "B"},
                    {"question": "Choose: 'We use ___ agile methodology.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "B"},
                    {"question": "Select: 'He drives ___ electric car.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "B"},
                    {"question": "Which: 'I am ___ full-stack developer.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "A"}
                ],
                'medium': [
                    {"question": "Select the correct article usage: 'We need ___ experienced programmer.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "B"},
                    {"question": "Choose the appropriate article: 'This is ___ best solution.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "C"},
                    {"question": "Which article: '___ Internet has changed everything.'", "options": {"A": "A", "B": "An", "C": "The", "D": "No article"}, "correct_answer": "C"},
                    {"question": "Select article: 'She is ___ most skilled developer.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "C"},
                    {"question": "Choose: 'We work in ___ same building.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "C"},
                    {"question": "Which: 'He is ___ only one who knows Python.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "C"},
                    {"question": "Select: '___ first version was released yesterday.'", "options": {"A": "A", "B": "An", "C": "The", "D": "No article"}, "correct_answer": "C"},
                    {"question": "Choose: 'She works for ___ largest tech company.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "C"},
                    {"question": "Which: 'We use ___ latest technology.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "C"},
                    {"question": "Select: 'He is ___ second person to join.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "C"},
                    {"question": "Choose: '___ next meeting is on Monday.'", "options": {"A": "A", "B": "An", "C": "The", "D": "No article"}, "correct_answer": "C"},
                    {"question": "Which: 'She has ___ unique approach to coding.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "A"},
                    {"question": "Select: 'We found ___ perfect candidate.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "C"},
                    {"question": "Choose: 'He works at ___ top-rated company.'", "options": {"A": "a", "B": "an", "C": "the", "D": "no article"}, "correct_answer": "A"},
                    {"question": "Which: '___ final decision will be made tomorrow.'", "options": {"A": "A", "B": "An", "C": "The", "D": "No article"}, "correct_answer": "C"}
                ],
                'hard': [
                    {"question": "Choose the appropriate article: '___ software industry requires constant learning.'", "options": {"A": "A", "B": "An", "C": "The", "D": "No article"}, "correct_answer": "C"},
                    {"question": "Select article: '___ artificial intelligence will transform ___ future.'", "options": {"A": "The, the", "B": "An, the", "C": "A, the", "D": "No article, the"}, "correct_answer": "A"},
                    {"question": "Which: 'She has ___ PhD in ___ computer science.'", "options": {"A": "a, the", "B": "a, no article", "C": "the, the", "D": "an, no article"}, "correct_answer": "B"},
                    {"question": "Choose: '___ machine learning is ___ subset of AI.'", "options": {"A": "The, a", "B": "A, a", "C": "No article, a", "D": "The, the"}, "correct_answer": "C"},
                    {"question": "Select: 'He works in ___ field of ___ cybersecurity.'", "options": {"A": "a, the", "B": "the, no article", "C": "a, no article", "D": "the, the"}, "correct_answer": "B"},
                    {"question": "Which: '___ blockchain technology has ___ potential to revolutionize finance.'", "options": {"A": "The, the", "B": "A, the", "C": "No article, the", "D": "The, a"}, "correct_answer": "C"},
                    {"question": "Choose: 'She specializes in ___ development of ___ mobile applications.'", "options": {"A": "a, the", "B": "the, no article", "C": "a, no article", "D": "the, the"}, "correct_answer": "B"},
                    {"question": "Select: '___ cloud computing has changed ___ way we store data.'", "options": {"A": "The, the", "B": "A, the", "C": "No article, the", "D": "The, a"}, "correct_answer": "C"},
                    {"question": "Which: 'He earned ___ master's degree in ___ data science.'", "options": {"A": "a, the", "B": "a, no article", "C": "the, the", "D": "an, no article"}, "correct_answer": "B"},
                    {"question": "Choose: '___ Internet of Things connects ___ everyday objects.'", "options": {"A": "An, the", "B": "The, no article", "C": "A, the", "D": "The, the"}, "correct_answer": "B"},
                    {"question": "Select: 'She works on ___ cutting-edge research in ___ quantum computing.'", "options": {"A": "a, the", "B": "the, no article", "C": "a, no article", "D": "no article, no article"}, "correct_answer": "D"},
                    {"question": "Which: '___ virtual reality is transforming ___ entertainment industry.'", "options": {"A": "The, the", "B": "A, the", "C": "No article, the", "D": "The, an"}, "correct_answer": "C"},
                    {"question": "Choose: 'He has ___ expertise in ___ field of robotics.'", "options": {"A": "an, a", "B": "no article, the", "C": "the, the", "D": "a, a"}, "correct_answer": "B"},
                    {"question": "Select: '___ big data analytics requires ___ understanding of statistics.'", "options": {"A": "The, an", "B": "A, an", "C": "No article, an", "D": "The, the"}, "correct_answer": "C"},
                    {"question": "Which: 'She leads ___ team working on ___ next generation of processors.'", "options": {"A": "a, a", "B": "the, the", "C": "a, the", "D": "the, a"}, "correct_answer": "C"}
                ]
            },
            'prepositions': {
                'easy': [
                    {"question": "Complete: 'I work ___ a tech company.'", "options": {"A": "in", "B": "at", "C": "on", "D": "for"}, "correct_answer": "B"},
                    {"question": "Fill in the blank: 'The meeting is ___ 3 PM.'", "options": {"A": "in", "B": "at", "C": "on", "D": "for"}, "correct_answer": "B"},
                    {"question": "Choose the right preposition: 'She works ___ the development team.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "D"},
                    {"question": "Select: 'We'll meet ___ the office.'", "options": {"A": "in", "B": "at", "C": "on", "D": "by"}, "correct_answer": "B"},
                    {"question": "Which: 'The project starts ___ Monday.'", "options": {"A": "in", "B": "at", "C": "on", "D": "by"}, "correct_answer": "C"},
                    {"question": "Choose: 'I live ___ New York.'", "options": {"A": "in", "B": "at", "C": "on", "D": "by"}, "correct_answer": "A"},
                    {"question": "Select: 'She sits ___ her desk.'", "options": {"A": "in", "B": "at", "C": "on", "D": "by"}, "correct_answer": "B"},
                    {"question": "Which: 'The book is ___ the table.'", "options": {"A": "in", "B": "at", "C": "on", "D": "by"}, "correct_answer": "C"},
                    {"question": "Choose: 'We travel ___ car.'", "options": {"A": "in", "B": "at", "C": "on", "D": "by"}, "correct_answer": "D"},
                    {"question": "Select: 'The meeting is ___ the morning.'", "options": {"A": "in", "B": "at", "C": "on", "D": "by"}, "correct_answer": "A"},
                    {"question": "Which: 'She works ___ Google.'", "options": {"A": "in", "B": "at", "C": "on", "D": "for"}, "correct_answer": "B"},
                    {"question": "Choose: 'The code runs ___ the server.'", "options": {"A": "in", "B": "at", "C": "on", "D": "by"}, "correct_answer": "C"},
                    {"question": "Select: 'I'll call you ___ the evening.'", "options": {"A": "in", "B": "at", "C": "on", "D": "by"}, "correct_answer": "A"},
                    {"question": "Which: 'The app works ___ mobile devices.'", "options": {"A": "in", "B": "at", "C": "on", "D": "by"}, "correct_answer": "C"},
                    {"question": "Choose: 'We collaborate ___ other teams.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "D"}
                ],
                'medium': [
                    {"question": "Which preposition fits: 'The team worked ___ the deadline.'", "options": {"A": "in", "B": "on", "C": "at", "D": "towards"}, "correct_answer": "D"},
                    {"question": "Select the correct preposition: 'We focus ___ quality code.'", "options": {"A": "in", "B": "on", "C": "at", "D": "with"}, "correct_answer": "B"},
                    {"question": "Choose: 'She specializes ___ web development.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "A"},
                    {"question": "Which: 'The project depends ___ client approval.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "C"},
                    {"question": "Select: 'We're working ___ a tight schedule.'", "options": {"A": "under", "B": "at", "C": "on", "D": "with"}, "correct_answer": "A"},
                    {"question": "Choose: 'The team consists ___ five developers.'", "options": {"A": "in", "B": "of", "C": "on", "D": "with"}, "correct_answer": "B"},
                    {"question": "Which: 'She's responsible ___ testing.'", "options": {"A": "in", "B": "at", "C": "for", "D": "with"}, "correct_answer": "C"},
                    {"question": "Select: 'We're looking ___ a solution.'", "options": {"A": "in", "B": "at", "C": "for", "D": "with"}, "correct_answer": "C"},
                    {"question": "Choose: 'The code is based ___ Python.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "C"},
                    {"question": "Which: 'She's interested ___ machine learning.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "A"},
                    {"question": "Select: 'We're dealing ___ a complex issue.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "D"},
                    {"question": "Choose: 'The system runs ___ Linux.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "C"},
                    {"question": "Which: 'She's good ___ problem solving.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "B"},
                    {"question": "Select: 'We're working ___ the latest version.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "D"},
                    {"question": "Choose: 'The feature is available ___ premium users.'", "options": {"A": "for", "B": "at", "C": "on", "D": "with"}, "correct_answer": "A"}
                ],
                'hard': [
                    {"question": "Select the correct preposition: 'Success depends ___ effective communication.'", "options": {"A": "in", "B": "on", "C": "at", "D": "with"}, "correct_answer": "B"},
                    {"question": "Choose: 'The algorithm is capable ___ processing large datasets.'", "options": {"A": "in", "B": "at", "C": "of", "D": "with"}, "correct_answer": "C"},
                    {"question": "Which: 'She's proficient ___ multiple programming languages.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "A"},
                    {"question": "Select: 'The system is vulnerable ___ security attacks.'", "options": {"A": "for", "B": "at", "C": "to", "D": "with"}, "correct_answer": "C"},
                    {"question": "Choose: 'We're committed ___ delivering quality software.'", "options": {"A": "in", "B": "at", "C": "to", "D": "with"}, "correct_answer": "C"},
                    {"question": "Which: 'The framework is compatible ___ various platforms.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "D"},
                    {"question": "Select: 'She's experienced ___ agile methodologies.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "A"},
                    {"question": "Choose: 'The code is susceptible ___ memory leaks.'", "options": {"A": "for", "B": "at", "C": "to", "D": "with"}, "correct_answer": "C"},
                    {"question": "Which: 'We're striving ___ excellence in development.'", "options": {"A": "in", "B": "at", "C": "for", "D": "with"}, "correct_answer": "C"},
                    {"question": "Select: 'The application is optimized ___ mobile devices.'", "options": {"A": "in", "B": "at", "C": "on", "D": "for"}, "correct_answer": "D"},
                    {"question": "Choose: 'She's adept ___ handling complex algorithms.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "B"},
                    {"question": "Which: 'The system is resilient ___ failures.'", "options": {"A": "for", "B": "at", "C": "to", "D": "with"}, "correct_answer": "C"},
                    {"question": "Select: 'We're focused ___ improving user experience.'", "options": {"A": "in", "B": "at", "C": "on", "D": "with"}, "correct_answer": "C"},
                    {"question": "Choose: 'The database is optimized ___ performance.'", "options": {"A": "in", "B": "at", "C": "on", "D": "for"}, "correct_answer": "D"},
                    {"question": "Which: 'She's knowledgeable ___ cloud computing technologies.'", "options": {"A": "in", "B": "about", "C": "on", "D": "with"}, "correct_answer": "B"}
                ]
            }
        }
        
        questions = []
        
        for topic in topics:
            if topic in grammar_templates:
                topic_config = topic_questions.get(topic, {})
                
                # Generate questions for each difficulty
                for difficulty in ['easy', 'medium', 'hard']:
                    count = topic_config.get(difficulty, 0)
                    templates = grammar_templates[topic].get(difficulty, [])
                    
                    for i in range(count):
                        template_index = i % len(templates) if templates else 0
                        if templates:
                            template = templates[template_index]
                            time_limit = 60 if difficulty == 'easy' else 90 if difficulty == 'medium' else 120
                            
                            questions.append({
                                'title': f'Grammar Assessment - {topic.title()} {difficulty.title()} {i+1}',
                                'content': template['question'],
                                'options': template['options'],
                                'correct_answer': template['correct_answer'],
                                'skill': 'grammar',
                                'type': 'grammar',
                                'topic': topic,
                                'difficulty': difficulty,
                                'time_limit': time_limit,
                                'evaluation_criteria': ['grammatical_accuracy', 'language_knowledge'],
                                'instructions': 'Select the most grammatically correct option.'
                            })
        
        logger.info(f"✅ Generated {len(questions)} grammar questions using templates")
        return questions

    def _generate_small_reading_batch(self, reading_config: Dict, job_title: str, max_questions: int, existing_questions: List[Dict] = None) -> List[Dict]:
        """Generate a small batch of reading questions with AI + template fallback"""
        questions_to_generate = min(max_questions, 3)  # Max 3 reading questions per batch
        
        # Try AI first if we have API keys
        if self.api_keys:
            logger.info(f"🤖 Trying AI generation for {questions_to_generate} reading passages...")
            
            prompt = f"""Generate exactly {questions_to_generate} unique reading passages for a {job_title} communication assessment.

Requirements:
- Each passage should be 3-5 sentences long
- Content should be relevant to {job_title} work
- Use professional, clear language
- Make each passage completely unique and different

Return ONLY a JSON array of passages like this:
[
  "First unique passage about software development work and best practices...",
  "Second completely different passage about project management and teamwork...",
  "Third unique passage about technical problem-solving approaches..."
]"""

            try:
                response = requests.post(
                    f"{self.api_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.get_current_api_key()}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "You are an expert assessment creator. Generate unique reading passages in valid JSON format only."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.8,
                        "max_tokens": 1000
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content'].strip()
                    passages = json.loads(content)
                    
                    questions = []
                    for i, passage in enumerate(passages[:questions_to_generate]):
                        questions.append({
                            'title': f'Reading Assessment - Level {i+1}',
                            'content': 'Please read the following passage aloud clearly and naturally.',
                            'passage': passage,
                            'skill': 'reading',
                            'type': 'reading_aloud',
                            'difficulty': 'medium',
                            'time_limit': 180,
                            'evaluation_criteria': ['pronunciation', 'fluency', 'pace', 'clarity'],
                            'instructions': 'Read the paragraph aloud at a natural pace.'
                        })
                    
                    logger.info(f"✅ AI generated {len(questions)} reading passages")
                    return questions
                    
            except Exception as e:
                logger.warning(f"⚠️ AI generation failed: {str(e)}")
        
        # Fallback to templates when AI fails or rate limited
        logger.info(f"📝 Using template fallback for {questions_to_generate} reading passages...")
        
        # Get existing passages to avoid duplicates
        existing_passages = set()
        if existing_questions:
            for q in existing_questions:
                if q.get('skill') == 'reading' and q.get('passage'):
                    # Use first 50 characters as unique identifier
                    existing_passages.add(q['passage'][:50])
        
        reading_templates = [
            f"Software development is a collaborative process that requires clear communication between team members. In {job_title} roles, professionals must effectively convey technical concepts to both technical and non-technical stakeholders. This includes writing clear documentation, participating in code reviews, and explaining complex algorithms in simple terms. Strong communication skills are essential for project success and team coordination.",
            
            f"Modern {job_title} work involves continuous learning and adaptation to new technologies. Professionals in this field must stay updated with industry trends, programming languages, and development methodologies. They often participate in technical discussions, mentor junior developers, and contribute to architectural decisions. The ability to articulate technical solutions clearly is crucial for career advancement.",
            
            f"Quality assurance and testing are integral parts of the {job_title} workflow. Developers must communicate effectively with QA teams, document bug reports clearly, and explain technical solutions to stakeholders. This requires strong verbal and written communication skills, as well as the ability to present complex technical information in an accessible manner.",
            
            f"Project management in {job_title} roles requires excellent communication skills to coordinate with cross-functional teams. Developers must participate in daily standups, sprint planning meetings, and retrospectives. They need to clearly communicate progress, blockers, and technical challenges to ensure project success and maintain team alignment.",
            
            f"Code review processes in {job_title} positions demand constructive communication and feedback skills. Developers must provide clear, actionable comments on code quality, suggest improvements, and explain best practices to colleagues. This collaborative approach helps maintain code standards and promotes knowledge sharing within the development team.",
            
            f"Effective debugging is a crucial skill for {job_title} professionals. It requires systematic thinking, clear communication with team members about issues, and the ability to document solutions for future reference. Developers must explain complex technical problems to stakeholders and collaborate with others to find efficient solutions.",
            
            f"Version control and collaboration are fundamental aspects of {job_title} work. Professionals must communicate changes clearly through commit messages, participate in pull request reviews, and coordinate with team members on feature development. Clear communication prevents conflicts and ensures smooth project progression.",
            
            f"Performance optimization requires {job_title} professionals to analyze system bottlenecks and communicate findings effectively. They must present technical solutions to both technical and business stakeholders, explaining the impact of optimizations on user experience and system reliability.",
            
            f"Security considerations are paramount in {job_title} roles. Professionals must communicate security requirements clearly, document potential vulnerabilities, and collaborate with security teams to implement robust solutions. Clear communication about security practices protects both the application and user data.",
            
            f"Continuous integration and deployment practices require {job_title} professionals to communicate effectively about build processes, testing strategies, and deployment procedures. They must document workflows clearly and coordinate with DevOps teams to ensure reliable software delivery."
        ]
        
        questions = []
        template_index = 0
        generated_count = 0
        skipped_count = 0
        
        while generated_count < questions_to_generate and template_index < len(reading_templates):
            passage = reading_templates[template_index]
            passage_key = passage[:50]
            
            # Skip if this passage already exists OR was used globally
            if passage_key not in existing_passages and template_index not in self.used_reading_templates:
                questions.append({
                    'title': f'Reading Assessment - Template {generated_count + 1}',
                    'content': 'Please read the following passage aloud clearly and naturally.',
                    'passage': passage,
                    'skill': 'reading',
                    'type': 'reading_aloud',
                    'difficulty': 'medium',
                    'time_limit': 180,
                    'evaluation_criteria': ['pronunciation', 'fluency', 'pace', 'clarity'],
                    'instructions': 'Read the paragraph aloud at a natural pace.'
                })
                existing_passages.add(passage_key)  # Add to prevent duplicates in this batch
                self.used_reading_templates.add(template_index)  # Mark template as used globally
                generated_count += 1
            else:
                skipped_count += 1
            
            template_index += 1
        
        # If we couldn't generate enough questions and all templates are used, reset and try again
        if generated_count < questions_to_generate and len(self.used_reading_templates) >= len(reading_templates):
            logger.warning(f"⚠️ All reading templates exhausted, resetting to generate remaining {questions_to_generate - generated_count} questions")
            self.used_reading_templates.clear()
            
            # Continue generating from unused templates
            while generated_count < questions_to_generate and template_index < len(reading_templates) * 2:  # Allow second pass
                actual_index = template_index % len(reading_templates)
                passage = reading_templates[actual_index]
                passage_key = passage[:50]
                
                if passage_key not in existing_passages and actual_index not in self.used_reading_templates:
                    questions.append({
                        'title': f'Reading Assessment - Template {generated_count + 1}',
                        'content': 'Please read the following passage aloud clearly and naturally.',
                        'passage': passage,
                        'skill': 'reading',
                        'type': 'reading_aloud',
                        'difficulty': 'medium',
                        'time_limit': 180,
                        'evaluation_criteria': ['pronunciation', 'fluency', 'pace', 'clarity'],
                        'instructions': 'Read the paragraph aloud at a natural pace.'
                    })
                    existing_passages.add(passage_key)
                    self.used_reading_templates.add(actual_index)
                    generated_count += 1
                
                template_index += 1
        
        # FINAL FALLBACK: If still not enough questions, generate dynamic variations
        if generated_count < questions_to_generate:
            remaining_needed = questions_to_generate - generated_count
            logger.warning(f"🚨 Still need {remaining_needed} questions after template exhaustion - generating dynamic variations")
            
            # Generate dynamic variations of existing templates
            for i in range(remaining_needed):
                base_template_index = i % len(reading_templates)
                base_passage = reading_templates[base_template_index]
                
                # Create variation by modifying the passage slightly
                variation_passage = self._create_reading_variation(base_passage, job_title, i + 1)
                
                questions.append({
                    'title': f'Reading Assessment - Variation {generated_count + 1}',
                    'content': 'Please read the following passage aloud clearly and naturally.',
                    'passage': variation_passage,
                    'skill': 'reading',
                    'type': 'reading_aloud',
                    'difficulty': 'medium',
                    'time_limit': 180,
                    'evaluation_criteria': ['pronunciation', 'fluency', 'pace', 'clarity'],
                    'instructions': 'Read the paragraph aloud at a natural pace.'
                })
                generated_count += 1
                
            logger.info(f"🔄 Generated {remaining_needed} dynamic reading variations to meet target")
        
        logger.info(f"✅ Generated {len(questions)} unique reading passages using templates (skipped {skipped_count} duplicates/used templates)")
        return questions

    def _generate_small_listening_batch(self, listening_config: Dict, job_title: str, max_questions: int, existing_questions: List[Dict] = None) -> List[Dict]:
        """Generate a small batch of listening questions with AI + template fallback"""
        questions_to_generate = min(max_questions, 3)  # Max 3 listening questions per batch
        
        # Try AI first if we have API keys
        if self.api_keys:
            logger.info(f"🤖 Trying AI generation for {questions_to_generate} listening sentences...")
            
            prompt = f"""Generate exactly {questions_to_generate} unique sentences for a {job_title} listening assessment.

Requirements:
- Each sentence should be 12-16 words long
- Content should be relevant to {job_title} work
- Use professional, clear language
- Make each sentence completely unique and different

Return ONLY a JSON array of sentences like this:
[
  "First unique sentence about software development processes and methodologies.",
  "Second different sentence about team collaboration and project management.",
  "Third unique sentence about technical problem-solving and code quality."
]"""

            try:
                response = requests.post(
                    f"{self.api_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.get_current_api_key()}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "You are an expert assessment creator. Generate unique listening sentences in valid JSON format only."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.8,
                        "max_tokens": 500
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content'].strip()
                    sentences = json.loads(content)
                    
                    questions = []
                    for i, sentence in enumerate(sentences[:questions_to_generate]):
                        questions.append({
                            'title': f'Sentence Repetition - Level {i+1}',
                            'content': 'Listen to the sentence and repeat it exactly as you heard it.',
                            'audio_text': sentence,
                            'skill': 'listening',
                            'subtype': 'sentence',
                            'type': 'listening',
                            'difficulty': 'medium',
                            'time_limit': 90,
                            'evaluation_criteria': ['accuracy', 'pronunciation', 'fluency'],
                            'instructions': 'Listen carefully, then repeat exactly as you heard it.'
                        })
                    
                    logger.info(f"✅ AI generated {len(questions)} listening sentences")
                    return questions
                    
            except Exception as e:
                logger.warning(f"⚠️ AI generation failed: {str(e)}")
        
        # Fallback to templates when AI fails or rate limited
        logger.info(f"📝 Using template fallback for {questions_to_generate} listening sentences...")
        
        # Get existing sentences to avoid duplicates
        existing_sentences = set()
        if existing_questions:
            for q in existing_questions:
                if q.get('skill') == 'listening' and q.get('audio_text'):
                    existing_sentences.add(q['audio_text'])
        
        listening_templates = [
            f"Effective {job_title} professionals collaborate closely with cross-functional teams to deliver high-quality software solutions.",
            f"Modern {job_title} roles require continuous learning and adaptation to emerging technologies and industry best practices.",
            f"Code review processes help {job_title} teams maintain consistent quality standards and share knowledge effectively.",
            f"Agile methodologies enable {job_title} teams to respond quickly to changing requirements and deliver value iteratively.",
            f"Technical documentation is essential for {job_title} professionals to communicate complex concepts clearly and accurately.",
            f"Version control systems help {job_title} teams track changes and collaborate efficiently on software projects.",
            f"Testing strategies ensure that {job_title} professionals deliver reliable and maintainable software applications.",
            f"Performance optimization is a critical skill for {job_title} professionals working on large-scale applications.",
            f"Database design and optimization require {job_title} professionals to understand complex relationships and performance implications.",
            f"User experience considerations guide {job_title} professionals in creating intuitive and accessible software interfaces.",
            f"Security best practices are fundamental knowledge for {job_title} professionals working with sensitive data systems.",
            f"Microservices architecture enables {job_title} teams to build scalable and maintainable distributed systems effectively."
        ]
        
        questions = []
        template_index = 0
        generated_count = 0
        skipped_count = 0
        
        while generated_count < questions_to_generate and template_index < len(listening_templates):
            sentence = listening_templates[template_index]
            
            # Skip if this sentence already exists OR was used globally
            if sentence not in existing_sentences and template_index not in self.used_listening_templates:
                questions.append({
                    'title': f'Sentence Repetition - Template {generated_count + 1}',
                    'content': 'Listen to the sentence and repeat it exactly as you heard it.',
                    'audio_text': sentence,
                    'skill': 'listening',
                    'subtype': 'sentence',
                    'type': 'listening',
                    'difficulty': 'medium',
                    'time_limit': 90,
                    'evaluation_criteria': ['accuracy', 'pronunciation', 'fluency'],
                    'instructions': 'Listen carefully, then repeat exactly as you heard it.'
                })
                existing_sentences.add(sentence)  # Add to prevent duplicates in this batch
                self.used_listening_templates.add(template_index)  # Mark template as used globally
                generated_count += 1
            else:
                skipped_count += 1
            
            template_index += 1
        
        # FINAL FALLBACK: If still not enough questions, generate dynamic variations
        if generated_count < questions_to_generate:
            remaining_needed = questions_to_generate - generated_count
            logger.warning(f"🚨 Still need {remaining_needed} listening questions after template exhaustion - generating dynamic variations")
            
            # Generate dynamic variations of existing templates
            for i in range(remaining_needed):
                base_template_index = i % len(listening_templates)
                base_sentence = listening_templates[base_template_index]
                
                # Create variation by modifying the sentence slightly
                variation_sentence = self._create_listening_variation(base_sentence, job_title, i + 1)
                
                questions.append({
                    'title': f'Sentence Repetition - Variation {generated_count + 1}',
                    'content': 'Listen to the sentence and repeat it exactly as you heard it.',
                    'audio_text': variation_sentence,
                    'skill': 'listening',
                    'subtype': 'sentence',
                    'type': 'listening',
                    'difficulty': 'medium',
                    'time_limit': 90,
                    'evaluation_criteria': ['accuracy', 'pronunciation', 'fluency'],
                    'instructions': 'Listen carefully, then repeat exactly as you heard it.'
                })
                generated_count += 1
                
            logger.info(f"🔄 Generated {remaining_needed} dynamic listening variations to meet target")

        logger.info(f"✅ Generated {len(questions)} unique listening sentences using templates (skipped {skipped_count} duplicates/used templates)")
        return questions

    def _generate_small_grammar_batch(self, grammar_config: Dict, job_title: str, max_questions: int, existing_questions: List[Dict] = None) -> List[Dict]:
        """Generate a small batch of grammar questions with AI + template fallback"""
        questions_to_generate = min(max_questions, 5)  # Max 5 grammar questions per batch
        
        # Try AI first if we have API keys
        if self.api_keys:
            logger.info(f"🤖 Trying AI generation for {questions_to_generate} grammar questions...")
            
            prompt = f"""Generate exactly {questions_to_generate} unique multiple choice grammar questions for a {job_title} assessment.

Requirements:
- Mix of basic grammar topics (tenses, articles, prepositions)
- Questions should be relevant to {job_title} work context
- Provide 4 options (A, B, C, D) for each question
- Make each question completely unique and different

Return ONLY a JSON array like this:
[
  {{
    "question": "Which sentence uses the correct present perfect tense?",
    "options": {{
      "A": "I have completed the project yesterday.",
      "B": "I completed the project yesterday.", 
      "C": "I have completed the project.",
      "D": "I am completing the project yesterday."
    }},
    "correct_answer": "C"
  }}
]"""

            try:
                response = requests.post(
                    f"{self.api_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.get_current_api_key()}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "You are an expert grammar assessment creator. Generate unique grammar questions in valid JSON format only."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1500
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content'].strip()
                    questions_data = json.loads(content)
                    
                    questions = []
                    for i, q_data in enumerate(questions_data[:questions_to_generate]):
                        questions.append({
                            'title': f'Grammar Assessment - Question {i+1}',
                            'content': q_data['question'],
                            'options': q_data['options'],
                            'correct_answer': q_data['correct_answer'],
                            'skill': 'grammar',
                            'type': 'grammar',
                            'topic': 'mixed',
                            'difficulty': 'medium',
                            'time_limit': 90,
                            'evaluation_criteria': ['grammatical_accuracy', 'language_knowledge'],
                            'instructions': 'Select the most grammatically correct option.'
                        })
                    
                    logger.info(f"✅ AI generated {len(questions)} grammar questions")
                    return questions
                    
            except Exception as e:
                logger.warning(f"⚠️ AI generation failed: {str(e)}")
        
        # Fallback to templates when AI fails or rate limited
        logger.info(f"📝 Using template fallback for {questions_to_generate} grammar questions...")
        
        # Get existing questions to avoid duplicates
        existing_question_texts = set()
        if existing_questions:
            for q in existing_questions:
                if q.get('skill') == 'grammar' and q.get('content'):
                    existing_question_texts.add(q['content'])
        
        grammar_templates = [
            {
                "question": "Which sentence uses the correct present perfect tense?",
                "options": {
                    "A": "I have completed the project yesterday.",
                    "B": "I completed the project yesterday.",
                    "C": "I have completed the project.",
                    "D": "I am completing the project yesterday."
                },
                "correct_answer": "C"
            },
            {
                "question": "Choose the correct article for the sentence: 'She is ___ software developer.'",
                "options": {
                    "A": "a",
                    "B": "an",
                    "C": "the", 
                    "D": "no article needed"
                },
                "correct_answer": "A"
            },
            {
                "question": "Which preposition correctly completes: 'The team worked ___ the deadline.'",
                "options": {
                    "A": "in",
                    "B": "on",
                    "C": "at",
                    "D": "towards"
                },
                "correct_answer": "D"
            },
            {
                "question": "Select the sentence with correct subject-verb agreement:",
                "options": {
                    "A": "The data are being processed.",
                    "B": "The data is being processed.",
                    "C": "The data were being processed.",
                    "D": "The data was being processed."
                },
                "correct_answer": "A"
            },
            {
                "question": "Which sentence uses the past perfect tense correctly?",
                "options": {
                    "A": "I had finished the code before the meeting started.",
                    "B": "I have finished the code before the meeting started.",
                    "C": "I finished the code before the meeting started.",
                    "D": "I was finishing the code before the meeting started."
                },
                "correct_answer": "A"
            },
            {
                "question": "Identify the correct use of conditional sentences:",
                "options": {
                    "A": "If I would have time, I will help you.",
                    "B": "If I have time, I will help you.",
                    "C": "If I had time, I will help you.",
                    "D": "If I have time, I would help you."
                },
                "correct_answer": "B"
            },
            {
                "question": "Which sentence correctly uses passive voice?",
                "options": {
                    "A": "The code is being reviewed by the team.",
                    "B": "The code is being review by the team.",
                    "C": "The code is been reviewed by the team.",
                    "D": "The code is being reviewing by the team."
                },
                "correct_answer": "A"
            },
            {
                "question": "Choose the correct pronoun: 'The manager gave the task to John and ___.'",
                "options": {
                    "A": "I",
                    "B": "me",
                    "C": "myself",
                    "D": "mine"
                },
                "correct_answer": "B"
            }
        ]
        
        questions = []
        template_index = 0
        generated_count = 0
        skipped_count = 0
        
        while generated_count < questions_to_generate and template_index < len(grammar_templates):
            template = grammar_templates[template_index]
            question_text = template['question']
            
            # Skip if this question already exists OR was used globally
            if question_text not in existing_question_texts and template_index not in self.used_grammar_templates:
                questions.append({
                    'title': f'Grammar Assessment - Template {generated_count + 1}',
                    'content': question_text,
                    'options': template['options'],
                    'correct_answer': template['correct_answer'],
                    'skill': 'grammar',
                    'type': 'grammar',
                    'topic': 'mixed',
                    'difficulty': 'medium',
                    'time_limit': 90,
                    'evaluation_criteria': ['grammatical_accuracy', 'language_knowledge'],
                    'instructions': 'Select the most grammatically correct option.'
                })
                existing_question_texts.add(question_text)  # Add to prevent duplicates in this batch
                self.used_grammar_templates.add(template_index)  # Mark template as used globally
                generated_count += 1
            else:
                skipped_count += 1
            
            template_index += 1
        
        # FINAL FALLBACK: If still not enough questions, generate dynamic variations
        if generated_count < questions_to_generate:
            remaining_needed = questions_to_generate - generated_count
            logger.warning(f"🚨 Still need {remaining_needed} grammar questions after template exhaustion - generating dynamic variations")
            
            # Generate dynamic variations of existing templates
            for i in range(remaining_needed):
                base_template_index = i % len(grammar_templates)
                base_question = grammar_templates[base_template_index]
                
                # Create variation by modifying the question slightly
                variation_question = self._create_grammar_variation(base_question, i + 1)
                
                questions.append({
                    'title': f'Grammar Assessment - Variation {generated_count + 1}',
                    'content': variation_question['question'],
                    'options': variation_question['options'],
                    'correct_answer': variation_question['correct_answer'],
                    'skill': 'grammar',
                    'type': 'grammar',
                    'topic': 'mixed',
                    'difficulty': 'medium',
                    'time_limit': 90,
                    'evaluation_criteria': ['grammatical_accuracy', 'language_knowledge'],
                    'instructions': 'Select the most grammatically correct option.'
                })
                generated_count += 1
                
            logger.info(f"🔄 Generated {remaining_needed} dynamic grammar variations to meet target")

        logger.info(f"✅ Generated {len(questions)} unique grammar questions using templates (skipped {skipped_count} duplicates/used templates)")
        return questions

    def _create_reading_variation(self, base_passage: str, job_title: str, variation_number: int) -> str:
        """Create a variation of a reading passage when templates are exhausted"""
        variations = [
            # Variation 1: Add context about teamwork
            f"In collaborative {job_title} environments, {base_passage.lower()} Team coordination and effective communication are essential for project success.",
            
            # Variation 2: Add context about modern practices
            f"Modern {job_title} practices emphasize that {base_passage.lower()} This approach ensures sustainable development and maintainable code quality.",
            
            # Variation 3: Add context about challenges
            f"When facing complex challenges, {job_title} professionals find that {base_passage.lower()} These skills become increasingly important in dynamic work environments.",
            
            # Variation 4: Add context about career growth
            f"For career advancement in {job_title} roles, it's important to understand that {base_passage.lower()} Professional development requires continuous learning and adaptation.",
            
            # Variation 5: Add context about industry standards
            f"According to industry best practices, {job_title} professionals should recognize that {base_passage.lower()} These standards help maintain consistency across development teams."
        ]
        
        variation_index = (variation_number - 1) % len(variations)
        return variations[variation_index]
    
    def _create_listening_variation(self, base_sentence: str, job_title: str, variation_number: int) -> str:
        """Create a variation of a listening sentence when templates are exhausted"""
        variations = [
            f"In today's market, {base_sentence.lower()}",
            f"According to recent studies, {base_sentence.lower()}",
            f"Industry experts agree that {base_sentence.lower()}",
            f"For successful {job_title} careers, {base_sentence.lower()}",
            f"Research shows that {base_sentence.lower()}"
        ]
        
        variation_index = (variation_number - 1) % len(variations)
        return variations[variation_index]
    
    def _create_grammar_variation(self, base_question: dict, variation_number: int) -> dict:
        """Create a variation of a grammar question when templates are exhausted"""
        # Create variations by changing context while keeping grammar focus
        question_variations = {
            "Which sentence uses the correct present perfect tense?": [
                "Select the sentence with proper present perfect tense usage:",
                "Identify the correct present perfect tense construction:",
                "Choose the grammatically correct present perfect sentence:"
            ],
            "Choose the correct article for the sentence:": [
                "Select the appropriate article:",
                "Pick the correct article usage:",
                "Identify the proper article:"
            ],
            "Which preposition correctly completes:": [
                "Select the appropriate preposition for:",
                "Choose the correct preposition to complete:",
                "Pick the right preposition for:"
            ]
        }
        
        original_question = base_question['question']
        variations = []
        
        # Find matching variations
        for key, var_list in question_variations.items():
            if key in original_question:
                variations = var_list
                break
        
        if variations:
            variation_index = (variation_number - 1) % len(variations)
            new_question = original_question.replace(
                list(question_variations.keys())[0] if variations else original_question.split(':')[0],
                variations[variation_index]
            )
            
            return {
                **base_question,
                'question': new_question
            }
        
        # If no specific variation found, add prefix
        prefixes = ["In professional contexts, ", "For workplace communication, ", "In business settings, "]
        prefix = prefixes[(variation_number - 1) % len(prefixes)]
        
        return {
            **base_question,
            'question': f"{prefix}{original_question.lower()}"
        }

    def _get_fallback_structured_communication(self, reading_config: Dict, listening_config: Dict, 
                                             grammar_config: Dict, skills: List[str]) -> Dict[str, Any]:
        """Fallback for structured communication assessment - shows error messages instead of templates"""
        questions = []
        
        # Show error messages instead of fallback questions
        if 'reading' in skills:
            questions.append({
                'title': 'Reading Assessment Error',
                'content': 'AI service unavailable for reading assessment',
                'passage': 'ERROR: AI not able to generate reading content. Please check AI service configuration.',
                'skill': 'reading',
                'type': 'error',
                'difficulty': 'error',
                'time_limit': 60,
                'error': True
            })
        
        if 'listening' in skills:
            questions.append({
                'title': 'Listening Assessment Error',
                'content': 'AI service unavailable for listening assessment',
                'audio_text': 'ERROR: AI not able to generate listening content. Please check AI service configuration.',
                'skill': 'listening',
                'type': 'error',
                'difficulty': 'error',
                'time_limit': 60,
                'error': True
            })
        
        if 'grammar' in skills:
            questions.append({
                'title': 'Grammar Assessment Error',
                'content': 'AI service unavailable for grammar assessment',
                'options': {'A': 'ERROR', 'B': 'AI service', 'C': 'unavailable', 'D': 'for generation'},
                'correct_answer': 'A',
                'skill': 'grammar',
                'type': 'error',
                'difficulty': 'error',
                'time_limit': 60,
                'error': True
            })
        
        return {
            'success': False,
            'questions': questions,
            'total_questions': len(questions),
            'metadata': {'generated_by': 'error_fallback', 'type': 'structured_communication_error'}
        }

    def generate_aptitude_questions_by_topic(self, topic_configs: List[Dict],
                                            time_per_question: int = 60, job_title: str = 'Software Developer') -> Dict[str, Any]:
        """Generate MCQ aptitude questions with per-topic difficulty configuration using AI ONLY - BATCH APPROACH"""
        if not self.api_keys:
            logger.error("❌ No GROQ API key - cannot generate AI aptitude questions")
            return {
                'success': False,
                'questions': [{
                    'topic': 'error',
                    'question': 'ERROR: AI not able to generate content. Please configure GROQ API key.',
                    'options': {'A': 'ERROR', 'B': 'AI service', 'C': 'unavailable', 'D': 'configure API key'},
                    'correct_answer': 'A',
                    'difficulty': 'error',
                    'time_limit': 60,
                    'error': True
                }],
                'total_questions': 1,
                'metadata': {'generated_by': 'error', 'type': 'aptitude_error'}
            }

        total_questions = sum(tc['total'] for tc in topic_configs)
        logger.info(f"🤖 Generating {total_questions} aptitude questions by topic using AI (SMART MODE)...")

        # Step 1: Check existing questions in database
        logger.info("🔍 Checking existing questions in database...")
        existing_counts = self._check_existing_questions(topic_configs)
        
        # Step 2: Calculate only missing questions needed
        missing_configs = self._calculate_missing_questions(topic_configs, existing_counts)
        
        if not missing_configs:
            logger.info("✅ All required questions already exist in database!")
            return {
                'success': True,
                'questions': [],
                'total_questions': 0,
                'metadata': {'generated_by': 'none_needed', 'type': 'all_questions_exist', 'message': 'All required questions already exist'}
            }
        
        missing_total = sum(mc['total'] for mc in missing_configs)
        logger.info(f"🎯 Need to generate {missing_total} missing questions (was {total_questions})")
        
        # Step 3: Generate only missing questions
        if missing_total > 30:
            logger.info(f"⚠️ {missing_total} missing questions is large, splitting into smaller batches...")
            return self._generate_aptitude_in_batches(missing_configs, time_per_question, job_title)
        
        # Use missing_configs instead of original topic_configs
        topic_configs = missing_configs
        total_questions = missing_total

        # Build detailed prompt for all topics at once
        topic_details = []
        for tc in topic_configs:
            details = []
            # Frontend sends easy/medium/hard directly, not in 'difficulties' object
            for diff in ['easy', 'medium', 'hard']:
                count = tc.get(diff, 0)
                if count > 0:
                    details.append(f"{count} {diff}")

            topic_details.append(f"- {tc['topic'].replace('_', ' ').upper()}: {', '.join(details)} (Total: {tc['total']})")

        # Create optimized prompt for single API call
        # Build existing questions context for duplicate prevention
        existing_context = ""
        if hasattr(self, 'existing_questions_content') and self.existing_questions_content:
            existing_samples = []
            for topic, questions in self.existing_questions_content.items():
                if questions:
                    # Show a few examples of existing questions to avoid duplicates
                    sample_questions = questions[:3]  # First 3 questions as examples
                    existing_samples.append(f"{topic.upper()}: {', '.join(sample_questions[:100] + '...' if len(sample_questions) > 100 else sample_questions for sample_questions in sample_questions)}")
            
            if existing_samples:
                existing_context = f"""
EXISTING QUESTIONS TO AVOID DUPLICATING:
{chr(10).join(existing_samples)}

DUPLICATE PREVENTION: Ensure your questions are completely different from the above existing questions. Use different scenarios, numbers, concepts, and wording."""

        prompt = f"""Generate exactly {total_questions} multiple choice aptitude questions for a {job_title} position.

TOPICS AND DIFFICULTY BREAKDOWN:
{chr(10).join(topic_details)}{existing_context}

REQUIREMENTS:
1. Each question must have exactly 4 options (A, B, C, D)
2. Include correct_answer, difficulty, explanation, and time_limit
3. Questions must be job-relevant and professional
4. IMPORTANT: Distribute correct answers evenly across A, B, C, D (avoid bias toward any single option)
5. Keep explanations brief (1-2 sentences max) to reduce response size
6. CRITICAL: Generate completely unique questions - avoid duplicating existing patterns, scenarios, or similar content
7. Use diverse question types, scenarios, and numerical values to ensure uniqueness
8. Return ONLY valid JSON in this exact format:

{{
  "questions": [
    {{
      "topic": "logical_reasoning",
      "question": "Your question here?",
      "options": {{"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}},
      "correct_answer": "A",
      "difficulty": "easy",
      "explanation": "Brief explanation",
      "time_limit": {time_per_question}
    }}
  ]
}}

Generate exactly {total_questions} questions following the topic and difficulty distribution above."""

        try:
            logger.info(f"🚀 Making single API call for all {total_questions} questions...")
            
            # API key rotation with retry logic
            max_key_attempts = len(self.api_keys)
            max_retries_per_key = 2
            
            for key_attempt in range(max_key_attempts):
                current_api_key = self.get_current_api_key()
                logger.info(f"🔑 Using API key {self.current_key_index + 1}/{len(self.api_keys)}")
                
                for retry in range(max_retries_per_key):
                    response = requests.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {current_api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": self.model,
                            "messages": [
                                {"role": "system", "content": "You are an expert aptitude test creator. Generate professional MCQ questions in valid JSON format only. Follow the exact count and difficulty requirements for each topic. Keep responses concise."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.7,
                            "max_tokens": 6000  # Reduced to prevent truncation
                        },
                        timeout=120  # Longer timeout for larger request
                    )
                    
                    if response.status_code == 429:
                        if retry < max_retries_per_key - 1:
                            retry_delay = 5 * (retry + 1)  # 5s, 10s delays
                            logger.warning(f"⚠️ Rate limited (429) on key {self.current_key_index + 1}, retrying in {retry_delay}s... (attempt {retry + 1}/{max_retries_per_key})")
                            time.sleep(retry_delay)
                            continue
                        else:
                            # This key is rate limited, try next key
                            logger.warning(f"⚠️ Key {self.current_key_index + 1} rate limited, rotating to next key...")
                            if not self.rotate_api_key():
                                # No more keys to rotate to
                                break
                            break  # Break retry loop, continue with next key
                    else:
                        # Success or other error, exit all loops
                        break
                
                # If we got a non-429 response, break out of key rotation loop
                if response.status_code != 429:
                    break
            
            # If all keys are rate limited
            if response.status_code == 429:
                logger.error(f"❌ All {len(self.api_keys)} API keys are rate limited")
                return {
                    'success': False,
                    'questions': [{
                        'topic': 'error',
                        'question': f'ERROR: All {len(self.api_keys)} GROQ API keys are rate limited. Please wait and try again later.',
                        'options': {'A': 'ERROR', 'B': 'All keys', 'C': 'rate limited', 'D': 'Try later'},
                        'correct_answer': 'A',
                        'difficulty': 'error',
                        'time_limit': 60,
                        'error': True
                    }],
                    'total_questions': 1,
                    'metadata': {'generated_by': 'error', 'type': 'all_keys_rate_limited'}
                }
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content'].strip()
                
                # Debug logging
                logger.info(f"🔍 API response length: {len(content)} characters")
                logger.info(f"🔍 API response preview: {content[:200]}...")

                if not content:
                    logger.error("❌ AI returned empty content")
                    return {
                        'success': False,
                        'questions': [{
                            'topic': 'error',
                            'question': 'ERROR: AI returned empty response',
                            'options': {'A': 'ERROR', 'B': 'Empty', 'C': 'AI response', 'D': 'received'},
                            'correct_answer': 'A',
                            'difficulty': 'error',
                            'time_limit': 60,
                            'error': True
                        }],
                        'total_questions': 1,
                        'metadata': {'generated_by': 'error', 'type': 'empty_response_error'}
                    }

                # Clean markdown code blocks from GROQ response
                if content.startswith('```'):
                    content = content.split('\n', 1)[1] if '\n' in content else content[3:]
                if content.endswith('```'):
                    content = content.rsplit('\n```', 1)[0] if '\n```' in content else content[:-3]

                content = content.strip()
                logger.info(f"🧹 Cleaned content preview: {content[:200]}...")

                try:
                    questions_data = json.loads(content)
                    generated_questions = questions_data.get('questions', [])
                    
                    # Validate exact count - trim if too many, warn if too few
                    if len(generated_questions) > total_questions:
                        logger.warning(f"⚠️ AI generated {len(generated_questions)} questions, expected {total_questions}. Trimming to exact count.")
                        generated_questions = generated_questions[:total_questions]
                    elif len(generated_questions) < total_questions:
                        logger.warning(f"⚠️ AI generated {len(generated_questions)} questions, expected {total_questions}. Using what was generated.")
                    
                    logger.info(f"✅ Successfully generated {len(generated_questions)} aptitude questions (requested: {total_questions})")
                    
                    return {
                        'success': True,
                        'questions': generated_questions,
                        'total_questions': len(generated_questions),
                        'metadata': {'generated_by': 'groq_ai_single', 'type': 'aptitude_by_topic'}
                    }
                    
                except json.JSONDecodeError as e:
                    logger.error(f"❌ JSON parsing error: {str(e)}")
                    logger.error(f"❌ Raw content length: {len(content)} characters")
                    
                    # Check if response was truncated
                    if "Unterminated string" in str(e) or not content.endswith('}'):
                        logger.error("❌ Response appears to be truncated - try reducing question count")
                        return {
                            'success': False,
                            'questions': [{
                                'topic': 'error',
                                'question': 'ERROR: AI response was truncated. Try generating fewer questions.',
                                'options': {'A': 'ERROR', 'B': 'Response', 'C': 'truncated', 'D': 'reduce count'},
                                'correct_answer': 'A',
                                'difficulty': 'error',
                                'time_limit': 60,
                                'error': True
                            }],
                            'total_questions': 1,
                            'metadata': {'generated_by': 'error', 'type': 'truncated_response_error'}
                        }
                    else:
                        logger.error(f"❌ Raw content preview: {content[:500]}...")
                        return {
                            'success': False,
                            'questions': [{
                                'topic': 'error',
                                'question': f'ERROR: AI response parsing failed. {str(e)}',
                                'options': {'A': 'ERROR', 'B': 'JSON parsing', 'C': 'failed', 'D': 'invalid format'},
                                'correct_answer': 'A',
                                'difficulty': 'error',
                                'time_limit': 60,
                                'error': True
                            }],
                            'total_questions': 1,
                            'metadata': {'generated_by': 'error', 'type': 'json_parse_error'}
                        }
            else:
                logger.error(f"❌ API error: {response.status_code}")
                return {
                    'success': False,
                    'questions': [{
                        'topic': 'error',
                        'question': f'ERROR: AI API failed with status {response.status_code}',
                        'options': {'A': 'ERROR', 'B': 'API failure', 'C': f'Status {response.status_code}', 'D': 'Try again'},
                        'correct_answer': 'A',
                        'difficulty': 'error',
                        'time_limit': 60,
                        'error': True
                    }],
                    'total_questions': 1,
                    'metadata': {'generated_by': 'error', 'type': 'api_error'}
                }

        except Exception as e:
            logger.error(f"❌ Error generating aptitude questions: {str(e)}")
            return {
                'success': False,
                'questions': [{
                    'topic': 'error',
                    'question': f'ERROR: Exception during generation - {str(e)}',
                    'options': {'A': 'ERROR', 'B': 'Exception', 'C': 'occurred', 'D': 'Try again'},
                    'correct_answer': 'A',
                    'difficulty': 'error',
                    'time_limit': 60,
                    'error': True
                }],
                'total_questions': 1,
                'metadata': {'generated_by': 'error', 'type': 'exception_error'}
            }

    def _generate_aptitude_in_batches(self, topic_configs: List[Dict], time_per_question: int, job_title: str) -> Dict[str, Any]:
        """Split large requests into smaller batches to avoid truncation"""
        all_questions = []
        batch_size = 2  # 2 topics per batch (max ~24 questions)
        
        for i in range(0, len(topic_configs), batch_size):
            batch_topics = topic_configs[i:i + batch_size]
            batch_total = sum(tc['total'] for tc in batch_topics)
            
            logger.info(f"📦 Processing batch {i//batch_size + 1}: {batch_total} questions for {len(batch_topics)} topics")
            
            # Generate questions for this batch
            batch_result = self._generate_single_batch(batch_topics, time_per_question, job_title)
            
            if batch_result['success']:
                all_questions.extend(batch_result['questions'])
                logger.info(f"✅ Batch {i//batch_size + 1}: Generated {len(batch_result['questions'])} questions")
            else:
                logger.error(f"❌ Batch {i//batch_size + 1} failed")
            
            # Add delay between batches to avoid rate limiting
            if i + batch_size < len(topic_configs):
                logger.info("⏳ Waiting 3 seconds before next batch...")
                time.sleep(3)
        
        if all_questions:
            logger.info(f"🎉 Successfully generated {len(all_questions)} total aptitude questions from {len(topic_configs)} topics")
            return {
                'success': True,
                'questions': all_questions,
                'total_questions': len(all_questions),
                'metadata': {'generated_by': 'groq_ai_batched', 'type': 'aptitude_by_topic'}
            }
        else:
            logger.error("❌ No questions generated from any batch")
            return {
                'success': False,
                'questions': [{
                    'topic': 'error',
                    'question': 'ERROR: All batches failed to generate questions',
                    'options': {'A': 'ERROR', 'B': 'All batches', 'C': 'failed', 'D': 'Try again'},
                    'correct_answer': 'A',
                    'difficulty': 'error',
                    'time_limit': 60,
                    'error': True
                }],
                'total_questions': 1,
                'metadata': {'generated_by': 'error', 'type': 'all_batches_failed'}
            }

    def _generate_single_batch(self, topic_configs: List[Dict], time_per_question: int, job_title: str) -> Dict[str, Any]:
        """Generate questions for a single batch of topics"""
        batch_total = sum(tc['total'] for tc in topic_configs)
        
        # Build prompt for this batch
        topic_details = []
        for tc in topic_configs:
            details = []
            for diff in ['easy', 'medium', 'hard']:
                count = tc.get(diff, 0)
                if count > 0:
                    details.append(f"{count} {diff}")
            topic_details.append(f"- {tc['topic'].replace('_', ' ').upper()}: {', '.join(details)} (Total: {tc['total']})")

        prompt = f"""Generate exactly {batch_total} multiple choice aptitude questions for a {job_title} position.

TOPICS AND DIFFICULTY BREAKDOWN:
{chr(10).join(topic_details)}

REQUIREMENTS:
1. Each question must have exactly 4 options (A, B, C, D)
2. Include correct_answer, difficulty, explanation, and time_limit
3. Questions must be job-relevant and professional
4. IMPORTANT: Distribute correct answers evenly across A, B, C, D (avoid bias toward any single option)
5. Keep explanations brief (1-2 sentences max) to reduce response size
6. Return ONLY valid JSON in this exact format:

{{
  "questions": [
    {{
      "topic": "logical_reasoning",
      "question": "Your question here?",
      "options": {{"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}},
      "correct_answer": "A",
      "difficulty": "easy",
      "explanation": "Brief explanation",
      "time_limit": {time_per_question}
    }}
  ]
}}

Generate exactly {batch_total} questions following the topic and difficulty distribution above."""

        try:
            current_api_key = self.get_current_api_key()
            
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {current_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are an expert aptitude test creator. Generate professional MCQ questions in valid JSON format only. Follow the exact count and difficulty requirements for each topic. Keep responses concise."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 4000  # Smaller for batch processing
                },
                timeout=90
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content'].strip()
                
                # Clean markdown code blocks
                if content.startswith('```'):
                    content = content.split('\n', 1)[1] if '\n' in content else content[3:]
                if content.endswith('```'):
                    content = content.rsplit('\n```', 1)[0] if '\n```' in content else content[:-3]
                content = content.strip()
                
                try:
                    questions_data = json.loads(content)
                    generated_questions = questions_data.get('questions', [])
                    
                    # Validate exact count - trim if too many, warn if too few
                    if len(generated_questions) > batch_total:
                        logger.warning(f"⚠️ AI generated {len(generated_questions)} questions, expected {batch_total}. Trimming to exact count.")
                        generated_questions = generated_questions[:batch_total]
                    elif len(generated_questions) < batch_total:
                        logger.warning(f"⚠️ AI generated {len(generated_questions)} questions, expected {batch_total}. Using what was generated.")
                    
                    return {
                        'success': True,
                        'questions': generated_questions,
                        'total_questions': len(generated_questions)
                    }
                    
                except json.JSONDecodeError as e:
                    logger.error(f"❌ Batch JSON parsing error: {str(e)}")
                    return {'success': False, 'questions': []}
                    
            elif response.status_code == 429:
                logger.warning("⚠️ Rate limited in batch, rotating API key...")
                self.rotate_api_key()
                return {'success': False, 'questions': []}
            else:
                logger.error(f"❌ Batch API error: {response.status_code}")
                return {'success': False, 'questions': []}
                
        except Exception as e:
            logger.error(f"❌ Batch exception: {str(e)}")
            return {'success': False, 'questions': []}

    def generate_aptitude_questions_by_difficulty(self, topics: List[str], difficulty_levels: List[Dict], 
                                                  time_per_question: int = 60, job_title: str = 'Software Developer') -> Dict[str, Any]:
        """Generate MCQ aptitude questions based on difficulty levels with exact counts using AI ONLY"""
        if not self.api_keys:
            logger.error("❌ No GROQ API key - cannot generate AI aptitude questions")
            return {
                'success': False,
                'questions': [{
                    'topic': 'error',
                    'question': 'ERROR: AI not able to generate content. Please configure GROQ API key.',
                    'options': {'A': 'ERROR', 'B': 'AI service', 'C': 'unavailable', 'D': 'configure API key'},
                    'correct_answer': 'A',
                    'difficulty': 'error',
                    'time_limit': 60,
                    'error': True
                }],
                'total_questions': 1,
                'metadata': {'generated_by': 'error', 'type': 'aptitude_error'}
            }
        
        try:
            # Calculate total questions
            total_questions = sum(level_info['count'] for level_info in difficulty_levels)
            difficulty_details = []
            
            for level_info in difficulty_levels:
                count = level_info['count']
                if count > 0:
                    difficulty_details.append(f"- {level_info['level'].upper()}: EXACTLY {count} questions")
            
            topics_str = ', '.join(topics) if topics else 'general aptitude'
            
            prompt = f"""Generate EXACTLY {total_questions} multiple choice questions for a {job_title} aptitude test.

TOPICS: {topics_str}

DIFFICULTY REQUIREMENTS (MUST BE EXACT):
{chr(10).join(difficulty_details)}

REQUIREMENTS:
- Each question must have exactly 4 options (A, B, C, D)
- Indicate the correct answer
- Questions should be relevant to {job_title} role
- Follow difficulty progression: easy → medium → hard
- Professional, clear language
- Practical, job-relevant scenarios

Return ONLY a JSON object in this exact format:
{{
  "questions": [
    {{
      "topic": "logical_reasoning",
      "question": "Question text here",
      "options": {{"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}},
      "correct_answer": "A",
      "difficulty": "easy",
      "explanation": "Brief explanation",
      "time_limit": {time_per_question}
    }}
  ],
  "total_questions": {total_questions},
  "metadata": {{"topics": "{topics_str}", "generated_by": "groq"}}
}}"""

            response = requests.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.get_current_api_key()}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are an expert aptitude test creator. Generate professional MCQ questions in valid JSON format only. Follow the exact count requirements."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 3000
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content'].strip()
                questions_data = json.loads(content)
                
                generated_count = len(questions_data.get('questions', []))
                if generated_count != total_questions:
                    logger.warning(f"⚠️ Expected {total_questions} questions but got {generated_count}")
                
                logger.info(f"✅ Generated {generated_count} aptitude questions")
                return {'success': True, **questions_data}
            else:
                logger.error(f"❌ GROQ API error: {response.status_code}")
                return {
                    'success': False,
                    'questions': [{
                        'topic': 'error',
                        'question': f'ERROR: AI generation failed. API returned status {response.status_code}',
                        'options': {'A': 'ERROR', 'B': 'AI failed', 'C': 'to generate', 'D': 'questions'},
                        'correct_answer': 'A',
                        'difficulty': 'error',
                        'time_limit': 60,
                        'error': True
                    }],
                    'total_questions': 1,
                    'metadata': {'generated_by': 'error', 'type': 'aptitude_api_error'}
                }
                
        except Exception as e:
            logger.error(f"❌ Error generating aptitude questions: {str(e)}")
            return {
                'success': False,
                'questions': [{
                    'topic': 'error',
                    'question': f'ERROR: AI generation error. {str(e)}',
                    'options': {'A': 'ERROR', 'B': 'AI error', 'C': 'occurred', 'D': 'during generation'},
                    'correct_answer': 'A',
                    'difficulty': 'error',
                    'time_limit': 60,
                    'error': True
                }],
                'total_questions': 1,
                'metadata': {'generated_by': 'error', 'type': 'aptitude_generation_error'}
            }

    def generate_aptitude_questions(self, topics: List[str] = None, questions_per_topic: int = 10, 
                                  difficulty: str = 'medium', job_title: str = 'Software Developer',
                                  topics_with_difficulty: List[Dict] = None) -> Dict[str, Any]:
        """Generate MCQ aptitude questions for specified topics with individual difficulties using AI ONLY"""
        if not self.api_keys:
            logger.error("❌ No GROQ API key - cannot generate AI aptitude questions")
            return {
                'success': False,
                'questions': [{
                    'topic': 'error',
                    'question': 'ERROR: AI not able to generate content. Please configure GROQ API key.',
                    'options': {'A': 'ERROR', 'B': 'AI service', 'C': 'unavailable', 'D': 'configure API key'},
                    'correct_answer': 'A',
                    'difficulty': 'error',
                    'time_limit': 60,
                    'error': True
                }],
                'total_questions': 1,
                'metadata': {'generated_by': 'error', 'type': 'aptitude_error'}
            }
        
        # Use topics_with_difficulty if provided, otherwise use legacy format
        if topics_with_difficulty:
            topic_details = []
            total_questions = 0
            
            for topic_info in topics_with_difficulty:
                topic_details.append(f"- {topic_info['topic']}: {topic_info['count']} questions at {topic_info['difficulty']} level")
                total_questions += topic_info['count']
            
            prompt = f"""Generate EXACTLY {total_questions} multiple choice questions for a {job_title} aptitude test.

Topic Requirements:
{chr(10).join(topic_details)}

REQUIREMENTS:
- Each question must have exactly 4 options (A, B, C, D)
- Indicate the correct answer
- Questions should be relevant to {job_title} role
- Follow specified difficulty for each topic
- Professional, clear language
- Practical, job-relevant scenarios

Return ONLY a JSON object in this exact format:
{{
  "questions": [
    {{
      "topic": "logical_reasoning",
      "question": "Question text here",
      "options": {{"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}},
      "correct_answer": "A",
      "difficulty": "easy",
      "explanation": "Brief explanation",
      "time_limit": 60
    }}
  ],
  "total_questions": {total_questions},
  "metadata": {{"generated_by": "groq"}}
}}"""
        else:
            # Legacy format
            topics = topics or ['logical_reasoning', 'quantitative_aptitude', 'verbal_ability']
            total_questions = len(topics) * questions_per_topic
            
            prompt = f"""Generate EXACTLY {total_questions} multiple choice questions for a {job_title} aptitude test.

TOPICS: {', '.join(topics)}
DIFFICULTY: {difficulty}
QUESTIONS PER TOPIC: {questions_per_topic}

REQUIREMENTS:
- Each question must have exactly 4 options (A, B, C, D)
- Indicate the correct answer
- Questions should be relevant to {job_title} role
- All questions at {difficulty} difficulty level
- Professional, clear language
- Practical, job-relevant scenarios

Return ONLY a JSON object in this exact format:
{{
  "questions": [
    {{
      "topic": "logical_reasoning",
      "question": "Question text here",
      "options": {{"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}},
      "correct_answer": "A",
      "difficulty": "{difficulty}",
      "explanation": "Brief explanation",
      "time_limit": 60
    }}
  ],
  "total_questions": {total_questions},
  "metadata": {{"generated_by": "groq"}}
}}"""

        try:
            response = requests.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.get_current_api_key()}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are an expert aptitude test creator. Generate professional MCQ questions in valid JSON format only."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 3000
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                questions_data = json.loads(content)
                
                logger.info(f"✅ Generated {len(questions_data.get('questions', []))} aptitude questions")
                return {'success': True, **questions_data}
            else:
                logger.error(f"❌ GROQ API error: {response.status_code}")
                return {
                    'success': False,
                    'questions': [{
                        'topic': 'error',
                        'question': f'ERROR: AI generation failed. API returned status {response.status_code}',
                        'options': {'A': 'ERROR', 'B': 'AI failed', 'C': 'to generate', 'D': 'questions'},
                        'correct_answer': 'A',
                        'difficulty': 'error',
                        'time_limit': 60,
                        'error': True
                    }],
                    'total_questions': 1,
                    'metadata': {'generated_by': 'error', 'type': 'aptitude_api_error'}
                }
                
        except Exception as e:
            logger.error(f"❌ Error generating aptitude questions: {str(e)}")
            return {
                'success': False,
                'questions': [{
                    'topic': 'error',
                    'question': f'ERROR: AI generation error. {str(e)}',
                    'options': {'A': 'ERROR', 'B': 'AI error', 'C': 'occurred', 'D': 'during generation'},
                    'correct_answer': 'A',
                    'difficulty': 'error',
                    'time_limit': 60,
                    'error': True
                }],
                'total_questions': 1,
                'metadata': {'generated_by': 'error', 'type': 'aptitude_generation_error'}
            }
