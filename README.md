# Family Management System

A comprehensive family management application with backend and frontend components to help manage family-related tasks, schedules, and information.

## Project Structure

- `family-management-backend`: Backend API built with Node.js/TypeScript
- `family-management-frontend`: Frontend application
- `.bmad`: Configuration and documentation files
- `docs`: Project documentation and sprint artifacts

## Features

- Family scheduling and calendar management
- Task assignment and tracking
- Communication tools for family members
- Shared resource management
- Documentation and planning tools

## Technologies

- Backend: Node.js, TypeScript, Drizzle ORM
- Frontend: [Frontend framework to be specified]
- Database: [Database to be specified]

## Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (for backend)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd family-management-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (copy `.env.example` to `.env` and configure):
   ```bash
   cp .env.example .env
   ```

4. Run database migrations:
   ```bash
   npx drizzle-kit migrate
   ```

5. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd family-management-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables if needed (copy `.env.example` to `.env`):
   ```bash
   cp .env.example .env
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

## Development Workflow

- Backend API documentation can be found in `family-management-backend/API_Documentation.md`
- Frontend implementation guide is available in `family-management-backend/Frontend_Implementation_Guide.md`
- Both projects follow standard Node.js/TypeScript development practices

## Contributing

Please follow the established code style and submit pull requests for review.
When making changes, ensure both backend and frontend are compatible.

## License

[License information to be added]