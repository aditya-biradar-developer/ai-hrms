import json
import requests
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class GroqQuestionGenerator:
    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        self.api_key = api_key
        self.model = model
        logger.info(f"✅ GROQ Question Generator initialized (Model: {model})")

    def generate_aptitude_questions_incremental(self, topic_configs: List[Dict], job_title: str = "Software Developer", time_per_question: int = 60, application_id: str = None) -> Dict[str, Any]:
        """
        Generate aptitude questions incrementally - one batch at a time to avoid rate limits
        """
        try:
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
            logger.error(f"❌ Exception in generate_aptitude_questions_incremental: {str(e)}")
            return {'success': False, 'message': f'Error: {str(e)}'}
