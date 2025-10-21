"""
Resume Service - AI-powered resume screening and ranking
"""

import logging
import re
from typing import Dict, List, Any, Optional
import PyPDF2
import docx
import io
from .resume_parser import ResumeParser

logger = logging.getLogger(__name__)

class ResumeService:
    def __init__(self, llm_service):
        self.llm = llm_service
        self.parser = ResumeParser()
    
    def parse_resume_file(self, file) -> Dict[str, Any]:
        """
        Parse resume file (PDF or DOCX) and extract text
        
        Args:
            file: File object from Flask request
            
        Returns:
            Dictionary with extracted text and metadata
        """
        filename = file.filename.lower()
        
        try:
            if filename.endswith('.pdf'):
                text = self._extract_pdf(file)
            elif filename.endswith('.docx') or filename.endswith('.doc'):
                text = self._extract_docx(file)
            else:
                raise ValueError("Unsupported file format. Please upload PDF or DOCX")
            
            # Extract basic info
            skills = self._extract_skills(text)
            email = self._extract_email(text)
            phone = self._extract_phone(text)
            
            return {
                'text': text,
                'skills': skills,
                'email': email,
                'phone': phone,
                'word_count': len(text.split())
            }
        except Exception as e:
            logger.error(f"Error parsing resume: {str(e)}")
            raise
    
    def _extract_pdf(self, file) -> str:
        """Extract text from PDF"""
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting PDF: {str(e)}")
            raise
    
    def _extract_docx(self, file) -> str:
        """Extract text from DOCX"""
        try:
            doc = docx.Document(io.BytesIO(file.read()))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting DOCX: {str(e)}")
            raise
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from resume text"""
        # Common tech skills (expand this list)
        skill_keywords = [
            'python', 'javascript', 'java', 'react', 'node', 'angular', 'vue',
            'sql', 'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'gcp',
            'docker', 'kubernetes', 'git', 'ci/cd', 'agile', 'scrum',
            'html', 'css', 'typescript', 'c++', 'c#', 'ruby', 'php',
            'machine learning', 'ai', 'data science', 'analytics'
        ]
        
        text_lower = text.lower()
        found_skills = []
        
        for skill in skill_keywords:
            if skill in text_lower:
                found_skills.append(skill.title())
        
        return list(set(found_skills))
    
    def _extract_email(self, text: str) -> str:
        """Extract email from text"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        matches = re.findall(email_pattern, text)
        return matches[0] if matches else ""
    
    def _extract_phone(self, text: str) -> str:
        """Extract phone number from text"""
        phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        matches = re.findall(phone_pattern, text)
        return matches[0] if matches else ""
    
    def screen_resume_from_url(self, resume_url: str, job_description: str) -> Dict[str, Any]:
        """
        Fetch resume from URL, parse it, and screen against job description
        
        Args:
            resume_url: URL to resume file (PDF or DOCX)
            job_description: Job description text
            
        Returns:
            Dictionary with match score, summary, and reasoning
        """
        logger.info(f"🔍 Screening resume from URL: {resume_url[:50]}...")
        
        # Parse resume from URL
        resume_text = self.parser.parse_from_url(resume_url)
        
        if not resume_text:
            logger.error("❌ Failed to extract text from resume")
            return {
                'match_score': 0,
                'analysis': 'Failed to parse resume file. File may be corrupted, password-protected, or image-based.',
                'recommendation': 'Cannot Evaluate',
                'strengths': 'N/A',
                'gaps': 'Unable to extract resume text'
            }
        
        # Clean the text
        resume_text = self.parser.clean_text(resume_text)
        logger.info(f"✅ Extracted {len(resume_text)} characters from resume")
        
        # Screen the resume
        return self.screen_resume(resume_text, job_description)
    
    def screen_resume(self, resume_text: str, job_description: str) -> Dict[str, Any]:
        """
        Screen resume against job description using AI
        
        Args:
            resume_text: Candidate's resume text
            job_description: Job description text
            
        Returns:
            Dictionary with match score, summary, and reasoning
        """
        prompt = f"""<s>[INST] You are a strict HR recruiter evaluating candidates. Analyze if this candidate's skills match the job requirements.

JOB REQUIREMENTS:
{job_description[:1000]}

CANDIDATE RESUME:
{resume_text[:2000]}

SCORING RULES:
- 90-100: Perfect match, all key skills present
- 70-89: Good match, most skills present
- 50-69: Partial match, some relevant skills
- 30-49: Weak match, few relevant skills
- 0-29: Poor match, wrong field/no relevant skills

Provide ONLY:
1. Match Score (0-100): [number only]
2. Key Strengths: [2-3 points]
3. Gaps: [2-3 points]
4. Recommendation: [Highly Recommended/Recommended/Consider/Not Recommended]

BE STRICT. If skills don't match the job, give LOW score. [/INST]"""
        
        response = self.llm.generate(prompt, max_tokens=800, temperature=0.5)
        
        # Parse response
        score = self._extract_score(response)
        
        return {
            'match_score': score,
            'analysis': response,
            'recommendation': self._extract_recommendation(response),
            'strengths': self._extract_section(response, 'Key Strengths'),
            'gaps': self._extract_section(response, 'Gaps/Concerns')
        }
    
    def rank_candidates(self, candidates: List[Dict], job_description: str) -> List[Dict]:
        """
        Rank multiple candidates against job description
        
        Args:
            candidates: List of {id, resume_text}
            job_description: Job description
            
        Returns:
            Sorted list of candidates with scores
        """
        results = []
        
        for candidate in candidates:
            try:
                screening = self.screen_resume(
                    candidate.get('resume_text', ''),
                    job_description
                )
                
                results.append({
                    'candidate_id': candidate.get('id'),
                    'name': candidate.get('name', 'Unknown'),
                    'match_score': screening['match_score'],
                    'recommendation': screening['recommendation'],
                    'analysis': screening['analysis']
                })
            except Exception as e:
                logger.error(f"Error screening candidate {candidate.get('id')}: {str(e)}")
                results.append({
                    'candidate_id': candidate.get('id'),
                    'name': candidate.get('name', 'Unknown'),
                    'match_score': 0,
                    'recommendation': 'Error',
                    'analysis': f'Error: {str(e)}'
                })
        
        # Sort by match score (descending)
        results.sort(key=lambda x: x['match_score'], reverse=True)
        
        return results
    
    def _extract_score(self, text: str) -> int:
        """Extract match score from AI response"""
        # Look for patterns like "Score: 85" or "85%" or "Match Score (0-100): 85"
        patterns = [
            r'Match Score.*?(\d+)',
            r'Score.*?(\d+)',
            r'(\d+)%',
            r'(\d+)/100'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                score = int(match.group(1))
                return min(max(score, 0), 100)  # Clamp between 0-100
        
        return 50  # Default score if not found
    
    def _extract_recommendation(self, text: str) -> str:
        """Extract recommendation from AI response"""
        recommendations = ['Highly Recommended', 'Recommended', 'Consider', 'Not Recommended']
        
        for rec in recommendations:
            if rec.lower() in text.lower():
                return rec
        
        return 'Consider'
    
    def _extract_section(self, text: str, section_name: str) -> str:
        """Extract a specific section from AI response"""
        pattern = f"{section_name}:(.+?)(?=\\n\\d+\\.|$)"
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        
        if match:
            return match.group(1).strip()
        
        return ""
