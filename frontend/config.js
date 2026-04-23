// ==================== HireFlow Configuration ====================
// This file contains all configuration settings for the login page
// Modify these values to connect to your backend API

const HireFlowConfig = {
    // ==================== API Configuration ====================
    API: {
        // Base URL for all API calls
        BASE_URL: 'http://localhost:5000',
        
        // API Endpoints
        ENDPOINTS: {
            LOGIN: '/api/auth/login',
            FORGOT_PASSWORD: '/api/auth/forgot-password',
            RESET_PASSWORD: '/api/auth/reset-password',
            VERIFY_EMAIL: '/api/auth/verify-email',
            SIGNUP: '/api/auth/signup'
        },
        
        // Request timeout (milliseconds)
        TIMEOUT: 10000,
        
        // Use mock data (for development/testing)
        USE_MOCK_DATA: false
    },

    // ==================== User Types ====================
    USER_TYPES: {
        CANDIDATE: 'candidate',
        RECRUITER: 'recruiter',
        ADMIN: 'admin'
    },

    // ==================== Dashboard Routes ====================
    DASHBOARDS: {
        candidate: '/dashboards/candidate-dashboard.html',
        recruiter: '/dashboards/recruiter-dashboard.html',
        admin: '/dashboards/admin-dashboard.html'
    },

    // ==================== Local Storage Keys ====================
    STORAGE_KEYS: {
        AUTH_TOKEN: 'hireflow_auth_token',
        REFRESH_TOKEN: 'hireflow_refresh_token',
        USER_EMAIL: 'hireflow_email',
        USER_TYPE: 'hireflow_userType',
        USER_ID: 'hireflow_userId',
        REMEMBER_ME: 'hireflow_remember_me'
    },

    // ==================== Security Settings ====================
    SECURITY: {
        // Password requirements
        PASSWORD_MIN_LENGTH: 6,
        PASSWORD_REQUIRE_UPPERCASE: false,
        PASSWORD_REQUIRE_NUMBERS: false,
        PASSWORD_REQUIRE_SPECIAL_CHARS: false,
        
        // Session timeout (in minutes)
        SESSION_TIMEOUT: 30,
        
        // Maximum login attempts before lockout
        MAX_LOGIN_ATTEMPTS: 5,
        
        // Lockout duration (in minutes)
        LOCKOUT_DURATION: 15
    },

    // ==================== UI Settings ====================
    UI: {
        // Theme colors
        PRIMARY_COLOR: '#667eea',
        SECONDARY_COLOR: '#764ba2',
        SUCCESS_COLOR: '#198754',
        ERROR_COLOR: '#dc3545',
        WARNING_COLOR: '#ffc107',
        
        // Animation duration (milliseconds)
        ANIMATION_DURATION: 300,
        
        // Show branding on mobile
        SHOW_BRANDING_MOBILE: false
    },

    // ==================== Feature Flags ====================
    FEATURES: {
        REMEMBER_ME: true,
        FORGOT_PASSWORD: true,
        SOCIAL_LOGIN: false,
        TWO_FACTOR_AUTH: false,
        EMAIL_VERIFICATION: false,
        SIGN_UP: true
    },

    // ==================== Social Login Settings ====================
    SOCIAL_LOGIN: {
        GOOGLE_CLIENT_ID: 'your-google-client-id',
        GITHUB_CLIENT_ID: 'your-github-client-id',
        MICROSOFT_CLIENT_ID: 'your-microsoft-client-id'
    },

    // ==================== Email Settings ====================
    EMAIL: {
        // Email provider (e.g., 'sendgrid', 'mailgun', 'aws-ses')
        PROVIDER: 'sendgrid',
        
        // Sender email
        FROM_EMAIL: 'noreply@hireflow.com',
        
        // Password reset email template
        RESET_EMAIL_TEMPLATE: 'password-reset',
        
        // Verification email template
        VERIFY_EMAIL_TEMPLATE: 'email-verification'
    },

    // ==================== Logging & Analytics ====================
    LOGGING: {
        // Enable console logging
        ENABLE_CONSOLE_LOG: true,
        
        // Log level: 'debug', 'info', 'warn', 'error'
        LOG_LEVEL: 'debug',
        
        // Enable analytics tracking
        ENABLE_ANALYTICS: false,
        
        // Analytics service (e.g., 'google', 'mixpanel', 'segment')
        ANALYTICS_SERVICE: 'google',
        
        // Google Analytics ID (if using Google Analytics)
        GA_ID: 'your-ga-id'
    },

    // ==================== Mock User Data (for development) ====================
    MOCK_USERS: {
        candidate: {
            'candidate@example.com': 'password123'
        },
        recruiter: {
            'recruiter@example.com': 'password123'
        },
        admin: {
            'admin@example.com': 'password123'
        }
    },

    // ==================== Utility Methods ====================

    /**
     * Get full API URL for an endpoint
     * @param {string} endpoint - The endpoint path
     * @returns {string} Full API URL
     */
    getApiUrl(endpoint) {
        return this.API.BASE_URL + (this.API.ENDPOINTS[endpoint] || endpoint);
    },

    /**
     * Get dashboard URL for a user type
     * @param {string} userType - The user type
     * @returns {string} Dashboard URL
     */
    getDashboardUrl(userType) {
        return this.DASHBOARDS[userType] || '/';
    },

    /**
     * Check if a feature is enabled
     * @param {string} feature - The feature name
     * @returns {boolean} Feature enabled status
     */
    isFeatureEnabled(feature) {
        return this.FEATURES[feature] === true;
    },

    /**
     * Get storage key
     * @param {string} key - The key name
     * @returns {string} Storage key
     */
    getStorageKey(key) {
        return this.STORAGE_KEYS[key] || key;
    },

    /**
     * Validate password against requirements
     * @param {string} password - The password to validate
     * @returns {object} Validation result with message
     */
    validatePassword(password) {
        if (password.length < this.SECURITY.PASSWORD_MIN_LENGTH) {
            return {
                valid: false,
                message: `Password must be at least ${this.SECURITY.PASSWORD_MIN_LENGTH} characters`
            };
        }

        if (this.SECURITY.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            return {
                valid: false,
                message: 'Password must contain at least one uppercase letter'
            };
        }

        if (this.SECURITY.PASSWORD_REQUIRE_NUMBERS && !/[0-9]/.test(password)) {
            return {
                valid: false,
                message: 'Password must contain at least one number'
            };
        }

        if (this.SECURITY.PASSWORD_REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*]/.test(password)) {
            return {
                valid: false,
                message: 'Password must contain at least one special character (!@#$%^&*)'
            };
        }

        return {
            valid: true,
            message: 'Password is valid'
        };
    },

    /**
     * Log message to console (if enabled)
     * @param {string} level - Log level (debug, info, warn, error)
     * @param {string} message - Log message
     * @param {object} data - Additional data to log
     */
    log(level, message, data = null) {
        if (!this.LOGGING.ENABLE_CONSOLE_LOG) return;

        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

        switch (level) {
            case 'debug':
                console.debug(prefix, message, data);
                break;
            case 'info':
                console.info(prefix, message, data);
                break;
            case 'warn':
                console.warn(prefix, message, data);
                break;
            case 'error':
                console.error(prefix, message, data);
                break;
            default:
                console.log(prefix, message, data);
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HireFlowConfig;
}
