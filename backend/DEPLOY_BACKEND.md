 Backend Deployment Guide for Render

## Step 1: Prepare for Deployment

### ✅ Files Ready:
- `package.json` - Updated with Node.js version and build script
- `server.js` - Main application file with health endpoint
- `render.yaml` - Render configuration file
- `.env.production` - Production environment template

### ✅ Dependencies:
- All required packages listed in package.json
- Health check endpoint available at `/api/health`
- Port configuration uses `process.env.PORT`

## Step 2: Deploy to Render

### 1. Create New Web Service on Render:
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Select the `backend` folder as root directory

### 2. Configure Service Settings:
```
Name: ai-hrms-backend
Environment: Node
Region: Choose closest to your users
Branch: main (or your main branch)
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

### 3. Set Environment Variables:
```
NODE_ENV=production
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
JWT_SECRET=<generate-new-secret>
JWT_EXPIRE=7d
AI_SERVICE_URL=<will-be-set-after-ai-service-deployment>
CORS_ORIGIN=<will-be-set-after-frontend-deployment>
```

### 4. Generate JWT Secret:
Run this command to generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Step 3: Verify Deployment

### Health Check:
Once deployed, visit: `https://your-backend-url.onrender.com/api/health`

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "Connected",
  "service": "AI-HRMS Backend"
}
```

## Step 4: Post-Deployment

1. **Note the backend URL** - You'll need this for frontend configuration
2. **Test API endpoints** - Verify key routes are working
3. **Check logs** - Monitor for any deployment issues

## Environment Variables Needed:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGciOiJIUzI1NiIs...` |
| `JWT_SECRET` | JWT signing secret | Generate with crypto |
| `JWT_EXPIRE` | JWT expiration | `7d` |
| `AI_SERVICE_URL` | AI service URL | Set after AI deployment |
| `CORS_ORIGIN` | Frontend URL | Set after frontend deployment |

## Next Steps:
After backend deployment is successful, proceed to deploy the AI Service.
