"""
Chat.z.ai Intelligent Evaluator
Uses AI to evaluate custom interview questions accurately
"""

import os
import requests
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class ChatZEvaluator:
    """AI-powered evaluation using chat.z.ai API"""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        # chat.z.ai uses OpenAI-compatible API
        # Default to OpenAI endpoint, but can be configured for chat.z.ai
        self.api_base = os.getenv('CHAT_API_BASE', 'https://api.openai.com/v1')
        self.model = os.getenv('CHAT_MODEL', 'gpt-3.5-turbo')
        
        if not self.api_key:
            logger.warning("⚠️ No OPENAI_API_KEY found. Falling back to keyword evaluation.")
        else:
            logger.info(f"✅ AI evaluator initialized with {self.api_base}")
    
    def evaluate_answer(self, question: str, answer: str, expected_answer: str = None) -> Dict[str, Any]:
        """
        Evaluate an answer using AI
        
        Args:
            question: The interview question
            answer: Candidate's answer
            expected_answer: Optional expected answer for reference
            
        Returns:
            Evaluation dict with score and feedback
        """
        if not self.api_key:
            return self._fallback_evaluation(question, answer)
        
        try:
            # Create evaluation prompt
            prompt = self._create_evaluation_prompt(question, answer, expected_answer)
            
            # Call chat.z.ai API
            logger.info(f"🔍 Calling chat.z.ai API: {self.api_base}")
            
            response = requests.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert technical interviewer. Evaluate candidate answers accurately and fairly. Provide scores from 0-100 and constructive feedback."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500
                },
                timeout=15
            )
            
            logger.info(f"📡 API Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result['choices'][0]['message']['content']
                return self._parse_ai_response(ai_response, question, answer)
            else:
                logger.error(f"API error: {response.status_code} - {response.text}")
                return self._fallback_evaluation(question, answer)
                
        except Exception as e:
            logger.error(f"Error calling chat.z.ai: {str(e)}")
            return self._fallback_evaluation(question, answer)
    
    def _create_evaluation_prompt(self, question: str, answer: str, expected_answer: str = None) -> str:
        """Create evaluation prompt for AI"""
        prompt = f"""Evaluate this interview answer:

**Question:** {question}

**Candidate's Answer:** {answer}
"""
        
        if expected_answer:
            prompt += f"\n**Expected Answer (Reference):** {expected_answer}\n"
        
        prompt += """
Please provide:
1. **Score** (0-100): Overall correctness
2. **Technical Accuracy** (0-100): How technically correct is the answer?
3. **Completeness** (0-100): Does it cover the key points?
4. **Feedback**: Brief constructive feedback (1-2 sentences)

Format your response EXACTLY as:
SCORE: [number]
TECHNICAL: [number]
COMPLETENESS: [number]
FEEDBACK: [your feedback here]
"""
        
        return prompt
    
    def _parse_ai_response(self, ai_response: str, question: str, answer: str) -> Dict[str, Any]:
        """Parse AI response into structured evaluation"""
        try:
            lines = ai_response.strip().split('\n')
            
            score = 50
            technical = 50
            completeness = 50
            feedback = "Answer evaluated."
            
            for line in lines:
                line = line.strip()
                if line.startswith('SCORE:'):
                    score = int(''.join(filter(str.isdigit, line.split(':')[1])))
                elif line.startswith('TECHNICAL:'):
                    technical = int(''.join(filter(str.isdigit, line.split(':')[1])))
                elif line.startswith('COMPLETENESS:'):
                    completeness = int(''.join(filter(str.isdigit, line.split(':')[1])))
                elif line.startswith('FEEDBACK:'):
                    feedback = ':'.join(line.split(':')[1:]).strip()
            
            # Add emoji based on score
            if score >= 85:
                feedback = f"✓ {feedback}"
            elif score >= 70:
                feedback = f"⚠ {feedback}"
            else:
                feedback = f"✗ {feedback}"
            
            return {
                "question": question,
                "answer": answer[:200],
                "score": score,
                "max_score": 100,
                "technical_accuracy": technical,
                "completeness": completeness,
                "communication": 75,  # Default for communication
                "feedback": feedback
            }
            
        except Exception as e:
            logger.error(f"Error parsing AI response: {str(e)}")
            return self._fallback_evaluation(question, answer)
    
    def _fallback_evaluation(self, question: str, answer: str) -> Dict[str, Any]:
        """Fallback evaluation when API fails"""
        length = len(answer)
        
        if length >= 100:
            score = 75
            feedback = "✓ Detailed answer. Ensure technical accuracy."
        elif length >= 50:
            score = 65
            feedback = "Good attempt. Could be more detailed."
        elif length >= 20:
            score = 50
            feedback = "Basic answer. Add more explanation."
        else:
            score = 30
            feedback = "Too brief. Provide more detail."
        
        return {
            "question": question,
            "answer": answer[:200],
            "score": score,
            "max_score": 100,
            "technical_accuracy": score,
            "completeness": score - 10,
            "communication": 70,
            "feedback": feedback
        }
    
    def evaluate_multiple(self, qa_pairs: List[Dict]) -> Dict[str, Any]:
        """Evaluate multiple Q&A pairs"""
        results = []
        total_score = 0
        total_technical = 0
        total_completeness = 0
        
        for qa in qa_pairs:
            evaluation = self.evaluate_answer(
                qa.get('question', ''),
                qa.get('answer', ''),
                qa.get('expected_answer')
            )
            results.append(evaluation)
            total_score += evaluation['score']
            total_technical += evaluation['technical_accuracy']
            total_completeness += evaluation['completeness']
        
        num_questions = len(qa_pairs)
        
        return {
            "results": results,
            "overall_score": total_score / num_questions if num_questions > 0 else 0,
            "technical_accuracy": total_technical / num_questions if num_questions > 0 else 0,
            "completeness": total_completeness / num_questions if num_questions > 0 else 0
        }
