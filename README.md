# AI-HRMS (AI-Powered Human Resource Management System)

A comprehensive, modern HR management system built with React, Node.js, Python Flask, and Supabase.

## 🚀 Features

### Core HR Modules
- **Employee Management** - Complete employee lifecycle management
- **Attendance Tracking** - Real-time attendance monitoring with automated reports
- **Payroll Management** - Automated salary calculations and payslip generation
- **Performance Management** - Goal setting, reviews, and performance analytics
- **Leave Management** - Leave requests, approvals, and balance tracking

### AI-Powered Recruitment
- **Job Posting & Management** - Create and manage job openings
- **Application Tracking** - Streamlined candidate application process
- **AI Interview Questions** - Automated question generation based on job requirements
- **Communication Assessment** - AI-powered language and communication evaluation
- **Candidate Scoring** - Intelligent candidate ranking and recommendations

### Modern Features
- **Real-time Dashboard** - Role-based dashboards with key metrics
- **Mobile Responsive** - Optimized for all devices
- **Multi-role Support** - Admin, HR, Manager, Employee, and Candidate roles
- **Document Management** - Secure document storage and sharing
- **Notifications** - Real-time notifications and alerts

## 🏗️ Architecture

### Frontend
- **React 18** with modern hooks and context
- **Tailwind CSS** for responsive styling
- **Lucide React** for consistent iconography
- **Recharts** for data visualization

### Backend
- **Node.js & Express** - RESTful API server
- **JWT Authentication** - Secure token-based auth
- **Role-based Access Control** - Granular permissions
- **Automated Jobs** - Cron-based background tasks

### AI Service
- **Python Flask** - AI/ML microservice
- **Groq API Integration** - Advanced language model capabilities
- **Question Generation** - Dynamic interview question creation
- **Communication Assessment** - Language proficiency evaluation

### Database
- **Supabase (PostgreSQL)** - Scalable, real-time database
- **Row Level Security** - Database-level access control
- **Real-time Subscriptions** - Live data updates

## 📁 Project Structure

```
ai-hrms/
├── frontend/          # React application
├── backend/           # Node.js API server
├── ai-service/        # Python Flask AI service
├── database/          # Database schemas and migrations
└── docs/              # Documentation
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (>=18.0.0)
- Python (>=3.8)
- npm or yarn
- Supabase account

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-hrms
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure your environment variables
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Configure your environment variables
   npm run dev
   ```

4. **AI Service Setup**
   ```bash
   cd ai-service
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Configure your environment variables
   python app.py
   ```

## 🚀 Deployment

This project is configured for deployment on Render.com with the following services:
- **Backend**: Node.js web service
- **AI Service**: Python web service  
- **Frontend**: Static site
- **Database**: PostgreSQL database

See individual deployment guides in each service directory.

## 🔧 Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
AI_SERVICE_URL=http://localhost:5001
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### AI Service (.env)
```
FLASK_ENV=development
PORT=5001
GROQ_API_KEY=your_groq_api_key
```

## 👥 User Roles

- **Admin** - Full system access and user management
- **HR** - Employee management, recruitment, and reports
- **Manager** - Team management and performance reviews
- **Employee** - Personal dashboard, attendance, and leave requests
- **Candidate** - Job applications and interview assessments

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Supabase for the amazing backend-as-a-service platform
- Groq for AI/ML capabilities
- The open-source community for the fantastic tools and libraries

## 📞 Support

For support, email your-email@example.com or create an issue in this repository.
