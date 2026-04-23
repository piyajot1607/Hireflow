/**
 * Input Validators
 * Validate user input for signup and login
 */

const validateSignup = (name, email, password, role) => {
    const errors = {};

    // Name validation
    if (!name || name.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!email || !emailRegex.test(email)) {
        errors.email = 'Please provide a valid email';
    }

    // Password validation
    if (!password || password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
    }

    // Role validation
    const validRoles = ['candidate', 'recruiter', 'admin'];
    if (role && !validRoles.includes(role)) {
        errors.role = 'Invalid role. Must be candidate, recruiter, or admin';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

const validateLogin = (email, password) => {
    const errors = {};

    // Email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!email || !emailRegex.test(email)) {
        errors.email = 'Please provide a valid email';
    }

    // Password validation
    if (!password) {
        errors.password = 'Password is required';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

module.exports = {
    validateSignup,
    validateLogin
};
