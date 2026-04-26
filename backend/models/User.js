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
            select: false
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
        },
        // Extended candidate profile
        resume: {
            filename: { type: String, default: '' },
            originalName: { type: String, default: '' },
            text: { type: String, default: '' },         // Extracted text for AI
            uploadedAt: { type: Date }
        },
        skills: [{ type: String }],
        headline: { type: String, default: '' },         // e.g. "Senior React Developer"
        location: { type: String, default: '' },
        bio: { type: String, default: '' },
        phone: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        github: { type: String, default: '' },
    },
    { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        next(error);
    }
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
