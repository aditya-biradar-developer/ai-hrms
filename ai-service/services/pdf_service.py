"""
PDF Question Extraction Service
Extracts interview questions from PDF documents using AI
"""
import PyPDF2
import io
import json
import logging
from typing import List, Dict, Any
from services.gemini_service import GeminiService
from services.huggingface_service import HuggingFaceService

logger = logging.getLogger(__name__)

class PDFQuestionExtractor:
    def __init__(self):
        self.gemini = GeminiService()
        self.huggingface = HuggingFaceService()  # Primary extraction method
    
    def extract_text_from_pdf(self, pdf_file) -> str:
        """Extract text content from PDF file"""
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            
            logger.info(f"📄 PDF has {len(pdf_reader.pages)} pages")
            
            for i, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
                    logger.info(f"  Page {i+1}: {len(page_text)} characters")
            
            logger.info(f"✅ Extracted {len(text)} characters total from PDF")
            logger.info(f"📝 Preview: {text[:200]}...")
            
            if len(text.strip()) < 50:
                raise Exception("PDF contains very little text. It might be image-based or empty.")
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"❌ Error extracting text from PDF: {e}")
            raise Exception(f"Failed to read PDF: {str(e)}")
    
    def parse_questions_with_ai(self, text: str, job_title: str = "", num_questions: int = 10) -> List[Dict[str, Any]]:
        """Use Gemini AI to extract and structure questions from text"""
        try:
            prompt = f"""
You are an expert at extracting interview questions from documents.

TASK: Extract ALL interview questions from the text below. These are REAL questions from a recruitment document.

JOB TITLE: {job_title or 'General Position'}

DOCUMENT TEXT:
{text}

INSTRUCTIONS:
1. Find EVERY question in the document (look for question marks, numbered lists, Q:, Question:, etc.)
2. Extract the EXACT question text as written in the document
3. For each question, determine:
   - type: "introduction" | "technical" | "behavioral" | "coding" | "general"
   - duration: 120-300 seconds based on complexity
   - If code is present, extract it exactly
   - If an expected answer is mentioned, extract it

OUTPUT FORMAT - ONLY JSON ARRAY (no markdown, no ```json, no explanation):
[
  {{
    "text": "EXACT question text from document",
    "type": "technical",
    "duration": 180,
    "code": "code snippet if present",
    "language": "javascript",
    "expected_answer": "expected answer if mentioned"
  }}
]

CRITICAL RULES:
- Extract ACTUAL questions from the document, NOT generic ones
- Use EXACT wording from the PDF
- If you see "1. Question about X" extract the actual question
- If no questions found, return []
- Return pure JSON only, no markdown formatting

Extract up to {num_questions} questions.
"""
            
            logger.info("🤖 Using AI to parse questions from PDF text...")
            logger.info(f"📤 Sending {len(text)} characters to AI for analysis")
            
            # Try Gemini FIRST (fast, reliable, already working!)
            response = ""
            
            if self.gemini and self.gemini.is_available():
                try:
                    logger.info("🚀 Using Gemini AI for FAST extraction...")
                    
                    # Simpler prompt for faster processing
                    simple_prompt = f"""Extract all interview questions from this text and return ONLY a JSON array.

TEXT:
{text}

Return format (pure JSON, no markdown):
[
  {{"text":"What is the difference between id and class in HTML?","type":"technical","duration":180}},
  {{"text":"What is the box model in CSS?","type":"technical","duration":180}}
]

Question types: technical, behavioral, general, or coding
Extract up to {num_questions} questions. Return ONLY the JSON array:"""

                    response = self.gemini.generate(simple_prompt, max_tokens=2000, temperature=0.2)
                    logger.info(f"✅ Gemini extraction complete ({len(response)} chars)")
                except Exception as e:
                    logger.error(f"Gemini failed: {e}")
                    response = ""
            
            # Fallback 1: Try Ollama if Gemini fails (optimized for speed)
            if not response or len(response.strip()) < 10:
                try:
                    logger.info("🔄 Gemini unavailable, trying Ollama llama3 (optimized)...")
                    import requests
                    
                    # Ultra-short prompt for faster processing
                    short_prompt = f"""Questions from PDF (return JSON only):

{text[:1500]}

Format:
[{{"text":"Q1","type":"technical","duration":180}},{{"text":"Q2","type":"general","duration":180}}]

JSON:"""

                    ollama_response = requests.post(
                        'http://localhost:11434/api/generate',
                        json={
                            'model': 'llama3:latest',
                            'prompt': short_prompt,
                            'stream': False,
                            'options': {
                                'temperature': 0.3,  # Higher temp = faster
                                'num_predict': 1000,  # Fewer tokens = faster
                                'top_k': 40,
                                'top_p': 0.9
                            }
                        },
                        timeout=45  # Shorter timeout
                    )
                    if ollama_response.status_code == 200:
                        response = ollama_response.json().get('response', '')
                        logger.info("✅ Ollama extraction complete")
                except Exception as e:
                    logger.error(f"Ollama failed: {e}")
                    response = ""
            
            logger.info("📥 Received response from AI")
            logger.info(f"Response length: {len(response)} characters")
            logger.info(f"Response preview: {response[:300]}...")
            
            if not response or len(response.strip()) < 10:
                raise Exception("Both Gemini and Ollama returned empty response")
            
            # Clean response - remove markdown if present
            response_text = response.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            logger.info(f"Cleaned response: {response_text[:300]}...")
            
            # Parse JSON - find the JSON array within the response
            try:
                questions = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON array from text
                start_bracket = response_text.find('[')
                end_bracket = response_text.rfind(']')
                
                if start_bracket >= 0 and end_bracket > start_bracket:
                    json_str = response_text[start_bracket:end_bracket + 1]
                    logger.info(f"Extracted JSON from position {start_bracket} to {end_bracket}")
                    questions = json.loads(json_str)
                else:
                    raise
            
            # Ensure all questions have required fields with defaults
            processed_questions = []
            for q in questions:
                if isinstance(q, dict) and 'text' in q and q['text']:
                    processed_questions.append({
                        'text': q.get('text', ''),
                        'type': q.get('type', 'general'),
                        'duration': q.get('duration', 180),
                        'code': q.get('code'),
                        'language': q.get('language'),
                        'expected_answer': q.get('expected_answer')
                    })
            
            logger.info(f"✅ Successfully extracted {len(processed_questions)} questions from PDF")
            if processed_questions:
                logger.info(f"First question: {processed_questions[0].get('text', 'N/A')[:100]}")
            
            return processed_questions
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse AI response as JSON: {e}")
            try:
                logger.error(f"Response was: {response_text[:500]}")
            except:
                logger.error("Response was unavailable")
            # Return fallback
            return self._create_fallback_questions(text[:1000], job_title)
            
        except Exception as e:
            logger.error(f"❌ Error parsing questions with AI: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return self._create_fallback_questions(text[:1000], job_title)
    
    def _create_fallback_questions(self, text_sample: str, job_title: str) -> List[Dict[str, Any]]:
        """Create basic fallback questions if AI parsing fails"""
        logger.warning("⚠️ Using fallback questions - AI parsing failed")
        
        return [
            {
                "text": f"Tell me about your experience relevant to {job_title or 'this position'}.",
                "type": "introduction",
                "duration": 180,
                "code": None,
                "language": None,
                "expected_answer": "Should discuss relevant experience and skills"
            },
            {
                "text": "What are your key strengths for this role?",
                "type": "general",
                "duration": 180,
                "code": None,
                "language": None,
                "expected_answer": "Should mention technical and soft skills"
            },
            {
                "text": "Describe a challenging project you've worked on.",
                "type": "behavioral",
                "duration": 240,
                "code": None,
                "language": None,
                "expected_answer": "Should use STAR method to describe situation, task, action, result"
            }
        ]
    
    def extract_questions_from_pdf(self, pdf_file, job_title: str = "", num_questions: int = 10) -> Dict[str, Any]:
        """
        Main method: Extract questions from PDF file
        
        Args:
            pdf_file: File object (from Flask request.files)
            job_title: Position title for context
            num_questions: Max number of questions to extract
            
        Returns:
            Dict with questions array and metadata
        """
        try:
            logger.info(f"📄 Starting PDF question extraction for {job_title}")
            
            # Extract text from PDF
            text = self.extract_text_from_pdf(pdf_file)
            
            if not text or len(text) < 50:
                raise Exception("PDF appears to be empty or unreadable")
            
            # Parse questions using AI
            questions = self.parse_questions_with_ai(text, job_title, num_questions)
            
            if not questions or len(questions) == 0:
                raise Exception("No questions could be extracted from the PDF")
            
            # Calculate total duration
            total_duration = sum(q.get('duration', 180) for q in questions)
            
            return {
                'success': True,
                'questions': questions,
                'total_questions': len(questions),
                'estimated_duration': total_duration // 60,  # in minutes
                'source': 'pdf_extraction',
                'extracted_text_preview': text[:500] + "..." if len(text) > 500 else text,
                'extracted_text_length': len(text)
            }
            
        except Exception as e:
            logger.error(f"❌ PDF extraction failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'questions': []
            }

# Global instance
pdf_extractor = PDFQuestionExtractor()
