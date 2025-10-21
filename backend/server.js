const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();
const { testConnection } = require('./config/db');
const { autoMarkAbsent } = require('./jobs/autoMarkAbsent');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const shiftRoutes = require('./routes/shifts');
const payrollRoutes = require('./routes/payroll');
const performanceRoutes = require('./routes/performance');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const interviewResultsRoutes = require('./routes/interviewResults');
const interviewQuestionsRoutes = require('./routes/interviewQuestions');
const dashboardRoutes = require('./routes/dashboard');
const leaveRoutes = require('./routes/leaves');
const eventRoutes = require('./routes/events');
const notificationRoutes = require('./routes/notifications');
const departmentRoutes = require('./routes/departments');
const documentRoutes = require('./routes/documents');
const aiRoutes = require('./routes/ai');
const emailRoutes = require('./routes/emailRoutes');

const app = express();

// Test database connection on startup
testConnection().then(connected => {
  if (!connected) {
    console.error('❌ Failed to connect to database. Please check your configuration.');
    process.exit(1);
  }
});

// CORS configuration - MUST be before other middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Allow both ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - More lenient in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 in dev, 100 in prod
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/interview-results', interviewResultsRoutes);
app.use('/api/interview-questions', interviewQuestionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/emails', emailRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.status(200).json({
      success: true,
      message: 'Server is running',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  // Schedule auto-mark absent job to run daily at 7 PM (19:00)
  // Cron format: minute hour day month weekday
  // '0 19 * * *' = At 19:00 (7 PM) every day
  cron.schedule('0 19 * * *', () => {
    console.log('\n⏰ Running scheduled job: Auto-mark absent');
    autoMarkAbsent();
  }, {
    timezone: "Asia/Kolkata" // Set to your timezone (IST)
  });
  
  console.log('⏰ Cron job scheduled: Auto-mark absent at 7 PM daily');
  console.log(`🚀 API available at http://localhost:${PORT}/api`);
  console.log(`🔍 Health check at http://localhost:${PORT}/api/health`);
});