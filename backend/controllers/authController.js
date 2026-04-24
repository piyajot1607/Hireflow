/**
 * Authentication Controller
 * Handles signup, login, and token generation
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateSignup, validateLogin } = require('../utils/validators');

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate JWT Token
 * @param {string} userId - User ID
 * @returns {string} JWT Token
 */
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

/**
 * Send Response with Token
 */
const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        success: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        }
    });
};

// ==================== SIGNUP ====================

exports.signup = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate input
        const validation = validateSignup(name, email, password, role);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Create new user
        // Prevent self-assigning admin role
        const allowedRoles = ['candidate', 'recruiter'];
        const userRole = allowedRoles.includes(role) ? role : 'candidate';

        const user = await User.create({
             name: name.trim(),
            email: email.toLowerCase(),
            password,
            role: userRole   // ← use filtered role
        });
        

        // Send token response
        sendTokenResponse(user, 201, res);

    } catch (error) {
        next(error);
    }
};

// ==================== LOGIN ====================

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        const validation = validateLogin(email, password);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }

        // Find user and include password field
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordMatch = await user.matchPassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Send token response
        sendTokenResponse(user, 200, res);

    } catch (error) {
        next(error);
    }
};

// ==================== GET CURRENT USER ====================

exports.getCurrentUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(200).json({ success: true, message: 'If that email exists, a reset link was sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        console.log(`Password reset token for ${email}: ${resetToken}`);

        res.status(200).json({ success: true, message: 'If that email exists, a reset link was sent.' });
    } catch (err) {
        next(err);
    }
};
