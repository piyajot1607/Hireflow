const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    applyToJob,
    getMyApplications,
    withdrawApplication,
    updateApplicationStatus,
    getJobApplicants,
    rankApplicants
} = require('../controllers/applicationController');
const { resumeUpload } = require('../utils/multerConfig');

// Candidate routes
router.post('/job/:jobId', protect, authorize('candidate'), resumeUpload.single('resume'), applyToJob);
router.get('/my', protect, authorize('candidate'), getMyApplications);
router.patch('/:id/withdraw', protect, authorize('candidate'), withdrawApplication);

// Recruiter/admin routes
router.patch('/:id/status', protect, authorize('recruiter', 'admin'), updateApplicationStatus);
router.get('/job/:jobId', protect, authorize('recruiter', 'admin'), getJobApplicants);
router.post('/job/:jobId/rank', protect, authorize('recruiter', 'admin'), rankApplicants);

module.exports = router;