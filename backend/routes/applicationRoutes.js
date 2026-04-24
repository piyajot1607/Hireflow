const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../config/multer');
const { applyToJob, getMyApplications, withdrawApplication, updateApplicationStatus } = require('../controllers/applicationController');

router.post('/job/:jobId', protect, authorize('candidate'), upload.single('resume'), applyToJob);
router.get('/my', protect, authorize('candidate'), getMyApplications);
router.patch('/:id/withdraw', protect, authorize('candidate'), withdrawApplication);
router.patch('/:id/status', protect, authorize('recruiter', 'admin'), updateApplicationStatus);

module.exports = router;