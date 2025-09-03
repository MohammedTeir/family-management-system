# GitHub Deployment Guide

Complete guide to deploy your Family Management System using GitHub integration.

## 📋 Overview

- **Backend**: Deploy to Heroku via GitHub integration
- **Frontend**: Deploy to Vercel via GitHub integration
- **Repository Structure**: Monorepo with backend and frontend folders

## 🚀 Step 1: Push to GitHub

### Create GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository named `family-management-system`
2. **Don't** initialize with README (we already have one)

### Push Local Code
```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/family-management-system.git

# Push to GitHub
git push -u origin main
```

## 🔧 Step 2: Deploy Backend to Heroku via GitHub

### 2.1 Create Heroku App
```bash
# Install Heroku CLI if not installed
npm install -g heroku

# Login to Heroku
heroku login

# Create new app
heroku create your-family-backend --region us

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:essential-0 -a your-family-backend
```

### 2.2 Connect GitHub to Heroku
1. Go to [Heroku Dashboard](https://dashboard.heroku.com)
2. Click your app (`your-family-backend`)
3. Go to **Deploy** tab
4. Choose **GitHub** as deployment method
5. Connect your GitHub account
6. Search and connect `family-management-system` repository

### 2.3 Configure Heroku Settings
1. In **Deploy** tab, scroll to **App connected to GitHub**
2. Set **Deploy Branch**: `main`
3. Enable **Automatic deploys** (optional)

### 2.4 Set Environment Variables
Go to **Settings** tab → **Config Vars** and add:

```bash
# Database URL (automatically set by Postgres addon)
DATABASE_URL=(automatically set)

# Session secret (generate a strong random string)
SESSION_SECRET=your-super-secure-random-session-secret-here

# Frontend URL (will be set after Vercel deployment)
FRONTEND_URL=https://your-vercel-app.vercel.app

# Node environment
NODE_ENV=production
```

### 2.5 Deploy Backend
1. Go to **Deploy** tab
2. Scroll to **Manual deploy**
3. Click **Deploy Branch** (main)
4. Monitor build logs

## 🌐 Step 3: Deploy Frontend to Vercel via GitHub

### 3.1 Deploy via Vercel Dashboard
1. Go to [Vercel](https://vercel.com)
2. Sign in with GitHub
3. Click **New Project**
4. Import `family-management-system` repository

### 3.2 Configure Project Settings
- **Framework Preset**: Vite
- **Root Directory**: `family-management-frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3.3 Set Environment Variables
In Vercel project settings:
1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   Name: VITE_API_BASE_URL
   Value: https://your-family-backend.herokuapp.com
   Environment: Production
   ```

### 3.4 Deploy Frontend
Click **Deploy** to start deployment.

## 🔗 Step 4: Connect Frontend and Backend

### Update Heroku Backend URL
Once Vercel deployment is complete:
```bash
# Update Heroku config with your Vercel domain
heroku config:set FRONTEND_URL="https://your-project.vercel.app" -a your-family-backend
```

## ✅ Step 5: Test Deployment

### Verify Everything Works:
1. Visit your Vercel frontend URL
2. Test user registration/login
3. Check that sessions persist after page refresh
4. Verify API calls work between frontend and backend

### Monitor Logs:
```bash
# Heroku backend logs
heroku logs --tail -a your-family-backend

# Vercel frontend logs (via dashboard)
# Go to Vercel → Your Project → Functions tab
```

## 🔄 Automatic Deployments

### Backend (Heroku):
- Enable "Automatic deploys" in Heroku Deploy tab
- Every push to `main` branch triggers backend deployment

### Frontend (Vercel):
- Automatic by default with GitHub integration
- Every push to `main` branch triggers frontend deployment
- Pull requests create preview deployments

## 🎯 Environment Variables Summary

### Heroku Backend
```bash
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-super-secure-session-secret
FRONTEND_URL=https://your-project.vercel.app
NODE_ENV=production
PORT=(automatically set by Heroku)
```

### Vercel Frontend
```bash
VITE_API_BASE_URL=https://your-family-backend.herokuapp.com
```

## 🐛 Troubleshooting

### Common Issues:

1. **Build Failures on Heroku**:
   - Check that all dependencies are in `dependencies`, not `devDependencies`
   - Verify Node.js version compatibility

2. **CORS Errors**:
   - Ensure `FRONTEND_URL` in Heroku exactly matches Vercel domain
   - No trailing slashes in URLs

3. **Session Issues**:
   - Verify PostgreSQL addon is connected
   - Check `SESSION_SECRET` is set
   - Ensure `credentials: 'include'` in frontend API calls

4. **Deployment Failures**:
   - Check build logs in both platforms
   - Verify environment variables are set correctly

### Useful Commands:
```bash
# View Heroku app info
heroku info -a your-family-backend

# Restart Heroku app
heroku restart -a your-family-backend

# Access Heroku database
heroku pg:psql -a your-family-backend

# View environment variables
heroku config -a your-family-backend
```

## 🔐 Security Considerations

- Never commit `.env` files or secrets to GitHub
- Use strong, unique session secrets
- Regularly rotate secrets
- Monitor application logs for suspicious activity
- Keep dependencies updated

## 📈 Next Steps

After successful deployment:
1. Set up monitoring and alerts
2. Configure custom domains (optional)
3. Set up CI/CD pipelines for testing
4. Implement backup strategies for the database
5. Consider adding staging environments