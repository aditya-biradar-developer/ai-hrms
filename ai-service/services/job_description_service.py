"""
Job Description Service - AI-generated job descriptions using GROQ
"""

import logging
import os
import requests
import json
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class JobDescriptionService:
    def __init__(self, llm_service):
        self.llm = llm_service
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        self.groq_api_base = "https://api.groq.com/openai/v1"
        self.groq_model = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')
        
        if self.groq_api_key:
            logger.info("✅ JobDescriptionService initialized with GROQ AI")
        else:
            logger.warning("⚠️ No GROQ API key, will use templates")
    
    def generate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate job description from title and requirements
        
        Args:
            data: {
                title: str,
                skills: List[str],
                department: str,
                experience_level: str (entry/mid/senior),
                employment_type: str (full-time/part-time/contract)
            }
            
        Returns:
            Generated job description with sections
        """
        title = data.get('title', 'Position')
        skills = data.get('skills', [])
        department = data.get('department', 'General')
        experience_level = data.get('experience_level', 'mid')
        employment_type = data.get('employment_type', 'full-time')
        
        skills_str = ", ".join(skills) if skills else "relevant technical skills"
        
        # Try GROQ AI first for accurate, role-specific JDs
        if self.groq_api_key:
            try:
                logger.info(f"🚀 Generating JD for '{title}' using GROQ AI...")
                response = self._generate_with_groq(title, department, experience_level, employment_type, skills_str)
                logger.info(f"✅ GROQ-generated JD for {title}")
            except Exception as e:
                logger.error(f"❌ GROQ failed: {str(e)}, falling back to template")
                response = self._generate_template_based(title, department, experience_level, employment_type, skills_str)
        else:
            # Fallback to template
            response = self._generate_template_based(title, department, experience_level, employment_type, skills_str)
            logger.info(f"✅ Generated job description for {title} using template")
        
        # Parse sections
        sections = self._parse_sections(response)
        
        return {
            'title': title,
            'department': department,
            'experience_level': experience_level,
            'employment_type': employment_type,
            'full_description': response,
            'sections': sections
        }
    
    def _generate_with_groq(self, title: str, department: str, 
                           experience_level: str, employment_type: str, 
                           skills: str) -> str:
        """Generate job description using GROQ AI"""
        
        prompt = f"""Generate a professional job description for the position: {title}

Requirements:
- Department: {department}
- Experience Level: {experience_level}
- Employment Type: {employment_type}
- Key Skills: {skills}

Format the job description EXACTLY as follows (use the exact format with separators):

{title.upper()}

Department: {department}
Employment Type: {employment_type.title()}
Experience Level: {experience_level.title()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABOUT THE ROLE

[Write 2-3 sentences about the role and opportunity]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY RESPONSIBILITIES

[List 6-8 numbered responsibilities specific to this role]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED QUALIFICATIONS

[List 6-8 numbered qualifications]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PREFERRED QUALIFICATIONS

[List 3-4 bullet points with • prefix]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT WE OFFER

• Competitive salary and equity package
• Flexible work arrangements and remote options
• Professional development and learning opportunities
• Health insurance and wellness programs
• Collaborative and innovative work environment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOW TO APPLY

Submit your resume and portfolio showcasing your best work. We look forward to hearing from you!

IMPORTANT: 
- Make responsibilities and qualifications SPECIFIC to {title} role
- Use technical terms and tools relevant to this field
- Be professional and concise
- Follow the exact format above with separators
"""
        
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
                            "content": "You are an expert HR professional and technical recruiter. Generate accurate, role-specific job descriptions."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1500
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                jd_text = result['choices'][0]['message']['content'].strip()
                return jd_text
            else:
                logger.error(f"GROQ API error: {response.status_code}")
                raise Exception(f"GROQ API returned {response.status_code}")
                
        except Exception as e:
            logger.error(f"GROQ generation failed: {str(e)}")
            raise
    
    def _generate_template_based(self, title: str, department: str, 
                                  experience_level: str, employment_type: str, 
                                  skills: str) -> str:
        """Generate job description using templates for consistent quality"""
        
        # Role-specific templates
        role_templates = {
            'frontend': {
                'responsibilities': [
                    'Develop and maintain responsive web applications using modern frameworks',
                    'Collaborate with designers to implement pixel-perfect UI/UX designs',
                    'Optimize application performance and ensure cross-browser compatibility',
                    'Write clean, maintainable, and well-documented code',
                    'Participate in code reviews and contribute to team best practices',
                    'Work with backend developers to integrate RESTful APIs',
                    'Stay updated with latest frontend technologies and trends'
                ],
                'requirements': [
                    f'3+ years of experience in frontend development',
                    'Strong proficiency in HTML5, CSS3, and JavaScript (ES6+)',
                    'Experience with React, Vue.js, or Angular',
                    'Understanding of responsive design and mobile-first development',
                    'Familiarity with version control systems (Git)',
                    'Strong problem-solving and debugging skills',
                    'Excellent communication and teamwork abilities'
                ]
            },
            'backend': {
                'responsibilities': [
                    'Design and develop scalable backend services and APIs',
                    'Build and maintain database schemas and optimize queries',
                    'Implement security best practices and data protection measures',
                    'Write comprehensive unit and integration tests',
                    'Monitor application performance and troubleshoot issues',
                    'Collaborate with frontend developers on API integration',
                    'Participate in system architecture and design decisions'
                ],
                'requirements': [
                    f'3+ years of backend development experience',
                    'Proficiency in Node.js, Python, Java, or similar languages',
                    'Experience with SQL and NoSQL databases',
                    'Understanding of RESTful API design principles',
                    'Knowledge of cloud platforms (AWS, Azure, or GCP)',
                    'Familiarity with Docker and containerization',
                    'Strong analytical and problem-solving skills'
                ]
            },
            'fullstack': {
                'responsibilities': [
                    'Develop end-to-end features from database to user interface',
                    'Build and maintain RESTful APIs and microservices',
                    'Create responsive and intuitive user interfaces',
                    'Optimize application performance across the stack',
                    'Implement automated testing and CI/CD pipelines',
                    'Collaborate with cross-functional teams',
                    'Mentor junior developers and conduct code reviews'
                ],
                'requirements': [
                    f'4+ years of full-stack development experience',
                    'Strong proficiency in both frontend and backend technologies',
                    'Experience with React/Vue.js and Node.js/Python',
                    'Knowledge of database design and optimization',
                    'Understanding of DevOps practices and tools',
                    'Excellent problem-solving and communication skills',
                    'Bachelor\'s degree in Computer Science or equivalent'
                ]
            }
        }
        
        # Detect role type
        title_lower = title.lower()
        if 'frontend' in title_lower or 'front-end' in title_lower or 'react' in title_lower or 'vue' in title_lower:
            template = role_templates['frontend']
        elif 'backend' in title_lower or 'back-end' in title_lower or 'api' in title_lower:
            template = role_templates['backend']
        elif 'fullstack' in title_lower or 'full-stack' in title_lower or 'full stack' in title_lower:
            template = role_templates['fullstack']
        else:
            # Default to fullstack
            template = role_templates['fullstack']
        
        # Build description (plain text format for textarea)
        description = f"""{title.upper()}

Department: {department}
Employment Type: {employment_type.title()}
Experience Level: {experience_level.title()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABOUT THE ROLE

We are seeking a talented {title} to join our {department} team. This is an exciting opportunity to work on cutting-edge projects and contribute to our growing platform.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY RESPONSIBILITIES

"""
        for i, resp in enumerate(template['responsibilities'], 1):
            description += f"{i}. {resp}\n"
        
        description += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED QUALIFICATIONS

"""
        for i, req in enumerate(template['requirements'], 1):
            description += f"{i}. {req}\n"
        
        description += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PREFERRED QUALIFICATIONS

• Experience with TypeScript and modern build tools
• Contributions to open-source projects
• Knowledge of Agile/Scrum methodologies

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT WE OFFER

• Competitive salary and equity package
• Flexible work arrangements and remote options
• Professional development and learning opportunities
• Health insurance and wellness programs
• Collaborative and innovative work environment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOW TO APPLY

Submit your resume and portfolio showcasing your best work. We look forward to hearing from you!
"""
        
        return description
    
    def _parse_sections(self, text: str) -> Dict[str, str]:
        """Parse job description into sections"""
        sections = {}
        
        # Define section patterns
        section_names = [
            'Job Summary',
            'Key Responsibilities',
            'Required Qualifications',
            'Preferred Qualifications',
            'Benefits'
        ]
        
        for section in section_names:
            # Find section content
            import re
            pattern = f"{section}:?(.+?)(?={'|'.join(section_names)}|$)"
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            
            if match:
                content = match.group(1).strip()
                sections[section.lower().replace(' ', '_')] = content
        
        return sections
