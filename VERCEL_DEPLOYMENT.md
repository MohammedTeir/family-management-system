# Vercel Deployment Guide for Family Management Frontend

## Prerequisites
- Vercel CLI installed (optional but recommended)
- GitHub account (for GitHub integration)
- Frontend code ready for deployment

## Step 1: Prepare Environment Variables

Create a `.env.production` file in your frontend root directory:
```bash
# .env.production
VITE_API_BASE_URL=https://your-heroku-app.herokuapp.com
```

## Method 1: Deploy via Vercel CLI

### Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### Login to Vercel
```bash
vercel login
```

### Deploy
```bash
# Navigate to your frontend directory
cd family-management-frontend

# Deploy to Vercel
vercel

# For production deployment
vercel --prod
```

### Set Environment Variables via CLI
```bash
# Set production environment variable
vercel env add VITE_API_BASE_URL production
# Enter: https://your-heroku-app.herokuapp.com
```

## Method 2: Deploy via GitHub Integration (Recommended)

### Step 1: Push to GitHub
```bash
# Add and commit all changes
git add .
git commit -m "Prepare frontend for deployment"

# Push to GitHub
git push origin main
```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Select the frontend directory if it's in a subdirectory

### Step 3: Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `family-management-frontend` (if applicable)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Set Environment Variables
In the Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   ```
   Name: VITE_API_BASE_URL
   Value: https://your-heroku-app.herokuapp.com
   Environment: Production
   ```

### Step 5: Deploy
Click "Deploy" to start the deployment process.

## Important Configuration Notes

### Frontend API Configuration
Your `api.ts` file is already configured correctly:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const fetchApi = async (endpoint: string, options?: RequestInit) => {
  // ...
  const defaultOptions: RequestInit = {
    credentials: 'include', // ✅ This is crucial for session cookies
    // ...
  };
};
```

### CORS Considerations
Ensure your Heroku backend's `FRONTEND_URL` environment variable matches your Vercel domain exactly:
```bash
# Update Heroku with your Vercel domain
heroku config:set FRONTEND_URL="https://your-vercel-app.vercel.app"
```

## Step 6: Test Deployment

### Verify the deployment works:
1. Visit your Vercel URL
2. Test user registration/login
3. Check browser dev tools for any CORS errors
4. Verify sessions persist after page refresh

## Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Verify `FRONTEND_URL` in Heroku matches your Vercel domain exactly
   - Ensure no trailing slashes in URLs

2. **Sessions Not Persisting**:
   - Check that `credentials: 'include'` is set in fetch requests
   - Verify cookie settings in backend (secure, sameSite)

3. **Build Failures**:
   - Ensure all environment variables are set in Vercel
   - Check that TypeScript compilation passes

4. **API Connection Issues**:
   - Verify `VITE_API_BASE_URL` points to your Heroku app
   - Test API endpoints directly in browser

### Useful Commands:
```bash
# View deployment logs
vercel logs

# List deployments
vercel ls

# Set environment variable
vercel env add VARIABLE_NAME production

# Remove deployment
vercel remove project-name
```

## Custom Domain (Optional)

### Add custom domain:
1. In Vercel dashboard, go to project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. Update Heroku's `FRONTEND_URL` to your custom domain

## Automatic Deployments

With GitHub integration:
- Every push to `main` branch triggers a new deployment
- Pull requests create preview deployments
- Vercel provides preview URLs for testing

## Security Notes

- Never commit `.env` files with production credentials
- Use Vercel's environment variable system for sensitive data
- Regularly rotate session secrets
- Monitor deployment logs for suspicious activity

## Final Steps

1. Update your Heroku `FRONTEND_URL`:
   ```bash
   heroku config:set FRONTEND_URL="https://your-vercel-app.vercel.app"
   ```

2. Test the complete flow:
   - User registration
   - Login/logout
   - Session persistence
   - API calls from frontend to backend

3. Monitor both Heroku and Vercel logs for any issues