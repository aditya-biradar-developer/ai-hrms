"""
GROQ Question Generator - FREE and ULTRA-FAST
Generate interview questions using GROQ's lightning-fast LPU inference
Get free API key: https://console.groq.com/
"""

import os
import requests
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class GroqQuestionGenerator:
    """Ultra-fast question generation using GROQ API"""
    
    def __init__(self):
        self.api_key = os.getenv('GROQ_API_KEY')
        self.api_base = "https://api.groq.com/openai/v1"
        # Use fastest model for question generation
        self.model = os.getenv('GROQ_MODEL', 'llama-3.1-70b-versatile')
        
        if not self.api_key:
            logger.warning("⚠️ No GROQ_API_KEY found. Get free key at: https://console.groq.com/")
        else:
            logger.info(f"✅ GROQ Question Generator initialized (Model: {self.model})")

    def generate_structured_communication_assessment(self, reading_config: Dict, listening_config: Dict, 
                                                   grammar_config: Dict, skills: List[str], 
                                                   time_limit: int = 30, job_title: str = 'Software Developer') -> Dict[str, Any]:
        """Generate structured communication assessment with reading, listening, and grammar"""
        if not self.api_key:
            return self._get_fallback_structured_communication(reading_config, listening_config, grammar_config, skills)
        
        try:
            questions = []
            
            # Generate Reading Questions
            if 'reading' in skills and reading_config:
                reading_questions = self._generate_reading_questions(reading_config, job_title)
                questions.extend(reading_questions)
            
            # Generate Listening Questions
            if 'listening' in skills and listening_config:
                listening_questions = self._generate_listening_questions(listening_config, job_title)
                questions.extend(listening_questions)
            
            # Generate Grammar Questions
            if 'grammar' in skills and grammar_config:
                grammar_questions = self._generate_grammar_questions(grammar_config, job_title)
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
        
        if not self.api_key:
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
                            "Authorization": f"Bearer {self.api_key}",
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
                        
                        logger.info(f"✅ AI generated {len(passages)} unique {difficulty} reading passages")
                    else:
                        logger.error(f"❌ AI generation failed for {difficulty} reading: {response.status_code}")
                        # Show error message instead of fallback
                        for i in range(count):
                            questions.append({
                                'title': f'AI Generation Failed - {difficulty.title()} Reading',
                                'content': 'AI service failed to generate content',
                                'passage': f'ERROR: AI not able to generate {difficulty} reading content. API returned status {response.status_code}',
                                'skill': 'reading',
                                'type': 'error',
                                'difficulty': difficulty,
                                'time_limit': 60,
                                'error': True
                            })
                        
                except Exception as e:
                    logger.error(f"❌ Error in AI reading generation: {str(e)}")
                    # Show error message instead of fallback
                    for i in range(count):
                        questions.append({
                            'title': f'AI Generation Error - {difficulty.title()} Reading',
                            'content': 'AI service encountered an error',
                            'passage': f'ERROR: AI not able to generate {difficulty} reading content. Error: {str(e)}',
                            'skill': 'reading',
                            'type': 'error',
                            'difficulty': difficulty,
                            'time_limit': 60,
                            'error': True
                        })
        
        return questions

    def _generate_listening_questions(self, listening_config: Dict, job_title: str) -> List[Dict]:
        """Generate listening assessment questions using AI ONLY - no fallback templates"""
        
        if not self.api_key:
            logger.error("❌ No GROQ API key - cannot generate AI listening questions")
            return [{
                'title': 'AI Generation Error',
                'content': 'AI service unavailable - no GROQ API key configured',
                'audio_text': 'ERROR: AI not able to generate content. Please configure GROQ API key.',
                'skill': 'listening',
                'type': 'error',
                'difficulty': 'error',
                'time_limit': 60,
                'error': True
            }]
        
        # Use ONLY AI generation - no templates
        return self._ai_generate_listening_questions(listening_config, job_title)

    def _ai_generate_listening_questions(self, listening_config: Dict, job_title: str) -> List[Dict]:
        """Generate listening questions using AI instead of templates"""
        questions = []
        
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
                            "Authorization": f"Bearer {self.api_key}",
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
                        
                        logger.info(f"✅ AI generated {len(sentences)} unique {difficulty} listening sentences")
                    else:
                        logger.error(f"❌ AI generation failed for {difficulty} listening: {response.status_code}")
                        # Show error message instead of fallback
                        for i in range(count):
                            questions.append({
                                'title': f'AI Generation Failed - {difficulty.title()} Listening',
                                'content': 'AI service failed to generate content',
                                'audio_text': f'ERROR: AI not able to generate {difficulty} listening content. API returned status {response.status_code}',
                                'skill': 'listening',
                                'type': 'error',
                                'difficulty': difficulty,
                                'time_limit': 60,
                                'error': True
                            })
                        
                except Exception as e:
                    logger.error(f"❌ Error in AI listening generation: {str(e)}")
                    # Show error message instead of fallback
                    for i in range(count):
                        questions.append({
                            'title': f'AI Generation Error - {difficulty.title()} Listening',
                            'content': 'AI service encountered an error',
                            'audio_text': f'ERROR: AI not able to generate {difficulty} listening content. Error: {str(e)}',
                            'skill': 'listening',
                            'type': 'error',
                            'difficulty': difficulty,
                            'time_limit': 60,
                            'error': True
                        })
        
        return questions

    def _generate_grammar_questions(self, grammar_config: Dict, job_title: str) -> List[Dict]:
        """Generate grammar assessment questions using AI ONLY - no fallback templates"""
        
        topics = grammar_config.get('topics', [])
        topic_questions = grammar_config.get('topicQuestions', {})
        
        logger.info(f"🔍 Grammar config received: {grammar_config}")
        logger.info(f"📝 Topics: {topics}")
        logger.info(f"📊 Topic questions: {topic_questions}")
        
        if not self.api_key:
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
                                "Authorization": f"Bearer {self.api_key}",
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
                            
                            logger.info(f"✅ AI generated {len(ai_questions)} unique {difficulty} {topic} questions")
                        else:
                            logger.error(f"❌ AI generation failed for {difficulty} {topic}: {response.status_code}")
                            # Show error message instead of fallback
                            for i in range(count):
                                questions.append({
                                    'title': f'AI Generation Failed - {difficulty.title()} {topic.title()}',
                                    'content': 'AI service failed to generate content',
                                    'options': {'A': 'ERROR', 'B': 'AI failed', 'C': 'to generate', 'D': 'content'},
                                    'correct_answer': 'A',
                                    'skill': 'grammar',
                                    'type': 'error',
                                    'topic': topic,
                                    'difficulty': difficulty,
                                    'time_limit': 60,
                                    'error': True
                                })
                            
                    except Exception as e:
                        logger.error(f"❌ Error in AI grammar generation: {str(e)}")
                        # Show error message instead of fallback
                        for i in range(count):
                            questions.append({
                                'title': f'AI Generation Error - {difficulty.title()} {topic.title()}',
                                'content': 'AI service encountered an error',
                                'options': {'A': 'ERROR', 'B': 'AI error', 'C': 'occurred', 'D': 'during generation'},
                                'correct_answer': 'A',
                                'skill': 'grammar',
                                'type': 'error',
                                'topic': topic,
                                'difficulty': difficulty,
                                'time_limit': 60,
                                'error': True
                            })
        
        return questions

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
                                            time_per_question: int = 60, job_title: str = 'Software Developer', 
                                            application_id: str = None) -> Dict[str, Any]:
        """Generate MCQ aptitude questions with per-topic difficulty configuration using AI ONLY - SINGLE BATCH APPROACH"""
        try:
            if not self.api_key:
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

            # Calculate target total from topic configs
            target_total = sum(tc['total'] for tc in topic_configs)
            
            # Check existing questions if application_id provided
            existing_count = 0
            if application_id:
                try:
                    # Check existing questions in database
                    backend_url = "http://localhost:3000"
                    response = requests.get(f"{backend_url}/api/applications/{application_id}/questions", 
                                          params={'type': 'aptitude'})
                    if response.status_code == 200:
                        existing_questions = response.json().get('questions', [])
                        existing_count = len(existing_questions)
                        logger.info(f"📊 Found {existing_count} existing aptitude questions")
                    else:
                        logger.warning(f"⚠️ Could not fetch existing questions: HTTP {response.status_code}")
                except Exception as e:
                    logger.warning(f"⚠️ Could not check existing questions: {str(e)}")
            
            remaining_needed = target_total - existing_count
            
            if remaining_needed <= 0:
                logger.info(f"✅ Target already reached! {existing_count}/{target_total} questions exist")
                return {
                    'success': True,
                    'questions': [],
                    'total_questions': 0,
                    'existing_count': existing_count,
                    'target_total': target_total,
                    'current_total': existing_count,
                    'remaining_needed': 0,
                    'progress_percentage': 100.0,
                    'is_complete': True,
                    'status_message': f"🎉 TARGET REACHED! Created {existing_count}/{target_total} questions (100%)",
                    'user_guidance': "All questions generated successfully. Ready for assessment!",
                    'message': f'🎉 TARGET REACHED! All {existing_count}/{target_total} questions already exist. Ready for assessment!',
                    'metadata': {'generated_by': 'incremental_check', 'type': 'target_reached'}
                }

            # Calculate how many questions to generate this batch (max 12 per batch for reliability)
            batch_limit = 12
            questions_to_generate = min(remaining_needed, batch_limit)
            
            logger.info(f"🎯 INCREMENTAL GENERATION: Target={target_total}, Existing={existing_count}, Need={remaining_needed}, Generating={questions_to_generate}")
            
            # Distribute questions across topics for this batch
            questions_per_topic = questions_to_generate // len(topic_configs)
            extra_questions = questions_to_generate % len(topic_configs)
            
            # Create adjusted configs for this batch only
            batch_config = []
            for i, topic_config in enumerate(topic_configs):
                base_questions = questions_per_topic
                if i < extra_questions:
                    base_questions += 1
                    
                if base_questions > 0:
                    # Distribute across difficulties proportionally
                    total_target = topic_config['easy'] + topic_config['medium'] + topic_config['hard']
                    if total_target > 0:
                        easy_ratio = topic_config['easy'] / total_target
                        medium_ratio = topic_config['medium'] / total_target
                        hard_ratio = topic_config['hard'] / total_target
                        
                        easy_count = max(1, round(base_questions * easy_ratio)) if easy_ratio > 0 else 0
                        medium_count = max(1, round(base_questions * medium_ratio)) if medium_ratio > 0 else 0
                        hard_count = max(1, round(base_questions * hard_ratio)) if hard_ratio > 0 else 0
                        
                        # Adjust to match exact count
                        total_assigned = easy_count + medium_count + hard_count
                        if total_assigned != base_questions:
                            diff = base_questions - total_assigned
                            if diff > 0:
                                easy_count += diff
                            elif diff < 0:
                                easy_count = max(0, easy_count + diff)
                        
                        batch_config.append({
                            'topic': topic_config['topic'],
                            'easy': easy_count,
                            'medium': medium_count,
                            'hard': hard_count,
                            'total': easy_count + medium_count + hard_count
                        })
            
            total_batch_questions = sum(config['total'] for config in batch_config)
            logger.info(f"📦 SINGLE BATCH: Generating {total_batch_questions} questions across {len(batch_config)} topics in ONE API call")
            
            # Build detailed prompt for single API call
            topic_details = []
            for tc in batch_config:
                details = []
                for diff in ['easy', 'medium', 'hard']:
                    count = tc.get(diff, 0)
                    if count > 0:
                        details.append(f"{count} {diff}")
                topic_details.append(f"- {tc['topic'].replace('_', ' ').upper()}: {', '.join(details)} (Total: {tc['total']})")

            prompt = f"""Generate exactly {total_batch_questions} multiple choice aptitude questions for a {job_title} position.

TOPICS AND DIFFICULTY BREAKDOWN:
{chr(10).join(topic_details)}

REQUIREMENTS:
1. Each question must have exactly 4 options (A, B, C, D)
2. Include correct_answer, difficulty, explanation, and time_limit
3. Questions must be job-relevant and professional
4. IMPORTANT: Distribute correct answers evenly across A, B, C, D (avoid bias toward any single option)
5. Return ONLY valid JSON in this exact format:

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

Generate exactly {total_batch_questions} questions following the topic and difficulty distribution above."""

            # Make single API call with retry logic
            max_retries = 3
            retry_count = 0
            response = None
            all_questions = []
            
            while retry_count < max_retries:
                try:
                    response = requests.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": self.model,
                            "messages": [
                                {"role": "system", "content": "You are an expert aptitude test creator. Generate professional MCQ questions in valid JSON format only. Follow the exact count and difficulty requirements for each topic."},
                                {"role": "user", "content": prompt}
                            ],
                            "temperature": 0.7,
                            "max_tokens": 4000  # Increased for larger batch
                        },
                        timeout=60
                    )
                    
                    # If successful or not rate limited, break out of retry loop
                    if response.status_code != 429:
                        break
                        
                except requests.exceptions.RequestException as e:
                    logger.error(f"❌ API request exception: {str(e)}")
                    retry_count += 1
                    if retry_count < max_retries:
                        wait_time = 2 ** retry_count  # Exponential backoff: 2, 4, 8 seconds
                        logger.info(f"⏳ Retrying in {wait_time} seconds... (attempt {retry_count + 1}/{max_retries})")
                        import time
                        time.sleep(wait_time)
                    continue
                
                # Handle rate limiting with exponential backoff
                if response.status_code == 429:
                    retry_count += 1
                    if retry_count < max_retries:
                        wait_time = 5 * (2 ** retry_count)  # 10, 20, 40 seconds for rate limits
                        logger.warning(f"❌ RATE LIMITED - Retrying in {wait_time} seconds... (attempt {retry_count + 1}/{max_retries})")
                        import time
                        time.sleep(wait_time)
                    else:
                        logger.error(f"❌ RATE LIMITED - Max retries exceeded")
                        break
                else:
                    break
            
            # Process response if we have one
            if response and response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content'].strip()
                
                logger.info(f"🔍 API response length: {len(content)} characters")

                if not content:
                    logger.error(f"❌ AI returned empty content")
                    return {'success': False, 'message': 'AI returned empty content'}

                # Clean markdown code blocks from GROQ response
                if content.startswith('```'):
                    content = content.split('\n', 1)[1] if '\n' in content else content[3:]
                if content.endswith('```'):
                    content = content.rsplit('\n```', 1)[0] if '\n```' in content else content[:-3]

                content = content.strip()

                try:
                    batch_data = json.loads(content)
                    all_questions = batch_data.get('questions', [])
                    logger.info(f"✅ Generated {len(all_questions)} questions successfully")
                    
                except json.JSONDecodeError as e:
                    logger.error(f"❌ JSON parsing error: {str(e)}")
                    logger.error(f"❌ Content length: {len(content)} characters")
                    return {'success': False, 'message': f'JSON parsing error: {str(e)}'}
                    
            elif response:
                if response.status_code == 429:
                    logger.error(f"❌ RATE LIMITED (429) - GROQ API limit reached")
                    return {'success': False, 'message': 'Rate limited by GROQ API. Please try again in a few minutes.'}
                else:
                    logger.error(f"❌ API error: {response.status_code}")
                    return {'success': False, 'message': f'API error: {response.status_code}'}
            else:
                logger.error(f"❌ No response received")
                return {'success': False, 'message': 'No response from API'}

            # Return results with progress information
            if all_questions:
                new_total = existing_count + len(all_questions)
                remaining_after = max(0, target_total - new_total)
                progress_percentage = round((new_total / target_total) * 100, 1)
                
                # Create user-friendly message
                if remaining_after == 0:
                    status_message = f"🎉 TARGET REACHED! Created {new_total}/{target_total} questions (100%)"
                    user_guidance = "All questions generated successfully. Ready for assessment!"
                    is_complete = True
                else:
                    status_message = f"📈 PROGRESS: Created {new_total}/{target_total} questions ({progress_percentage}%)"
                    user_guidance = f"Click 'Generate Questions' again to create {remaining_after} more questions and reach your target."
                    is_complete = False
                
                logger.info(f"🎉 Successfully generated {len(all_questions)} new aptitude questions. Progress: {new_total}/{target_total}")
                
                return {
                    'success': True,
                    'questions': all_questions,
                    'total_questions': len(all_questions),
                    'existing_count': existing_count,
                    'target_total': target_total,
                    'current_total': new_total,
                    'remaining_needed': remaining_after,
                    'progress_percentage': progress_percentage,
                    'is_complete': is_complete,
                    'status_message': status_message,
                    'user_guidance': user_guidance,
                    'message': f'Generated {len(all_questions)} questions successfully',
                    'metadata': {'generated_by': 'groq_api', 'batch_size': len(all_questions)}
                }
            else:
                logger.error("❌ No questions generated from API call")
                return {'success': False, 'message': 'No questions generated'}
                
        except Exception as e:
            logger.error(f"❌ Exception in generate_aptitude_questions_by_topic: {str(e)}")
            return {'success': False, 'message': f'Error: {str(e)}'}

    def generate_aptitude_questions_by_difficulty(self, topics: List[str], difficulty_levels: List[Dict], 
                                                  time_per_question: int = 60, job_title: str = 'Software Developer') -> Dict[str, Any]:
        """Generate MCQ aptitude questions based on difficulty levels with exact counts using AI ONLY"""
        if not self.api_key:
            logger.error("❌ No GROQ API key - cannot generate AI aptitude questions")
            return {
                'success': False,
                'questions': [],
                'total_questions': 0,
                'metadata': {'generated_by': 'error', 'type': 'aptitude_error'}
            }
        
        # This method is not implemented yet - using the new incremental approach instead
        logger.info("⚠️ Using generate_aptitude_questions_by_topic method instead")
        return self.generate_aptitude_questions_by_topic(
            topic_configs=[{'topic': topic, 'easy': 3, 'medium': 4, 'hard': 3, 'total': 10} for topic in topics],
            time_per_question=time_per_question,
            job_title=job_title
        )

    def generate_aptitude_questions(self, topics: List[str] = None, questions_per_topic: int = 10, 
                                  difficulty: str = 'medium', job_title: str = 'Software Developer',
                                  topics_with_difficulty: List[Dict] = None) -> Dict[str, Any]:
        """Generate MCQ aptitude questions for specified topics with individual difficulties using AI ONLY"""
        # This method delegates to the new incremental approach
        if topics_with_difficulty:
            topic_configs = []
            for topic_data in topics_with_difficulty:
                topic_configs.append({
                    'topic': topic_data.get('topic', 'general'),
                    'easy': topic_data.get('easy', 3),
                    'medium': topic_data.get('medium', 4),
                    'hard': topic_data.get('hard', 3),
                    'total': topic_data.get('easy', 3) + topic_data.get('medium', 4) + topic_data.get('hard', 3)
                })
        else:
            # Convert simple topics list to topic configs
            topic_configs = []
            if topics:
                for topic in topics:
                    topic_configs.append({
                        'topic': topic,
                        'easy': questions_per_topic // 3,
                        'medium': questions_per_topic // 3,
                        'hard': questions_per_topic - (2 * (questions_per_topic // 3)),
                        'total': questions_per_topic
                    })
        
        return self.generate_aptitude_questions_by_topic(
            topic_configs=topic_configs,
            time_per_question=60,
            job_title=job_title
        )
