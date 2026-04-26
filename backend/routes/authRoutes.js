/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const {
    signup,
    login,
    getCurrentUser,
    uploadResume,
    updateProfile
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { resumeUpload } = require('../utils/multerConfig');

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateProfile);
router.put('/upload-resume', protect, authorize('candidate'), resumeUpload.single('resume'), uploadResume);

module.exports = router;
