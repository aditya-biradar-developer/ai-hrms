# 🤖 AI HRMS Microservice

AI-powered features for the HRMS using local LLaMA model.

---

## 🚀 Features

### ✅ Implemented

1. **AI Resume Screening & Candidate Ranking**
   - Parse PDF/DOCX resumes
   - Extract skills, email, phone
   - Score candidates against job descriptions
   - Rank multiple candidates
   - Generate match reasoning

2. **AI-Generated Job Descriptions**
   - Generate complete JDs from title + skills
   - Professional formatting
   - Customizable by experience level
   - Department-specific content

3. **Automated Email Writing**
   - Rejection emails
   - Interview invitations
   - Job offers
   - Reminders
   - Welcome messages
   - Performance review invites

4. **Performance Review Assistant**
   - Summarize employee performance
   - Analyze metrics and feedback
   - Generate recommendations
   - Identify strengths and improvements

5. **Role-Based Chatbot**
   - Context-aware responses
   - Role-specific knowledge (Admin, HR, Manager, Employee, Candidate)
   - Conversational interface

---

## 📋 Prerequisites

- **Python 3.9+**
- **4GB+ RAM** (8GB recommended for larger models)
- **LLaMA Model** (download separately)

---

## 🛠️ Setup Instructions

### **1. Install Dependencies**

```bash
cd ai-service
pip install -r requirements.txt
```

### **2. Download LLaMA Model**

Download a quantized LLaMA model (GGUF format):

**Option A: LLaMA 2 7B Chat (Recommended)**
```bash
# Create models directory
mkdir models
cd models

# Download from Hugging Face
# Visit: https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF
# Download: llama-2-7b-chat.Q4_K_M.gguf (4.08 GB)
```

**Option B: Smaller Model (for testing)**
```bash
# Download TinyLlama (1.1B parameters, ~600MB)
# Visit: https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF
# Download: tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
```

### **3. Configure Environment**

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5001
MODEL_PATH=./models/llama-2-7b-chat.Q4_K_M.gguf
MAX_TOKENS=2048
TEMPERATURE=0.7
```

### **4. Run the Service**

```bash
python app.py
```

The service will start on `http://localhost:5001`

---

## 📡 API Endpoints

### **Health Check**
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "AI HRMS Service",
  "model_loaded": true
}
```

### **1. Resume Screening**

**Parse Resume File**
```http
POST /api/ai/resume/parse
Content-Type: multipart/form-data

file: [PDF or DOCX file]
```

Response:
```json
{
  "success": true,
  "data": {
    "text": "Resume text...",
    "skills": ["Python", "React", "SQL"],
    "email": "candidate@email.com",
    "phone": "+1234567890",
    "word_count": 450
  }
}
```

**Screen Resume**
```http
POST /api/ai/resume/screen
Content-Type: application/json

{
  "resume_text": "Candidate resume...",
  "job_description": "Job requirements..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "match_score": 85,
    "analysis": "Detailed analysis...",
    "recommendation": "Highly Recommended",
    "strengths": "Strong React and Node.js experience...",
    "gaps": "Limited cloud experience..."
  }
}
```

**Rank Candidates**
```http
POST /api/ai/resume/rank
Content-Type: application/json

{
  "candidates": [
    {"id": "1", "name": "John", "resume_text": "..."},
    {"id": "2", "name": "Jane", "resume_text": "..."}
  ],
  "job_description": "..."
}
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "candidate_id": "2",
      "name": "Jane",
      "match_score": 92,
      "recommendation": "Highly Recommended",
      "analysis": "..."
    },
    {
      "candidate_id": "1",
      "name": "John",
      "match_score": 78,
      "recommendation": "Recommended",
      "analysis": "..."
    }
  ]
}
```

### **2. Job Description Generation**

```http
POST /api/ai/job-description/generate
Content-Type: application/json

{
  "title": "Senior Frontend Developer",
  "skills": ["React", "TypeScript", "TailwindCSS"],
  "department": "Engineering",
  "experience_level": "senior",
  "employment_type": "full-time"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "title": "Senior Frontend Developer",
    "full_description": "Complete JD text...",
    "sections": {
      "job_summary": "...",
      "key_responsibilities": "...",
      "required_qualifications": "...",
      "preferred_qualifications": "...",
      "benefits": "..."
    }
  }
}
```

### **3. Email Generation**

```http
POST /api/ai/email/generate
Content-Type: application/json

{
  "type": "rejection",
  "recipient_name": "John Doe",
  "context": {
    "position": "Software Engineer"
  },
  "tone": "professional"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "subject": "Thank you for your application",
    "body": "Dear John Doe,\n\nThank you for...",
    "full_text": "..."
  }
}
```

**Email Types:**
- `rejection` - Candidate rejection
- `interview_invite` - Interview invitation
- `offer` - Job offer
- `reminder` - Task reminder
- `welcome` - New employee welcome
- `performance_review` - Performance review invite

### **4. Performance Summary**

```http
POST /api/ai/performance/summarize
Content-Type: application/json

{
  "employee_data": {
    "name": "Jane Smith",
    "role": "Software Engineer",
    "department": "Engineering"
  },
  "performance_metrics": {
    "quality_of_work": 4.5,
    "productivity": 4.0,
    "communication": 4.2
  },
  "attendance": {
    "present_days": 22,
    "total_days": 23
  },
  "feedback": [
    "Excellent problem solver",
    "Great team player"
  ]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "overall_rating": 4.3,
    "summary": "Detailed performance summary...",
    "strengths": "Strong technical skills...",
    "improvements": "Could improve time management...",
    "recommendations": "Consider leadership training..."
  }
}
```

### **5. Chatbot**

```http
POST /api/ai/chat
Content-Type: application/json

{
  "message": "How many leave days do I have?",
  "user_role": "employee",
  "context": {
    "leave_balance": 10
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "response": "Based on your records, you have 10 leave days remaining..."
  }
}
```

---

## 🔗 Integration with Main Backend

### **Node.js Backend Integration**

Create a service to call AI endpoints:

```javascript
// backend/services/aiService.js
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

const aiService = {
  async screenResume(resumeText, jobDescription) {
    const response = await axios.post(`${AI_SERVICE_URL}/api/ai/resume/screen`, {
      resume_text: resumeText,
      job_description: jobDescription
    });
    return response.data;
  },

  async generateJobDescription(data) {
    const response = await axios.post(`${AI_SERVICE_URL}/api/ai/job-description/generate`, data);
    return response.data;
  },

  async generateEmail(type, recipientName, context) {
    const response = await axios.post(`${AI_SERVICE_URL}/api/ai/email/generate`, {
      type,
      recipient_name: recipientName,
      context
    });
    return response.data;
  },

  async chat(message, userRole, context) {
    const response = await axios.post(`${AI_SERVICE_URL}/api/ai/chat`, {
      message,
      user_role: userRole,
      context
    });
    return response.data;
  }
};

module.exports = aiService;
```

---

## ⚡ Performance Tips

1. **Model Size**: Start with 7B model, use smaller (1B) for testing
2. **GPU Acceleration**: Set `n_gpu_layers` in `llm_service.py` if you have NVIDIA GPU
3. **Caching**: Consider caching common responses
4. **Async Processing**: For bulk operations, use background jobs
5. **Rate Limiting**: Implement rate limiting for production

---

## 🐛 Troubleshooting

### Model Not Loading
```
Error: Model file not found
```
**Solution**: Download the model and update `MODEL_PATH` in `.env`

### Out of Memory
```
Error: Failed to allocate memory
```
**Solution**: Use a smaller model or increase system RAM

### Slow Responses
**Solution**: 
- Use quantized models (Q4_K_M)
- Enable GPU acceleration
- Reduce `MAX_TOKENS`

---

## 📊 Model Recommendations

| Model | Size | RAM | Speed | Quality |
|-------|------|-----|-------|---------|
| TinyLlama 1.1B | 600MB | 2GB | Fast | Good |
| LLaMA 2 7B | 4GB | 8GB | Medium | Excellent |
| LLaMA 2 13B | 7GB | 16GB | Slow | Best |

**Recommended for Production**: LLaMA 2 7B (Q4_K_M quantization)

---

## 🔒 Security

- ✅ No data sent to external APIs
- ✅ All processing happens locally
- ✅ Resume data stays on your server
- ✅ CORS configured for your frontend only
- ✅ Add API authentication in production

---

## 📝 Next Steps

1. ✅ Download LLaMA model
2. ✅ Install dependencies
3. ✅ Configure `.env`
4. ✅ Run `python app.py`
5. ✅ Test with Postman/curl
6. ✅ Integrate with Node.js backend
7. ✅ Add to frontend UI

---

## 🎯 Future Enhancements

- [ ] Document Q&A with vector database
- [ ] Meeting scheduler
- [ ] Analytics summaries
- [ ] Skill graph visualization
- [ ] Fine-tuning on HR-specific data
- [ ] Multi-language support

---

**AI Service Ready! 🚀**
