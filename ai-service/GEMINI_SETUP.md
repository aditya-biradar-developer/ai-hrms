# 🌟 Google Gemini AI Setup Guide

## Why Gemini?

- ✅ **100% Free** (Generous free tier)
- ⚡ **Super Fast** (3-5 seconds response time)
- 🎯 **Professional Quality** (Best-in-class email generation)
- 🔒 **Secure** (Google-grade security)
- 🚀 **No Local Setup** (Cloud-based, no downloads)

## Step 1: Get Your Free API Key

1. Visit: **https://makersuite.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy your API key (starts with `AIza...`)

## Step 2: Configure Your AI Service

1. Open `.env` file in the `ai-service` folder
2. Add your Gemini API key:

```env
# Google Gemini AI (Free & Fast!)
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Step 3: Install Dependencies

```bash
cd ai-service
pip install google-generativeai
```

## Step 4: Restart AI Service

```bash
python app.py
```

## Expected Output

You should see:
```
✅ Gemini AI initialized successfully
* Running on http://127.0.0.1:5001
```

## Test It!

Schedule an interview from your HRMS application - the email will now be:
- ✅ Professionally formatted in HTML
- ✅ Contextually relevant to interview type
- ✅ Includes preparation tips
- ✅ Warm and engaging tone
- ✅ Proper business email structure

## Email Quality Comparison

### Before (Fallback):
- Generic template
- Basic HTML
- Limited personalization

### After (Gemini):
- AI-crafted professional content
- Rich HTML formatting
- Interview-type specific tips
- Personalized for each candidate
- Context-aware preparation guidance

## Troubleshooting

### Error: "GEMINI_API_KEY not found"
**Solution:** Make sure you added the key to `.env` file in `ai-service` folder

### Error: "Invalid API key"
**Solution:** 
1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Replace the old key in `.env`

### Emails still generic?
**Solution:** 
1. Stop the AI service (Ctrl+C)
2. Check `.env` has correct API key
3. Restart: `python app.py`
4. Look for "✅ Gemini AI initialized successfully"

## API Limits (Free Tier)

- **60 requests per minute**
- **1,500 requests per day**
- More than enough for HRMS usage!

## Alternative: Use Fallback Templates

If you don't want to use Gemini, the system will automatically use nice fallback templates. But Gemini provides much better, personalized content!

## Support

Having issues? The system gracefully falls back to templates if Gemini is unavailable.
