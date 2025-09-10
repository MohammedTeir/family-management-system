# Heroku Deployment Guide for Family Management Backend

## Prerequisites
- Heroku CLI installed
- Git repository initialized
- Backend code ready for deployment

## Step 1: Create Heroku App
```bash
# Login to Heroku
heroku login

# Create new app (choose a unique name)
heroku create your-family-management-backend

# Alternatively, if you already have an app:
heroku git:remote -a your-existing-app-name
```

## Step 2: Add PostgreSQL Add-on
```bash
# Add Heroku Postgres (free tier)
heroku addons:create heroku-postgresql:essential-0

# This automatically sets DATABASE_URL environment variable
# Verify it was created:
heroku config:get DATABASE_URL
```

## Step 3: Set Environment Variables
```bash
# Set session secret (generate a strong random string)
heroku config:set SESSION_SECRET="your-super-secure-session-secret-here"

# Set frontend URL (will be your Vercel domain)
heroku config:set FRONTEND_URL="https://your-vercel-app.vercel.app"

# Set Node environment
heroku config:set NODE_ENV="production"

# Optional: Verify all environment variables
heroku config
```

## Step 4: Create Procfile
Create a `Procfile` in your backend root directory:
```
web: npm start
```

## Step 5: Ensure package.json Scripts
Your package.json should have these scripts (already present):
```json
{
  "scripts": {
    "build": "esbuild src/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "heroku-postbuild": "npm run build"
  }
}
```

## Step 6: Deploy to Heroku
```bash
# Add and commit all changes
git add .
git commit -m "Prepare for Heroku deployment"

# Deploy to Heroku
git push heroku main

# If your main branch is named 'master':
# git push heroku master
```

## Step 7: Run Database Migrations (if needed)
```bash
# Push database schema using Drizzle
heroku run npm run db:push

# Or connect to the database directly to run manual SQL
heroku pg:psql
```

## Step 8: Monitor Deployment
```bash
# View logs in real-time
heroku logs --tail

# Check app status
heroku ps:scale web=1
heroku open
```

## Troubleshooting

### Common Issues:

1. **Build Failures**: Check that all dependencies are in `dependencies`, not `devDependencies`
2. **Database Connection**: Ensure SSL is configured for Heroku Postgres
3. **Session Issues**: Verify `SESSION_SECRET` and `FRONTEND_URL` are set correctly
4. **CORS Errors**: Make sure `FRONTEND_URL` matches your Vercel domain exactly

### Useful Commands:
```bash
# Restart the app
heroku restart

# Scale dynos
heroku ps:scale web=1

# Access database shell
heroku pg:psql

# View environment variables
heroku config

# View app information
heroku info
```

## Important Notes:

- Heroku automatically sets `PORT` environment variable
- `DATABASE_URL` is automatically provided by the PostgreSQL add-on
- Session data will persist across app restarts using PostgreSQL storage
- SSL is required for production (handled automatically in your code)
- The app will be available at `https://your-app-name.herokuapp.com`