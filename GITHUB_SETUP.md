# GitHub Setup Guide

## Step 1: Initialize Git Repository

Run these commands in your project root directory:

```bash
# Navigate to project root
cd "c:/Users/birad/Downloads/DESK-TOP/HACKPRJ/FWC/ai-hrms"

# Initialize git repository
git init

# Add all files to staging
git add .

# Create initial commit
git commit -m "Initial commit: AI-HRMS project setup"
```

## Step 2: Create GitHub Repository

1. **Go to GitHub.com** and sign in to your account
2. **Click the "+" icon** in the top right corner
3. **Select "New repository"**
4. **Configure repository:**
   - Repository name: `ai-hrms`
   - Description: `AI-Powered Human Resource Management System`
   - Visibility: `Public` (recommended for deployment)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. **Click "Create repository"**

## Step 3: Connect Local Repository to GitHub

After creating the GitHub repository, run these commands:

```bash
# Add GitHub repository as remote origin
git remote add origin https://github.com/aditya-biradar-developer/ai-hrms.git

# Push to GitHub (first time)
git branch -M main
git push -u origin main
```

## Step 4: Verify Upload

1. **Refresh your GitHub repository page**
2. **Check that all folders are visible:**
   - ✅ backend/
   - ✅ frontend/
   - ✅ ai-service/
   - ✅ database/
   - ✅ README.md
   - ✅ .gitignore

## Step 5: Repository Settings (Optional)

### Add Repository Topics:
- `hrms`
- `ai`
- `react`
- `nodejs`
- `python`
- `flask`
- `supabase`
- `human-resources`

### Enable Issues and Discussions:
- Go to Settings → Features
- Enable Issues and Discussions for project management

## Next Steps

Once your repository is on GitHub:
1. ✅ **Repository URL** will be available for Render deployment
2. ✅ **Automatic deployments** can be configured
3. ✅ **Collaboration** becomes possible
4. ✅ **Version control** is fully enabled

## Troubleshooting

### If you get authentication errors:
1. **Use Personal Access Token** instead of password
2. **Generate token:** GitHub → Settings → Developer settings → Personal access tokens
3. **Use token as password** when prompted

### If repository already exists:
```bash
# If you need to force push (be careful!)
git push -f origin main
```

## Commands Summary

```bash
# Quick setup commands
cd "c:/Users/birad/Downloads/DESK-TOP/HACKPRJ/FWC/ai-hrms"
git init
git add .
git commit -m "Initial commit: AI-HRMS project setup"
git remote add origin https://github.com/YOUR_USERNAME/ai-hrms.git
git branch -M main
git push -u origin main
```

After this setup, you can proceed with Render deployment!
