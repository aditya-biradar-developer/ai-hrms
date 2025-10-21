"""
ATS-Style Resume Screening Service
Advanced resume screening with keyword matching, skills analysis, and GROQ AI-powered evaluation
"""

import logging
import re
import os
import requests
import json
from typing import Dict, List, Any, Tuple
from collections import Counter

logger = logging.getLogger(__name__)

class ResumeScreeningService:
    def __init__(self, llm_service):
        self.llm = llm_service
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        self.groq_api_base = "https://api.groq.com/openai/v1"
        self.groq_model = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')
        
        if self.groq_api_key:
            logger.info("✅ ResumeScreeningService initialized with GROQ AI")
        else:
            logger.warning("⚠️ No GROQ API key, will use fallback LLM")
        
        # Comprehensive skill categories
        self.skill_database = {
            'programming': [
                'python', 'javascript', 'java', 'c++', 'c#', 'ruby', 'php', 'go', 'rust',
                'typescript', 'kotlin', 'swift', 'scala', 'r', 'matlab', 'perl'
            ],
            'web': [
                'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django',
                'flask', 'spring', 'asp.net', 'laravel', 'next.js', 'gatsby', 'svelte'
            ],
            'database': [
                'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'cassandra', 'oracle',
                'dynamodb', 'elasticsearch', 'neo4j', 'sqlite', 'mariadb'
            ],
            'cloud': [
                'aws', 'azure', 'gcp', 'google cloud', 'heroku', 'digitalocean',
                'ec2', 's3', 'lambda', 'cloudformation', 'terraform'
            ],
            'devops': [
                'docker', 'kubernetes', 'jenkins', 'gitlab ci', 'github actions',
                'ansible', 'chef', 'puppet', 'ci/cd', 'travis ci'
            ],
            'data_science': [
                'machine learning', 'deep learning', 'ai', 'data science', 'nlp',
                'computer vision', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas',
                'numpy', 'keras', 'spark', 'hadoop'
            ],
            'mobile': [
                'android', 'ios', 'react native', 'flutter', 'xamarin', 'swift',
                'kotlin', 'objective-c'
            ],
            'tools': [
                'git', 'github', 'gitlab', 'jira', 'confluence', 'slack', 'trello',
                'postman', 'swagger', 'figma', 'sketch'
            ],
            'methodologies': [
                'agile', 'scrum', 'kanban', 'waterfall', 'devops', 'tdd', 'bdd',
                'microservices', 'rest api', 'graphql', 'soap'
            ]
        }
        
        # Experience level keywords
        self.experience_keywords = {
            'senior': ['senior', 'lead', 'principal', 'architect', 'head of', 'director', 'manager'],
            'mid': ['mid-level', 'intermediate', 'engineer', 'developer', 'analyst'],
            'junior': ['junior', 'associate', 'entry-level', 'trainee', 'intern']
        }
        
        # Education keywords
        self.education_keywords = [
            'bachelor', 'master', 'phd', 'doctorate', 'mba', 'b.tech', 'm.tech',
            'b.e.', 'm.e.', 'b.sc', 'm.sc', 'computer science', 'engineering',
            'information technology', 'software engineering'
        ]
    
    def screen_resume_comprehensive(self, resume_text: str, job_description: str, 
                                   job_title: str = "") -> Dict[str, Any]:
        """
        Comprehensive ATS-style resume screening
        
        Args:
            resume_text: Full resume text
            job_description: Job description text
            job_title: Job title (optional)
            
        Returns:
            Detailed screening results with scores and analysis
        """
        logger.info("🔍 Starting comprehensive resume screening...")
        
        # 1. Extract and match skills
        resume_skills = self._extract_skills_comprehensive(resume_text)
        job_skills = self._extract_skills_comprehensive(job_description)
        skill_match = self._calculate_skill_match(resume_skills, job_skills)
        
        # 2. Keyword matching
        keyword_score = self._calculate_keyword_match(resume_text, job_description)
        
        # 3. Experience analysis
        experience_analysis = self._analyze_experience(resume_text, job_description)
        
        # 4. Education verification
        education_score = self._verify_education(resume_text, job_description)
        
        # 5. AI-powered deep analysis
        ai_analysis = self._ai_deep_analysis(resume_text, job_description, job_title)
        
        # 6. Calculate overall ATS score
        ats_score = self._calculate_ats_score(
            skill_match['score'],
            keyword_score,
            experience_analysis['score'],
            education_score,
            ai_analysis.get('score', 50)
        )
        
        # 7. Generate recommendation
        recommendation = self._generate_recommendation(ats_score, skill_match, experience_analysis)
        
        return {
            'ats_score': ats_score,
            'recommendation': recommendation,
            'skill_analysis': {
                'matched_skills': skill_match['matched'],
                'missing_skills': skill_match['missing'],
                'skill_match_percentage': skill_match['score'],
                'total_skills_found': len(resume_skills['all_skills'])
            },
            'keyword_match': {
                'score': keyword_score,
                'matched_keywords': self._get_matched_keywords(resume_text, job_description)
            },
            'experience_analysis': experience_analysis,
            'education_verification': {
                'score': education_score,
                'qualifications_found': self._extract_education(resume_text)
            },
            'ai_insights': ai_analysis,
            'strengths': self._identify_strengths(skill_match, experience_analysis, education_score),
            'gaps': self._identify_gaps(skill_match, experience_analysis, education_score),
            'interview_questions': self._generate_interview_questions(skill_match, job_description)
        }
    
    def _extract_skills_comprehensive(self, text: str) -> Dict[str, List[str]]:
        """Extract skills by category"""
        text_lower = text.lower()
        found_skills = {}
        all_skills = []
        
        for category, skills in self.skill_database.items():
            category_skills = []
            for skill in skills:
                # Check for whole word matches
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, text_lower):
                    category_skills.append(skill)
                    all_skills.append(skill)
            
            if category_skills:
                found_skills[category] = category_skills
        
        return {
            'by_category': found_skills,
            'all_skills': list(set(all_skills))
        }
    
    def _calculate_skill_match(self, resume_skills: Dict, job_skills: Dict) -> Dict[str, Any]:
        """Calculate skill match percentage"""
        resume_all = set(resume_skills['all_skills'])
        job_all = set(job_skills['all_skills'])
        
        if not job_all:
            return {'score': 100, 'matched': [], 'missing': []}
        
        matched = resume_all.intersection(job_all)
        missing = job_all - resume_all
        
        score = (len(matched) / len(job_all)) * 100 if job_all else 0
        
        return {
            'score': round(score, 2),
            'matched': list(matched),
            'missing': list(missing)
        }
    
    def _calculate_keyword_match(self, resume_text: str, job_description: str) -> float:
        """Calculate keyword density match"""
        # Extract important keywords from job description (nouns, verbs)
        job_words = re.findall(r'\b[a-z]{4,}\b', job_description.lower())
        resume_words = re.findall(r'\b[a-z]{4,}\b', resume_text.lower())
        
        # Remove common words
        stop_words = {'that', 'this', 'with', 'from', 'have', 'will', 'your', 'their',
                     'about', 'would', 'there', 'which', 'when', 'where', 'been'}
        
        job_keywords = [w for w in job_words if w not in stop_words]
        resume_keywords = set(resume_words)
        
        # Count matches
        job_keyword_counter = Counter(job_keywords)
        matches = sum(1 for keyword in job_keyword_counter if keyword in resume_keywords)
        
        score = (matches / len(set(job_keywords))) * 100 if job_keywords else 0
        return round(score, 2)
    
    def _analyze_experience(self, resume_text: str, job_description: str) -> Dict[str, Any]:
        """Analyze experience level and relevance"""
        resume_lower = resume_text.lower()
        job_lower = job_description.lower()
        
        # Extract years of experience
        resume_years = self._extract_years_of_experience(resume_text)
        required_years = self._extract_years_of_experience(job_description)
        
        # Determine experience level
        resume_level = self._determine_experience_level(resume_text)
        required_level = self._determine_experience_level(job_description)
        
        # Calculate experience score
        experience_score = 100
        
        if required_years > 0:
            if resume_years < required_years:
                experience_score = (resume_years / required_years) * 100
            elif resume_years > required_years * 2:
                experience_score = 90  # Overqualified
        
        return {
            'score': round(experience_score, 2),
            'years_found': resume_years,
            'years_required': required_years,
            'level': resume_level,
            'required_level': required_level,
            'match': resume_level == required_level or (resume_level == 'senior' and required_level == 'mid')
        }
    
    def _extract_years_of_experience(self, text: str) -> int:
        """Extract years of experience from text"""
        patterns = [
            r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience',
            r'experience\s*(?:of)?\s*(\d+)\+?\s*(?:years?|yrs?)',
            r'(\d+)\+?\s*(?:years?|yrs?)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                return int(match.group(1))
        
        return 0
    
    def _determine_experience_level(self, text: str) -> str:
        """Determine experience level from text"""
        text_lower = text.lower()
        
        for level, keywords in self.experience_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return level
        
        return 'mid'  # Default
    
    def _verify_education(self, resume_text: str, job_description: str) -> float:
        """Verify education requirements"""
        resume_lower = resume_text.lower()
        job_lower = job_description.lower()
        
        # Check if education is required
        education_required = any(keyword in job_lower for keyword in self.education_keywords)
        
        if not education_required:
            return 100  # No education requirement
        
        # Check if candidate has relevant education
        has_education = any(keyword in resume_lower for keyword in self.education_keywords)
        
        return 100 if has_education else 50
    
    def _extract_education(self, text: str) -> List[str]:
        """Extract education qualifications"""
        found = []
        text_lower = text.lower()
        
        for keyword in self.education_keywords:
            if keyword in text_lower:
                found.append(keyword.title())
        
        return list(set(found))
    
    def _ai_deep_analysis(self, resume_text: str, job_description: str, job_title: str) -> Dict[str, Any]:
        """AI-powered deep analysis using GROQ"""
        
        # Try GROQ first (fast and accurate!)
        if self.groq_api_key:
            try:
                logger.info(f"🚀 Analyzing resume with GROQ AI for: {job_title or 'position'}...")
                return self._groq_analysis(resume_text, job_description, job_title)
            except Exception as e:
                logger.warning(f"⚠️ GROQ failed: {str(e)}, trying fallback...")
        
        # Fallback to original LLM
        return self._llm_analysis(resume_text, job_description, job_title)
    
    def _groq_analysis(self, resume_text: str, job_description: str, job_title: str) -> Dict[str, Any]:
        """Fast analysis using GROQ AI"""
        
        prompt = f"""Analyze this resume for the position: {job_title or 'Not specified'}

JOB DESCRIPTION:
{job_description[:1500]}

CANDIDATE RESUME:
{resume_text[:2500]}

Provide analysis in this EXACT JSON format:
{{
  "match_score": <0-100>,
  "technical_fit": "<2-3 sentences>",
  "experience_relevance": "<2-3 sentences>",
  "cultural_fit": "<2-3 sentences>",
  "red_flags": "<list concerns or 'None identified'>",
  "hiring_recommendation": "<Strong Yes/Yes/Maybe/No>"
}}

Be objective and thorough. Focus on technical skills match, experience relevance, and overall fit."""
        
        try:
            response = requests.post(
                f"{self.groq_api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.groq_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert ATS recruiter analyzing resumes. Provide accurate, objective assessments."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000,
                    "response_format": {"type": "json_object"}
                },
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result['choices'][0]['message']['content']
                data = json.loads(ai_response)
                
                logger.info(f"✅ GROQ analysis complete: {data.get('match_score', 50)}/100")
                
                return {
                    'score': int(data.get('match_score', 50)),
                    'analysis': ai_response,
                    'technical_fit': data.get('technical_fit', 'N/A'),
                    'experience_relevance': data.get('experience_relevance', 'N/A'),
                    'cultural_fit': data.get('cultural_fit', 'N/A'),
                    'red_flags': data.get('red_flags', 'N/A'),
                    'hiring_recommendation': data.get('hiring_recommendation', 'Requires review')
                }
            else:
                logger.error(f"GROQ API error: {response.status_code}")
                raise Exception(f"GROQ returned {response.status_code}")
                
        except Exception as e:
            logger.error(f"GROQ analysis failed: {str(e)}")
            raise
    
    def _llm_analysis(self, resume_text: str, job_description: str, job_title: str) -> Dict[str, Any]:
        """Fallback analysis using original LLM"""
        prompt = f"""<s>[INST] You are an expert ATS analyzing a resume for: {job_title or 'Not specified'}

JOB DESCRIPTION:
{job_description[:1500]}

CANDIDATE RESUME:
{resume_text[:2500]}

Provide analysis in EXACT format:

MATCH SCORE: [0-100]
TECHNICAL FIT: [2-3 sentences]
EXPERIENCE RELEVANCE: [2-3 sentences]
CULTURAL FIT INDICATORS: [2-3 sentences]
RED FLAGS: [list or "None identified"]
HIRING RECOMMENDATION: [Strong Yes/Yes/Maybe/No]
[/INST]"""
        
        try:
            response = self.llm.generate(prompt, max_tokens=1000, temperature=0.3)
            
            return {
                'score': self._extract_score_from_ai(response),
                'analysis': response,
                'technical_fit': self._extract_section_content(response, 'TECHNICAL FIT'),
                'experience_relevance': self._extract_section_content(response, 'EXPERIENCE RELEVANCE'),
                'cultural_fit': self._extract_section_content(response, 'CULTURAL FIT'),
                'red_flags': self._extract_section_content(response, 'RED FLAGS'),
                'hiring_recommendation': self._extract_section_content(response, 'HIRING RECOMMENDATION')
            }
        except Exception as e:
            logger.error(f"LLM analysis error: {str(e)}")
            return {
                'score': 50,
                'analysis': 'AI analysis unavailable',
                'technical_fit': 'N/A',
                'experience_relevance': 'N/A',
                'cultural_fit': 'N/A',
                'red_flags': 'N/A',
                'hiring_recommendation': 'Requires manual review'
            }
    
    def _extract_score_from_ai(self, text: str) -> int:
        """Extract score from AI response"""
        patterns = [
            r'MATCH SCORE:\s*(\d+)',
            r'Score:\s*(\d+)',
            r'(\d+)/100',
            r'(\d+)%'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return min(max(int(match.group(1)), 0), 100)
        
        return 50
    
    def _extract_section_content(self, text: str, section_name: str) -> str:
        """Extract content from a specific section"""
        pattern = f"{section_name}:(.+?)(?=\\n[A-Z]{{2,}}:|$)"
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        
        if match:
            return match.group(1).strip()
        
        return "Not available"
    
    def _calculate_ats_score(self, skill_score: float, keyword_score: float,
                            experience_score: float, education_score: float,
                            ai_score: float) -> int:
        """Calculate weighted ATS score"""
        # Weights
        weights = {
            'skills': 0.35,
            'keywords': 0.20,
            'experience': 0.25,
            'education': 0.10,
            'ai': 0.10
        }
        
        total_score = (
            skill_score * weights['skills'] +
            keyword_score * weights['keywords'] +
            experience_score * weights['experience'] +
            education_score * weights['education'] +
            ai_score * weights['ai']
        )
        
        return round(total_score)
    
    def _generate_recommendation(self, ats_score: int, skill_match: Dict,
                                experience_analysis: Dict) -> str:
        """Generate hiring recommendation"""
        if ats_score >= 85:
            return "Highly Recommended"
        elif ats_score >= 70:
            return "Recommended"
        elif ats_score >= 55:
            return "Consider"
        elif ats_score >= 40:
            return "Weak Candidate"
        else:
            return "Not Recommended"
    
    def _identify_strengths(self, skill_match: Dict, experience_analysis: Dict,
                           education_score: float) -> List[str]:
        """Identify candidate strengths"""
        strengths = []
        
        if skill_match['score'] >= 70:
            strengths.append(f"Strong technical skills match ({len(skill_match['matched'])} key skills)")
        
        if experience_analysis['score'] >= 80:
            strengths.append(f"Relevant experience ({experience_analysis['years_found']} years)")
        
        if education_score == 100:
            strengths.append("Meets education requirements")
        
        if len(skill_match['matched']) > 10:
            strengths.append("Diverse technical skill set")
        
        return strengths if strengths else ["Candidate shows potential"]
    
    def _identify_gaps(self, skill_match: Dict, experience_analysis: Dict,
                      education_score: float) -> List[str]:
        """Identify candidate gaps"""
        gaps = []
        
        if skill_match['missing']:
            gaps.append(f"Missing {len(skill_match['missing'])} required skills: {', '.join(skill_match['missing'][:3])}")
        
        if experience_analysis['years_required'] > experience_analysis['years_found']:
            gap = experience_analysis['years_required'] - experience_analysis['years_found']
            gaps.append(f"Experience gap: {gap} years below requirement")
        
        if education_score < 100:
            gaps.append("Education requirements not fully met")
        
        if skill_match['score'] < 50:
            gaps.append("Significant technical skills gap")
        
        return gaps if gaps else ["No major gaps identified"]
    
    def _get_matched_keywords(self, resume_text: str, job_description: str) -> List[str]:
        """Get list of matched keywords"""
        job_words = set(re.findall(r'\b[a-z]{4,}\b', job_description.lower()))
        resume_words = set(re.findall(r'\b[a-z]{4,}\b', resume_text.lower()))
        
        stop_words = {'that', 'this', 'with', 'from', 'have', 'will', 'your', 'their'}
        
        matched = (job_words & resume_words) - stop_words
        return sorted(list(matched))[:20]  # Top 20 matches
    
    def _generate_interview_questions(self, skill_match: Dict, job_description: str) -> List[str]:
        """Generate relevant interview questions"""
        questions = []
        
        # Questions based on matched skills
        if skill_match['matched']:
            top_skills = skill_match['matched'][:3]
            for skill in top_skills:
                questions.append(f"Can you describe your experience with {skill}?")
        
        # Questions for missing skills
        if skill_match['missing']:
            questions.append(f"How would you approach learning {skill_match['missing'][0]}?")
        
        # General questions
        questions.extend([
            "Describe a challenging project you've worked on recently.",
            "How do you stay updated with industry trends?",
            "Tell me about a time you had to work under tight deadlines."
        ])
        
        return questions[:5]  # Return top 5 questions
