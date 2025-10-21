# ATS Resume Screening System

## Overview
This is a comprehensive Applicant Tracking System (ATS) that performs real resume screening based on job descriptions. It uses multiple analysis techniques to evaluate candidates similar to professional ATS software.

## Features

### 1. **Multi-Dimensional Analysis**
- ✅ **Skills Matching**: Extracts and matches technical skills across 9 categories
- ✅ **Keyword Density**: Analyzes keyword overlap between resume and job description
- ✅ **Experience Analysis**: Evaluates years of experience and seniority level
- ✅ **Education Verification**: Checks educational qualifications
- ✅ **AI Deep Analysis**: Uses LLM for contextual understanding

### 2. **Comprehensive Skill Categories**
- Programming Languages (Python, Java, JavaScript, etc.)
- Web Technologies (React, Angular, Node.js, etc.)
- Databases (SQL, MongoDB, PostgreSQL, etc.)
- Cloud Platforms (AWS, Azure, GCP)
- DevOps Tools (Docker, Kubernetes, CI/CD)
- Data Science (ML, AI, TensorFlow, etc.)
- Mobile Development (Android, iOS, React Native)
- Tools & Methodologies (Git, Agile, Scrum)

### 3. **Scoring System**
The ATS score (0-100) is calculated using weighted components:
- **Skills Match**: 35%
- **Keyword Match**: 20%
- **Experience**: 25%
- **Education**: 10%
- **AI Analysis**: 10%

## API Endpoint

### Comprehensive Resume Screening

**Endpoint**: `POST /api/ai/resume/screen-comprehensive`

**Request Body**:
```json
{
  "resume_text": "Full resume text...",
  "resume_url": "https://example.com/resume.pdf",
  "job_description": "Job description text...",
  "job_title": "Senior Software Engineer"
}
```

**Note**: Provide either `resume_text` OR `resume_url`, not both.

**Response**:
```json
{
  "success": true,
  "data": {
    "ats_score": 85,
    "recommendation": "Highly Recommended",
    "skill_analysis": {
      "matched_skills": ["python", "react", "aws", "docker"],
      "missing_skills": ["kubernetes", "terraform"],
      "skill_match_percentage": 75.5,
      "total_skills_found": 12
    },
    "keyword_match": {
      "score": 82.3,
      "matched_keywords": ["development", "architecture", "scalable", ...]
    },
    "experience_analysis": {
      "score": 90,
      "years_found": 5,
      "years_required": 4,
      "level": "senior",
      "required_level": "senior",
      "match": true
    },
    "education_verification": {
      "score": 100,
      "qualifications_found": ["Bachelor", "Computer Science"]
    },
    "ai_insights": {
      "score": 88,
      "technical_fit": "Strong technical background...",
      "experience_relevance": "Relevant experience in...",
      "cultural_fit": "Demonstrates leadership...",
      "red_flags": "None identified",
      "hiring_recommendation": "Strong Yes"
    },
    "strengths": [
      "Strong technical skills match (15 key skills)",
      "Relevant experience (5 years)",
      "Meets education requirements"
    ],
    "gaps": [
      "Missing 2 required skills: kubernetes, terraform"
    ],
    "interview_questions": [
      "Can you describe your experience with python?",
      "How would you approach learning kubernetes?",
      "Describe a challenging project you've worked on recently."
    ]
  }
}
```

## Recommendation Levels

| ATS Score | Recommendation | Meaning |
|-----------|---------------|---------|
| 85-100 | Highly Recommended | Excellent match, proceed to interview |
| 70-84 | Recommended | Good match, strong candidate |
| 55-69 | Consider | Partial match, review carefully |
| 40-54 | Weak Candidate | Significant gaps, likely not suitable |
| 0-39 | Not Recommended | Poor match, wrong field |

## Usage Examples

### Example 1: Screen Resume from Text

```python
import requests

response = requests.post('http://localhost:5001/api/ai/resume/screen-comprehensive', json={
    "resume_text": """
    John Doe
    Senior Software Engineer
    
    Experience:
    - 5 years of Python development
    - Built scalable microservices using Docker and Kubernetes
    - Worked with AWS, React, and PostgreSQL
    
    Education:
    - B.Tech in Computer Science
    
    Skills: Python, JavaScript, React, Node.js, AWS, Docker, Kubernetes, PostgreSQL
    """,
    "job_description": """
    Senior Software Engineer
    
    Requirements:
    - 4+ years of Python experience
    - Experience with cloud platforms (AWS/Azure)
    - Strong knowledge of React and Node.js
    - Docker and Kubernetes experience
    - Bachelor's degree in Computer Science
    """,
    "job_title": "Senior Software Engineer"
})

result = response.json()
print(f"ATS Score: {result['data']['ats_score']}")
print(f"Recommendation: {result['data']['recommendation']}")
```

### Example 2: Screen Resume from URL

```python
response = requests.post('http://localhost:5001/api/ai/resume/screen-comprehensive', json={
    "resume_url": "https://example.com/resumes/john-doe.pdf",
    "job_description": "...",
    "job_title": "Senior Software Engineer"
})
```

## Integration with Frontend

Update your frontend to use the comprehensive screening endpoint:

```javascript
// In applicationService.js or similar
export const screenResumeComprehensive = async (resumeUrl, jobDescription, jobTitle) => {
  const response = await axios.post(`${AI_SERVICE_URL}/api/ai/resume/screen-comprehensive`, {
    resume_url: resumeUrl,
    job_description: jobDescription,
    job_title: jobTitle
  });
  return response.data;
};
```

## Benefits Over Simple Screening

### Old System:
- ❌ Simple text matching
- ❌ Single AI score
- ❌ Limited insights
- ❌ No skill categorization

### New ATS System:
- ✅ Multi-dimensional analysis
- ✅ Weighted scoring system
- ✅ Detailed skill breakdown
- ✅ Experience level matching
- ✅ Education verification
- ✅ AI-powered insights
- ✅ Interview question generation
- ✅ Strength & gap identification
- ✅ Professional recommendations

## How It Works

1. **Resume Parsing**: Extracts text from PDF/DOCX or uses provided text
2. **Skill Extraction**: Identifies technical skills across 9 categories
3. **Keyword Analysis**: Compares important keywords between resume and JD
4. **Experience Matching**: Analyzes years and level of experience
5. **Education Check**: Verifies educational qualifications
6. **AI Analysis**: Deep contextual understanding using LLM
7. **Score Calculation**: Weighted combination of all factors
8. **Recommendation**: Final hiring recommendation with insights

## Testing

Test the endpoint using curl:

```bash
curl -X POST http://localhost:5001/api/ai/resume/screen-comprehensive \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Your resume text here...",
    "job_description": "Job description here...",
    "job_title": "Software Engineer"
  }'
```

## Performance

- **Processing Time**: 2-5 seconds per resume
- **Accuracy**: High accuracy with multi-factor analysis
- **Scalability**: Can process multiple resumes in parallel
- **Reliability**: Fallback mechanisms for AI failures

## Future Enhancements

- [ ] Resume parsing from images (OCR)
- [ ] Multi-language support
- [ ] Custom skill database per company
- [ ] Bias detection and mitigation
- [ ] Candidate ranking across multiple positions
- [ ] Integration with LinkedIn profiles
- [ ] Automated reference checking
- [ ] Video interview analysis

## Troubleshooting

### Issue: Low scores for good candidates
**Solution**: Check if job description has too many required skills. Adjust weights in `_calculate_ats_score()`.

### Issue: AI analysis fails
**Solution**: System falls back to rule-based scoring. Check if Ollama is running and model is loaded.

### Issue: Resume parsing fails
**Solution**: Ensure resume is not password-protected or image-based. Use text-based PDFs.

## Support

For issues or questions, check the logs:
```bash
tail -f ai-service.log
```

---

**Built with ❤️ for AI-HRMS**
