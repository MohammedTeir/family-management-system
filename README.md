# Family Management System

A comprehensive full-stack family management application designed for organizations to track family information, manage support requests, distribute vouchers, and maintain detailed records. Built with modern technologies and supporting both single and polygamous family structures.

## ✨ Key Features

### 👥 Family Management
- **Complete Family Profiles**: Detailed information for family heads, spouses, and members
- **Polygamous Family Support**: Full support for families with multiple wives
- **Member Tracking**: Age calculation, disability status, relationship mapping
- **Identity Management**: National ID tracking and verification

### 📊 Data Export & Reporting  
- **PDF Reports**: Comprehensive family data exports with Arabic RTL support
- **Excel Integration**: Advanced spreadsheet exports with dynamic columns
- **Print Summaries**: Formatted documents for official use
- **Statistical Analysis**: Family demographics and distribution reports

### 🎫 Voucher & Support System
- **Support Vouchers**: Create and distribute aid vouchers to families
- **Recipient Management**: Track voucher recipients with detailed filtering
- **Pregnancy Tracking**: Special consideration for pregnant family members  
- **Search & Filter**: Advanced search across all family data

### 🏛️ Administrative Dashboard
- **Multi-Role Access**: Root, Admin, and Head user roles with appropriate permissions
- **Family Editing**: Complete CRUD operations for family data
- **User Management**: Account creation and role assignment
- **Excel Import**: Bulk import of family heads from Excel files
- **System Monitoring**: Family statistics and system usage tracking

### 🌐 Modern Interface
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Arabic RTL Support**: Full right-to-left language support
- **Interactive UI**: Modern React components with real-time updates
- **Accessibility**: WCAG compliant design principles

## 🏗️ Architecture

- **Backend**: Node.js, Express.js, Drizzle ORM, PostgreSQL
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Authentication**: Session-based auth with role-based access control
- **File Processing**: Excel import/export with xlsx library, PDF generation
- **Database**: PostgreSQL with comprehensive schema for families, members, wives, requests, vouchers
- **Error Handling**: Comprehensive logging, Arabic error messages, toast notifications
- **Deployment**: 
  - Backend: Heroku with PostgreSQL addon
  - Frontend: Vercel with automatic deployments
  - Database: Heroku PostgreSQL with connection pooling

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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or hosted)
- Git for version control

### Backend Setup
```bash
cd family-management-backend
npm install
cp .env.example .env  # Configure your database URL and session secret
npm run dev           # Starts on http://localhost:3000
```

### Frontend Setup  
```bash
cd family-management-frontend
npm install
cp .env.example .env  # Configure your backend API URL
npm run dev           # Starts on http://localhost:5173
```

### Database Schema
The application will automatically create the required database schema on first run using Drizzle ORM migrations.

### 📊 Excel Import Quick Start

1. **Access Import Page**: Login as admin → Sidebar → "استيراد العائلات"
2. **Download Template**: Click "تحميل النموذج" to get CSV template with all fields
3. **Prepare Your Excel File**:
   - Required fields: `husbandName`, `husbandID` (9 digits)
   - Optional fields: birth dates, jobs, phones, addresses, etc.
   - Max file size: 10MB
4. **Upload & Import**: Select file → Click "استيراد البيانات"
5. **Review Results**: Check success/error counts and detailed error list

**Example Excel Columns**:
```
husbandName | husbandID | husbandJob | primaryPhone | originalResidence | ...
محمد أحمد    | 123456789 | مهندس      | 0599123456   | غزة - الشجاعية    | ...
```

## 👤 User Roles & Permissions

- **🔴 Root**: Full system access, can create admins and manage all data
- **🟡 Admin**: Can manage families, users, and vouchers within their scope  
- **🟢 Head**: Family heads can view/edit their own family information and submit requests

## 💡 Recent Updates

### 🆕 Excel Import System (Latest)
The system now supports bulk importing of family heads from Excel files:
- **Excel File Upload**: Support for .xlsx and .xls file formats with drag & drop interface
- **Template Download**: CSV template with all required and optional fields
- **Data Validation**: Comprehensive validation including ID format, duplicates, and required fields
- **Bulk Processing**: Import hundreds of family records at once with detailed progress tracking
- **Error Handling**: Smart error detection with line-by-line error reporting
- **Enhanced Logging**: Detailed console logs with emoji indicators for easy monitoring
- **Toast Notifications**: Real-time feedback for success, partial success, and failure scenarios

### 🔧 Authentication Improvements
- **Dynamic Error Messages**: All error messages now come directly from backend in Arabic
- **Session Management**: Improved session handling to prevent false positive logins
- **Security Enhancements**: Better validation for non-existent users and invalid credentials

### 🆕 Polygamous Head Support  
The system provides comprehensive support for polygamous family structures:
- **Multiple Wives Management**: Add, edit, and delete multiple wives per family
- **Dynamic UI**: Interface adapts based on the number of wives (smart labeling)  
- **Advanced Search**: Search across all wives' data in admin functions
- **Export Integration**: PDF and Excel exports include all wives' information
- **Voucher Compatibility**: Support system works with polygamous families
- **Backward Compatibility**: Seamlessly works with existing single-wife family data

### 📊 Enhanced Export Features
- **Dynamic PDF Generation**: Multi-wife family summaries with proper Arabic RTL formatting
- **Advanced Excel Exports**: Dynamic column generation based on family structure
- **Statistical Reports**: Comprehensive family demographics including polygamous statistics

## 🚀 Deployment

### Production Environment
- **Backend**: Heroku with automatic deployments from main branch
- **Frontend**: Vercel with preview deployments for pull requests  
- **Database**: Heroku PostgreSQL with connection pooling and backups
- **Session Storage**: PostgreSQL-based sessions for cross-platform persistence

### Deployment Guides
See detailed deployment instructions:
- [Heroku Backend Deployment](./HEROKU_DEPLOYMENT.md) - Express.js API deployment
- [Vercel Frontend Deployment](./VERCEL_DEPLOYMENT.md) - React app deployment

## ⚙️ Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/family_management

# Session Security  
SESSION_SECRET=your-super-secure-random-secret-key

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development
```

### Frontend (.env)
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
```

### Production Environment Variables
For production deployment, set the same variables with your actual production URLs and secure secrets.

## 🛠️ Development

### Database Schema
The system uses PostgreSQL with the following main tables:
- `users` - User accounts and authentication
- `families` - Family head information  
- `wives` - Multiple wives support (new feature)
- `members` - Family members and children
- `requests` - Support requests from families
- `support_vouchers` - Aid distribution tracking
- `voucher_recipients` - Voucher recipient management

### API Endpoints
- **Authentication**: `/api/auth/*` - Login, logout, session management
- **Families**: `/api/families/*` - CRUD operations for family data
- **Wives**: `/api/wives/*` - Multiple wives management
- **Members**: `/api/members/*` - Family members management  
- **Requests**: `/api/requests/*` - Support request handling
- **Vouchers**: `/api/vouchers/*` - Voucher distribution system
- **Admin**: `/api/admin/*` - Administrative functions
- **Import**: `/api/admin/import-heads` - Excel file import for bulk family head creation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with modern React and Node.js technologies
- UI components powered by shadcn/ui
- Database management via Drizzle ORM
- Styling with Tailwind CSS
- Arabic language and RTL support