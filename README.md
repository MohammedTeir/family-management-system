# Family Management System

A full-stack family management application for tracking family information, requests, and support vouchers.

## Architecture

- **Backend**: Node.js, Express, Drizzle ORM, PostgreSQL
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Deployment**: 
  - Backend: Heroku
  - Frontend: Vercel
  - Database: Heroku PostgreSQL

## Project Structure

```
family-management/
├── family-management-backend/     # Node.js backend
│   ├── src/
│   ├── package.json
│   └── Procfile
├── family-management-frontend/    # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── HEROKU_DEPLOYMENT.md          # Backend deployment guide
├── VERCEL_DEPLOYMENT.md          # Frontend deployment guide
└── README.md
```

## Quick Start

### Backend (Development)
```bash
cd family-management-backend
npm install
npm run dev
```

### Frontend (Development)
```bash
cd family-management-frontend
npm install
npm run dev
```

## Deployment

- **Backend**: Deployed to Heroku with PostgreSQL
- **Frontend**: Deployed to Vercel
- **Session Storage**: PostgreSQL for cross-platform persistence

See deployment guides for detailed instructions:
- [Heroku Deployment](./HEROKU_DEPLOYMENT.md)
- [Vercel Deployment](./VERCEL_DEPLOYMENT.md)

## Environment Variables

### Backend (Heroku)
```
DATABASE_URL=<provided-by-heroku-postgres>
SESSION_SECRET=<your-secure-secret>
FRONTEND_URL=<your-vercel-domain>
NODE_ENV=production
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=<your-heroku-backend-url>
```