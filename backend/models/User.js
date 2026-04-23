/**
 * User Model
 * Defines the schema for users (candidates, recruiters, admins)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters']
        },
        email: {
            type: String,
            required: [true, 'Please provide an email'],
            unique: true,
            lowercase: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email'
            ]
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false // Don't return password by default
        },
        role: {
            type: String,
            enum: {
                values: ['candidate', 'recruiter', 'admin'],
                message: 'Role must be candidate, recruiter, or admin'
            },
            default: 'candidate'
        },
        isVerified: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// ==================== MIDDLEWARE ====================

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is new or modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        next(error);
    }
});

// ==================== METHODS ====================

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Create index on email for faster queries
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
