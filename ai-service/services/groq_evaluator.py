"""
GROQ AI Evaluator - FASTEST and FREE
Ultra-fast evaluation using Groq's LPU inference
"""

import os
import requests
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class GroqEvaluator:
    """Ultra-fast AI evaluation using GROQ API"""
    
    def __init__(self):
        self.api_key = os.getenv('GROQ_API_KEY')
        self.api_base = "https://api.groq.com/openai/v1"
        # Use fastest model: llama-3.3-70b-versatile or mixtral-8x7b-32768
        self.model = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')
        
        if not self.api_key:
            logger.warning("⚠️ No GROQ_API_KEY found. Get free key at: https://console.groq.com/")
        else:
            logger.info(f"✅ GROQ evaluator initialized (Model: {self.model})")
    
    def evaluate_answer(self, question: str, answer: str, expected_answer: str = None) -> Dict[str, Any]:
        """
        Evaluate answer using GROQ (ultra-fast!)
        
        Speed: 200-500 tokens/sec (20x faster than OpenAI)
        """
        if not self.api_key:
            return self._fallback_evaluation(question, answer)
        
        try:
            # Create structured evaluation prompt
            prompt = self._create_evaluation_prompt(question, answer, expected_answer)
            
            logger.info(f"🚀 Calling GROQ API for evaluation...")
            
            # Call GROQ API with JSON mode for structured output
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
                            "content": """You are an expert technical interviewer. Evaluate answers accurately and provide structured feedback.

Output format (JSON):
{
  "score": <0-100>,
  "technical_accuracy": <0-100>,
  "completeness": <0-100>,
  "feedback": "<brief constructive feedback>"
}"""
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.2,  # Low temp for consistent evaluation
                    "max_tokens": 300,
                    "response_format": {"type": "json_object"}  # Force JSON output
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result['choices'][0]['message']['content']
                logger.info(f"✅ GROQ evaluation completed in {result.get('usage', {}).get('total_time', 0):.2f}s")
                return self._parse_json_response(ai_response, question, answer)
            else:
                logger.error(f"❌ GROQ API error: {response.status_code}")
                return self._fallback_evaluation(question, answer)
                
        except Exception as e:
            logger.error(f"❌ GROQ error: {str(e)}")
            return self._fallback_evaluation(question, answer)
    
    def _create_evaluation_prompt(self, question: str, answer: str, expected_answer: str = None) -> str:
        """Create evaluation prompt"""
        # Detect if this is a code output question
        is_code_output = any(keyword in question.lower() for keyword in [
            'output of', 'output is', 'what is output', 'what will be output',
            'console.log', 'print', 'return value', 'what does it print'
        ])
        
        prompt = f"""Evaluate this technical interview answer:

**Question:** {question}

**Candidate's Answer:** {answer}
"""
        
        if expected_answer:
            prompt += f"\n**Reference Answer:** {expected_answer}\n"
        
        if is_code_output:
            prompt += """

⚠️ **IMPORTANT**: This is a CODE OUTPUT question. Short answers like "hello", "10", "undefined" are VALID and CORRECT if they match the expected output.

For code output questions:
- If answer is correct (even if short): score = 90-100
- If partially correct: score = 60-80  
- If wrong: score = 0-40
- DO NOT penalize for brevity - code output IS supposed to be brief!
"""
        
        prompt += """
Provide:
1. **score** (0-100): Overall correctness
2. **technical_accuracy** (0-100): Technical correctness
3. **completeness** (0-100): Coverage of key concepts (for code output, completeness = correctness)
4. **feedback**: Brief, constructive feedback (1-2 sentences)

Respond ONLY with valid JSON.
"""
        
        return prompt
    
    def _parse_json_response(self, ai_response: str, question: str, answer: str) -> Dict[str, Any]:
        """Parse JSON response from GROQ"""
        try:
            # Parse JSON response
            data = json.loads(ai_response)
            
            score = int(data.get('score', 50))
            technical = int(data.get('technical_accuracy', score))
            completeness = int(data.get('completeness', score))
            feedback = data.get('feedback', 'Answer evaluated.')
            
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
                "communication": 75,  # Default
                "feedback": feedback
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON parse error: {str(e)}")
            # Try to extract scores from text
            return self._parse_text_fallback(ai_response, question, answer)
        except Exception as e:
            logger.error(f"❌ Parse error: {str(e)}")
            return self._fallback_evaluation(question, answer)
    
    def _parse_text_fallback(self, text: str, question: str, answer: str) -> Dict[str, Any]:
        """Fallback parser if JSON fails"""
        try:
            import re
            
            score_match = re.search(r'"score"[:\s]+(\d+)', text)
            tech_match = re.search(r'"technical_accuracy"[:\s]+(\d+)', text)
            comp_match = re.search(r'"completeness"[:\s]+(\d+)', text)
            feedback_match = re.search(r'"feedback"[:\s]+"([^"]+)"', text)
            
            score = int(score_match.group(1)) if score_match else 60
            technical = int(tech_match.group(1)) if tech_match else score
            completeness = int(comp_match.group(1)) if comp_match else score
            feedback = feedback_match.group(1) if feedback_match else "Answer evaluated."
            
            return {
                "question": question,
                "answer": answer[:200],
                "score": score,
                "max_score": 100,
                "technical_accuracy": technical,
                "completeness": completeness,
                "communication": 70,
                "feedback": f"✓ {feedback}" if score >= 75 else f"⚠ {feedback}"
            }
        except:
            return self._fallback_evaluation(question, answer)
    
    def _fallback_evaluation(self, question: str, answer: str) -> Dict[str, Any]:
        """Smart fallback evaluation"""
        from services.smart_keyword_evaluator import SmartKeywordEvaluator
        
        # Use smart keyword evaluator as fallback
        evaluator = SmartKeywordEvaluator()
        return evaluator.evaluate(question, answer)
    
    def evaluate_multiple(self, qa_pairs: List[Dict]) -> Dict[str, Any]:
        """Batch evaluate multiple Q&A pairs"""
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
