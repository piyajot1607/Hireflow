/**
 * HireFlow Backend Server
 * Entry point for the application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Rate limiter for auth routes (max 20 requests per 15 min)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

// Initialize Express app — MUST come before any app.use()
const app = express();

// ==================== MIDDLEWARE ====================

// Connect to MongoDB
connectDB();

// CORS middleware — should be first
const allowedOrigins = [
    'http://localhost:5500',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:3000'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        console.log(`CORS request from: ${origin}`);
        return callback(null, true); // Allow all for development
    },
    credentials: true
}));

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (resumes, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== ROUTES ====================

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date() });
});

// Auth routes (rate limited)
app.use('/api/auth', authLimiter, authRoutes);

// Job routes
app.use('/api/jobs', jobRoutes);

// Application routes
app.use('/api/applications', applicationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// ==================== ERROR HANDLER ====================

// Central error handling middleware (must be last)
app.use(errorHandler);

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    process.exit(1);
});
