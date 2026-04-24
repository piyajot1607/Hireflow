const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getAllJobs, getJob, createJob, updateJob, deleteJob, getMyJobs, getJobApplicants, saveJob, unsaveJob, getSavedJobs } = require('../controllers/jobController');

router.get('/', getAllJobs);                                           // public
router.get('/my-jobs', protect, authorize('recruiter'), getMyJobs);   // recruiter
router.get('/saved', protect, authorize('candidate'), getSavedJobs);
router.get('/:id', getJob);                                           // public
router.post('/', protect, authorize('recruiter', 'admin'), createJob);
router.put('/:id', protect, authorize('recruiter', 'admin'), updateJob);
router.delete('/:id', protect, authorize('recruiter', 'admin'), deleteJob);
router.get('/:id/applicants', protect, authorize('recruiter', 'admin'), getJobApplicants);
router.post('/:id/save', protect, authorize('candidate'), saveJob);    // ← ADD
router.delete('/:id/save', protect, authorize('candidate'), unsaveJob);

module.exports = router;