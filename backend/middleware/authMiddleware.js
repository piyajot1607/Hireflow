/**
 * Authentication Middleware
 * Verifies JWT tokens and checks user roles
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT and attach user to request
 */
exports.protect = async (req, res, next) => {
    try {
        let token;

        // Get token from header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        // Verify token and attach full user (with role) to request
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        next(error);
    }
};

/**
 * Restrict access based on user role
 * Usage: app.get('/route', protect, authorize('admin'), controller);
 * @param {...string} roles - Allowed roles
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // req.user is already set by protect() — no DB call needed
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized for this action`
            });
        }
        next();
    };
};