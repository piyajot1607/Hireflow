/**
 * Authentication Routes
 * Handles signup, login, and user authentication endpoints
 */

const express = require('express');
const router = express.Router();
const {
    signup,
    login,
    getCurrentUser,
    forgotPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ==================== PUBLIC ROUTES ====================

/**
 * POST /api/auth/signup
 * Create a new user account
 * Body: { name, email, password, role }
 */
router.post('/signup', signup);

/**
 * POST /api/auth/login
 * User login
 * Body: { email, password }
 */
router.post('/login', login);
router.post('/forgot-password', forgotPassword);

// ==================== PROTECTED ROUTES ====================

/**
 * GET /api/auth/me
 * Get current authenticated user
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', protect, getCurrentUser);

module.exports = router;
