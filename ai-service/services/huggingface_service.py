"""
HuggingFace Inference API Service
Fast, free inference for question extraction
Using reliable models that work on free tier
"""

import os
import logging
import json
import requests

logger = logging.getLogger(__name__)

class HuggingFaceService:
    def __init__(self):
        """Initialize HuggingFace Inference client"""
        self.api_key = os.getenv('HUGGINGFACE_API_KEY')
        
        # Use reliable model that works on free inference API
        self.model = "mistralai/Mistral-7B-Instruct-v0.1"  # v0.1 is more stable
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model}"
        
        self.headers = {}
        if self.api_key:
            self.headers = {"Authorization": f"Bearer {self.api_key}"}
            logger.info(f"✅ HuggingFace initialized with API key (model: {self.model})")
        else:
            logger.info(f"✅ HuggingFace initialized (free tier, model: {self.model})")
        
        self.available = True
    
    def is_available(self):
        """Check if service is available"""
        return self.available
    
    def extract_questions(self, text: str, num_questions: int = 20) -> list:
        """
        Extract interview questions from text using HuggingFace Inference API
        Fast and efficient for PDF question extraction
        """
        if not self.available:
            return []
        
        try:
            # Simple, direct prompt for Mistral model
            prompt = f"""<s>[INST] Extract all interview questions from this text and return ONLY a JSON array.

TEXT:
{text[:2000]}

Return format (pure JSON, no markdown, no explanation):
[
  {{"text":"What is the difference between id and class in HTML?","type":"technical","duration":180}},
  {{"text":"Explain the box model in CSS","type":"technical","duration":180}}
]

Question types: technical, behavioral, general, or coding
Extract up to {num_questions} questions.

Return the JSON array now: [/INST]"""

            logger.info(f"🤖 Using HuggingFace {self.model} for extraction...")
            
            # Call HuggingFace Inference API
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 2000,
                    "temperature": 0.1,
                    "return_full_text": False
                }
            }
            
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"❌ HuggingFace API error: {response.status_code} - {response.text}")
                return []
            
            result = response.json()
            
            # Extract generated text
            if isinstance(result, list) and len(result) > 0:
                generated_text = result[0].get('generated_text', '')
            elif isinstance(result, dict):
                generated_text = result.get('generated_text', '')
            else:
                generated_text = str(result)
            
            logger.info(f"📥 Received response from HuggingFace ({len(generated_text)} chars)")
            
            # Parse JSON from response
            generated_text = generated_text.strip()
            
            # Find JSON array in response
            start = generated_text.find('[')
            end = generated_text.rfind(']')
            
            if start >= 0 and end > start:
                json_str = generated_text[start:end + 1]
                questions = json.loads(json_str)
                
                # Validate and format questions
                formatted = []
                for q in questions:
                    if isinstance(q, dict) and 'text' in q and q['text']:
                        formatted.append({
                            'text': q.get('text', ''),
                            'type': q.get('type', 'general'),
                            'duration': q.get('duration', 180),
                            'code': q.get('code'),
                            'language': q.get('language'),
                            'expected_answer': q.get('expected_answer')
                        })
                
                logger.info(f"✅ Extracted {len(formatted)} questions via HuggingFace")
                return formatted
            
            logger.warning("⚠️ No JSON array found in HuggingFace response")
            return []
            
        except requests.exceptions.Timeout:
            logger.error("❌ HuggingFace request timeout")
            return []
        except Exception as e:
            logger.error(f"❌ HuggingFace extraction error: {e}")
            return []
    
    def generate(self, prompt: str, max_tokens: int = 1000, temperature: float = 0.7):
        """
        General text generation (for other use cases)
        """
        if not self.available:
            return ""
        
        try:
            payload = {
                "inputs": f"<s>[INST] {prompt} [/INST]",
                "parameters": {
                    "max_new_tokens": max_tokens,
                    "temperature": temperature,
                    "return_full_text": False
                }
            }
            
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    return result[0].get('generated_text', '').strip()
                elif isinstance(result, dict):
                    return result.get('generated_text', '').strip()
            
            return ""
        except Exception as e:
            logger.error(f"❌ HuggingFace generation error: {e}")
            return ""
