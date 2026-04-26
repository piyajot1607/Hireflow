/**
 * Authentication Controller
 * Handles signup, login, token generation, profile, and resume upload
 */

const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateSignup, validateLogin } = require('../utils/validators');
const { extractTextFromFile } = require('../utils/resumeParser');

// ==================== HELPER FUNCTIONS ====================

const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);
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

        const validation = validateSignup(name, email, password, role);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase(),
            password,
            role: role || 'candidate'
        });

        sendTokenResponse(user, 201, res);
    } catch (error) {
        next(error);
    }
};

// ==================== LOGIN ====================

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const validation = validateLogin(email, password);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isPasswordMatch = await user.matchPassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

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
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                headline: user.headline,
                location: user.location,
                bio: user.bio,
                phone: user.phone,
                linkedin: user.linkedin,
                github: user.github,
                skills: user.skills,
                resume: user.resume,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// ==================== UPDATE PROFILE ====================

exports.updateProfile = async (req, res, next) => {
    try {
        const allowedFields = ['headline', 'location', 'bio', 'phone', 'linkedin', 'github', 'skills'];
        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// ==================== UPLOAD RESUME ====================

exports.uploadResume = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Extract text from the uploaded file for AI analysis
        const resumeText = await extractTextFromFile(req.file.path, req.file.mimetype);

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            {
                resume: {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    text: resumeText,
                    uploadedAt: new Date()
                }
            },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Resume uploaded successfully',
            resume: {
                filename: updatedUser.resume.filename,
                originalName: updatedUser.resume.originalName,
                uploadedAt: updatedUser.resume.uploadedAt,
                url: `/uploads/resumes/${req.file.filename}`
            }
        });
    } catch (error) {
        next(error);
    }
};
