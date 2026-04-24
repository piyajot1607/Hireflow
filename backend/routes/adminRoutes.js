const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Application = require('../models/Application');

// GET all users (admin only)
router.get('/users', protect, authorize('admin'), async (req, res, next) => {
    try {
        const users = await User.find().select('-password').sort('-createdAt');
        res.json({ success: true, count: users.length, users });
    } catch (err) { next(err); }
});

// DELETE a user (admin only)
router.delete('/users/:id', protect, authorize('admin'), async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot delete admin user' });
        await user.deleteOne();
        res.json({ success: true, message: 'User deleted' });
    } catch (err) { next(err); }
});

// GET platform statistics
router.get('/stats', protect, authorize('admin'), async (req, res, next) => {
    try {
        const [totalUsers, totalJobs, totalApplications] = await Promise.all([
            User.countDocuments(),
            require('../models/Job').countDocuments(),
            Application.countDocuments()
        ]);
        res.json({ success: true, stats: { totalUsers, totalJobs, totalApplications } });
    } catch (err) { next(err); }
});

module.exports = router;