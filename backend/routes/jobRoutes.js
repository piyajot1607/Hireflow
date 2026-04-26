const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getAllJobs, getJob, createJob, updateJob, deleteJob, getMyJobs } = require('../controllers/jobController');

router.get('/', getAllJobs);                                             // public
router.get('/my-jobs', protect, authorize('recruiter'), getMyJobs);     // recruiter
router.get('/:id', getJob);                                             // public
router.post('/', protect, authorize('recruiter', 'admin'), createJob);
router.put('/:id', protect, authorize('recruiter', 'admin'), updateJob);
router.delete('/:id', protect, authorize('recruiter', 'admin'), deleteJob);

module.exports = router;