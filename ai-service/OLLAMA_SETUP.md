# 🚀 Using Ollama with AI HRMS Service

**Great news!** Since you already have Ollama installed, setup is much easier!

---

## ✅ Why Ollama is Better

- ✅ **No manual downloads** - Pull models with one command
- ✅ **Better performance** - Optimized inference engine
- ✅ **Easy model switching** - Try different models instantly
- ✅ **Auto-updates** - Keep models current
- ✅ **Simpler setup** - No GGUF file management

---

## 🛠️ Quick Setup (3 Steps)

### **Step 1: Pull LLaMA Model**

Open terminal and run:

```bash
# Recommended: LLaMA 2 7B Chat (4GB)
ollama pull llama2:7b-chat

# Alternative: Smaller model for testing (2GB)
ollama pull llama2:7b

# Or: Latest LLaMA 3 (if available)
ollama pull llama3
```

### **Step 2: Start Ollama Server**

```bash
ollama serve
```

Leave this running in the background.

### **Step 3: Configure AI Service**

```bash
cd ai-service
cp .env.example .env
```

Edit `.env`:
```env
USE_OLLAMA=true
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2:7b-chat
```

---

## 🚀 Run AI Service

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py
```

The service will automatically connect to Ollama!

---

## ✅ Verify It's Working

### **1. Check Ollama Models**

```bash
ollama list
```

Should show:
```
NAME                ID              SIZE    MODIFIED
llama2:7b-chat      abc123...       4.1 GB  2 hours ago
```

### **2. Test Ollama Directly**

```bash
ollama run llama2:7b-chat "Hello, how are you?"
```

### **3. Check AI Service**

```bash
curl http://localhost:5001/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "AI HRMS Service",
  "model_loaded": true
}
```

---

## 📊 Available Models

### **Recommended for HRMS:**

| Model | Size | Speed | Quality | Command |
|-------|------|-------|---------|---------|
| **llama2:7b-chat** | 4GB | Medium | Excellent | `ollama pull llama2:7b-chat` |
| llama2:13b-chat | 7GB | Slow | Best | `ollama pull llama2:13b-chat` |
| llama2:7b | 4GB | Fast | Good | `ollama pull llama2:7b` |
| mistral | 4GB | Fast | Excellent | `ollama pull mistral` |
| codellama | 4GB | Fast | Good (code) | `ollama pull codellama` |

### **For Testing (Smaller):**

| Model | Size | Command |
|-------|------|---------|
| tinyllama | 600MB | `ollama pull tinyllama` |
| phi | 1.6GB | `ollama pull phi` |

---

## 🔄 Switch Models Easily

Want to try a different model? Just:

```bash
# Pull new model
ollama pull mistral

# Update .env
OLLAMA_MODEL=mistral

# Restart AI service
python app.py
```

---

## 🐛 Troubleshooting

### **Ollama Not Running**

```
Error: Cannot connect to Ollama at http://localhost:11434
```

**Solution:**
```bash
ollama serve
```

### **Model Not Found**

```
Warning: Model llama2:7b-chat not found in Ollama
```

**Solution:**
```bash
ollama pull llama2:7b-chat
```

### **Check Ollama Status**

```bash
# List installed models
ollama list

# Check if Ollama is running
curl http://localhost:11434/api/tags
```

---

## ⚡ Performance Tips

### **1. GPU Acceleration**

Ollama automatically uses GPU if available (NVIDIA/AMD).

### **2. Model Selection**

- **Fast responses**: Use `llama2:7b` or `mistral`
- **Best quality**: Use `llama2:13b-chat`
- **Testing**: Use `tinyllama`

### **3. Concurrent Requests**

Ollama handles multiple requests efficiently.

---

## 🎯 Complete Setup Checklist

- [x] Ollama installed ✅ (You already have this!)
- [ ] Pull LLaMA model: `ollama pull llama2:7b-chat`
- [ ] Start Ollama: `ollama serve`
- [ ] Install Python deps: `pip install -r requirements.txt`
- [ ] Configure `.env`: Set `USE_OLLAMA=true`
- [ ] Run AI service: `python app.py`
- [ ] Test health endpoint: `curl http://localhost:5001/health`

---

## 📝 Example Usage

### **Test Resume Screening**

```bash
curl -X POST http://localhost:5001/api/ai/resume/screen \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Software Engineer with 5 years experience in React and Node.js",
    "job_description": "Looking for a Full Stack Developer with React and Node.js experience"
  }'
```

### **Test Job Description Generation**

```bash
curl -X POST http://localhost:5001/api/ai/job-description/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Frontend Developer",
    "skills": ["React", "TypeScript"],
    "department": "Engineering",
    "experience_level": "senior"
  }'
```

### **Test Chatbot**

```bash
curl -X POST http://localhost:5001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many leave days do I have?",
    "user_role": "employee"
  }'
```

---

## 🎉 Benefits of Using Ollama

### **vs Manual GGUF Files:**

| Feature | Ollama | Manual GGUF |
|---------|--------|-------------|
| Setup | `ollama pull` | Download 4GB file manually |
| Updates | `ollama pull` | Re-download entire file |
| Switch models | Instant | Download new file |
| Performance | Optimized | Standard |
| Management | Built-in | Manual |

---

## 🚀 You're Ready!

Since you already have Ollama installed, you're 90% done!

**Just run:**

```bash
# 1. Pull model
ollama pull llama2:7b-chat

# 2. Start Ollama
ollama serve

# 3. In another terminal, run AI service
cd ai-service
pip install -r requirements.txt
python app.py
```

**That's it!** Your AI HRMS features are ready to use! 🎯✨

---

## 💡 Pro Tips

1. **Keep Ollama running** in the background
2. **Try different models** - switching is instant
3. **Monitor performance** - check response times
4. **Use GPU** if available for faster responses
5. **Update regularly** - `ollama pull <model>` to get latest

---

**No need to delete Ollama - it's the perfect solution!** 🚀
