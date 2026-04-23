/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

const errorHandler = (err, req, res, next) => {
    // Default error
    let error = {
        statusCode: err.statusCode || 500,
        message: err.message || 'Server Error'
    };

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        error.statusCode = 400;
        error.message = `${field} already exists`;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        error.statusCode = 400;
        error.message = Object.values(err.errors)
            .map(val => val.message)
            .join(', ');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.statusCode = 401;
        error.message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        error.statusCode = 401;
        error.message = 'Token expired';
    }

    // Cast error (invalid MongoDB ID)
    if (err.name === 'CastError') {
        error.statusCode = 400;
        error.message = 'Invalid ID format';
    }

    // Send response
    res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
