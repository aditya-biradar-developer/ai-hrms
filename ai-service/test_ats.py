"""
Test script for ATS Resume Screening System
"""

import requests
import json

# AI Service URL
AI_SERVICE_URL = "http://localhost:5001"

# Sample resume text
SAMPLE_RESUME = """
JOHN DOE
Senior Software Engineer
Email: john.doe@email.com | Phone: +1-555-0123

PROFESSIONAL SUMMARY
Experienced software engineer with 6 years of expertise in full-stack development,
cloud architecture, and DevOps practices. Proven track record of building scalable
applications using modern technologies.

EXPERIENCE

Senior Software Engineer | Tech Corp | 2020 - Present
- Led development of microservices architecture using Python, Docker, and Kubernetes
- Designed and implemented RESTful APIs serving 1M+ daily requests
- Migrated legacy systems to AWS cloud infrastructure (EC2, S3, Lambda)
- Mentored junior developers and conducted code reviews
- Implemented CI/CD pipelines using Jenkins and GitLab CI

Software Engineer | StartUp Inc | 2018 - 2020
- Developed responsive web applications using React and Node.js
- Built real-time features using WebSockets and Redis
- Optimized database queries in PostgreSQL, improving performance by 40%
- Collaborated with cross-functional teams in Agile environment

EDUCATION
Bachelor of Technology in Computer Science
XYZ University | 2014 - 2018
GPA: 3.8/4.0

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, Java, SQL
Frontend: React, Angular, HTML5, CSS3, Redux
Backend: Node.js, Express, Django, Flask, Spring Boot
Databases: PostgreSQL, MongoDB, Redis, MySQL
Cloud: AWS (EC2, S3, Lambda, RDS), Azure basics
DevOps: Docker, Kubernetes, Jenkins, GitLab CI, Terraform
Tools: Git, JIRA, Postman, VS Code

CERTIFICATIONS
- AWS Certified Solutions Architect - Associate
- Certified Kubernetes Administrator (CKA)

ACHIEVEMENTS
- Reduced application load time by 60% through optimization
- Led team of 5 developers on successful product launch
- Open source contributor to popular Python libraries
"""

# Sample job description
SAMPLE_JOB_DESCRIPTION = """
Senior Software Engineer

We are seeking an experienced Senior Software Engineer to join our growing team.

REQUIREMENTS:
- 5+ years of professional software development experience
- Strong proficiency in Python and JavaScript
- Experience with React and modern frontend frameworks
- Backend development experience with Node.js or Python frameworks
- Hands-on experience with cloud platforms (AWS or Azure)
- Experience with Docker and container orchestration (Kubernetes preferred)
- Strong understanding of microservices architecture
- Experience with CI/CD pipelines and DevOps practices
- Proficiency with SQL and NoSQL databases
- Bachelor's degree in Computer Science or related field

NICE TO HAVE:
- Experience with Terraform or infrastructure as code
- Knowledge of message queues (RabbitMQ, Kafka)
- Experience with monitoring tools (Prometheus, Grafana)
- Contributions to open source projects

RESPONSIBILITIES:
- Design and develop scalable backend services
- Build responsive frontend applications
- Collaborate with cross-functional teams
- Mentor junior developers
- Participate in code reviews and architectural decisions
- Ensure code quality and best practices
"""

def test_comprehensive_screening():
    """Test the comprehensive ATS screening endpoint"""
    print("=" * 80)
    print("TESTING COMPREHENSIVE ATS RESUME SCREENING")
    print("=" * 80)
    
    try:
        # Make API request
        print("\n📤 Sending request to AI service...")
        response = requests.post(
            f"{AI_SERVICE_URL}/api/ai/resume/screen-comprehensive",
            json={
                "resume_text": SAMPLE_RESUME,
                "job_description": SAMPLE_JOB_DESCRIPTION,
                "job_title": "Senior Software Engineer"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('success'):
                data = result['data']
                
                print("\n" + "=" * 80)
                print("✅ SCREENING RESULTS")
                print("=" * 80)
                
                # Overall Score
                print(f"\n🎯 ATS SCORE: {data['ats_score']}/100")
                print(f"📊 RECOMMENDATION: {data['recommendation']}")
                
                # Skill Analysis
                print("\n" + "-" * 80)
                print("💼 SKILL ANALYSIS")
                print("-" * 80)
                skill_analysis = data['skill_analysis']
                print(f"Match Percentage: {skill_analysis['skill_match_percentage']}%")
                print(f"Total Skills Found: {skill_analysis['total_skills_found']}")
                print(f"\n✅ Matched Skills ({len(skill_analysis['matched_skills'])}):")
                for skill in skill_analysis['matched_skills'][:10]:
                    print(f"   • {skill}")
                if len(skill_analysis['matched_skills']) > 10:
                    print(f"   ... and {len(skill_analysis['matched_skills']) - 10} more")
                
                if skill_analysis['missing_skills']:
                    print(f"\n❌ Missing Skills ({len(skill_analysis['missing_skills'])}):")
                    for skill in skill_analysis['missing_skills'][:5]:
                        print(f"   • {skill}")
                
                # Keyword Match
                print("\n" + "-" * 80)
                print("🔑 KEYWORD ANALYSIS")
                print("-" * 80)
                keyword_match = data['keyword_match']
                print(f"Keyword Match Score: {keyword_match['score']}%")
                print(f"Top Matched Keywords: {', '.join(keyword_match['matched_keywords'][:10])}")
                
                # Experience Analysis
                print("\n" + "-" * 80)
                print("📅 EXPERIENCE ANALYSIS")
                print("-" * 80)
                exp = data['experience_analysis']
                print(f"Experience Score: {exp['score']}%")
                print(f"Years Found: {exp['years_found']} years")
                print(f"Years Required: {exp['years_required']} years")
                print(f"Level: {exp['level'].title()}")
                print(f"Match: {'✅ Yes' if exp['match'] else '❌ No'}")
                
                # Education
                print("\n" + "-" * 80)
                print("🎓 EDUCATION VERIFICATION")
                print("-" * 80)
                edu = data['education_verification']
                print(f"Education Score: {edu['score']}%")
                print(f"Qualifications: {', '.join(edu['qualifications_found'])}")
                
                # AI Insights
                print("\n" + "-" * 80)
                print("🤖 AI INSIGHTS")
                print("-" * 80)
                ai = data['ai_insights']
                print(f"AI Score: {ai['score']}/100")
                print(f"\nTechnical Fit:\n{ai['technical_fit']}")
                print(f"\nExperience Relevance:\n{ai['experience_relevance']}")
                print(f"\nCultural Fit:\n{ai['cultural_fit']}")
                print(f"\nRed Flags: {ai['red_flags']}")
                print(f"\nHiring Recommendation: {ai['hiring_recommendation']}")
                
                # Strengths & Gaps
                print("\n" + "-" * 80)
                print("💪 STRENGTHS")
                print("-" * 80)
                for strength in data['strengths']:
                    print(f"✅ {strength}")
                
                print("\n" + "-" * 80)
                print("⚠️ GAPS")
                print("-" * 80)
                for gap in data['gaps']:
                    print(f"❌ {gap}")
                
                # Interview Questions
                print("\n" + "-" * 80)
                print("❓ SUGGESTED INTERVIEW QUESTIONS")
                print("-" * 80)
                for i, question in enumerate(data['interview_questions'], 1):
                    print(f"{i}. {question}")
                
                print("\n" + "=" * 80)
                print("✅ TEST COMPLETED SUCCESSFULLY")
                print("=" * 80)
                
                # Save results to file
                with open('ats_test_results.json', 'w') as f:
                    json.dump(data, f, indent=2)
                print("\n💾 Full results saved to: ats_test_results.json")
                
            else:
                print(f"\n❌ Error: {result.get('error', 'Unknown error')}")
        else:
            print(f"\n❌ HTTP Error: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to AI service")
        print("Make sure the AI service is running on http://localhost:5001")
        print("Run: python app.py")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")

def test_health_check():
    """Test if AI service is running"""
    print("\n🏥 Checking AI service health...")
    try:
        response = requests.get(f"{AI_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Service Status: {data['status']}")
            print(f"✅ Model Loaded: {data['model_loaded']}")
            return True
        else:
            print(f"❌ Service returned status code: {response.status_code}")
            return False
    except:
        print("❌ Service is not running")
        return False

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("ATS RESUME SCREENING SYSTEM - TEST SUITE")
    print("=" * 80)
    
    # Check if service is running
    if test_health_check():
        print("\n✅ AI Service is running. Proceeding with tests...\n")
        test_comprehensive_screening()
    else:
        print("\n❌ Please start the AI service first:")
        print("   cd ai-service")
        print("   python app.py")
