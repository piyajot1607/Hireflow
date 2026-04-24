const Job = require('../models/Job');
const User = require('../models/User');  // ← ADD THIS

exports.getAllJobs = async (req, res, next) => {
  try {
    const { type, level, location, search } = req.query;
    const filter = { status: 'active' };
    if (type) filter.type = type;
    if (level) filter.level = level;
    if (location) filter.location = new RegExp(location, 'i');
    if (search) filter.$or = [
      { title: new RegExp(search, 'i') },
      { company: new RegExp(search, 'i') }
    ];
    const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const skip = (page - 1) * limit;
const jobs = await Job.find(filter)
    .populate('recruiter', 'name email')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);
const total = await Job.countDocuments(filter);
res.json({ success: true, count: jobs.length, total, page, jobs });
  } catch (err) { next(err); }
};

exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('recruiter', 'name email');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, job });
  } catch (err) { next(err); }
};

exports.createJob = async (req, res, next) => {
  try {
    const { title, company, location, type, level, salary, description, requirements, skills } = req.body;
    const job = await Job.create({
        title, company, location, type, level, salary, description, requirements, skills,
        recruiter: req.user.id
    });
    res.status(201).json({ success: true, job });
  } catch (err) { next(err); }
};

exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.recruiter.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });
    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, job: updated });
  } catch (err) { next(err); }
};

exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.recruiter.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });
    await job.deleteOne();
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) { next(err); }
};

exports.getMyJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ recruiter: req.user.id }).sort('-createdAt');
    res.json({ success: true, count: jobs.length, jobs });
  } catch (err) { next(err); }
};

exports.getJobApplicants = async (req, res, next) => {
  try {
    const Application = require('../models/Application');
    // Verify the job belongs to the requesting recruiter (or is admin)
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (req.user.role !== 'admin' && job.recruiter.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const apps = await Application.find({ job: req.params.id })
      .populate('candidate', 'name email');
    res.json({ success: true, count: apps.length, applications: apps });
  } catch (err) { next(err); }

};
exports.saveJob = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { savedJobs: req.params.id } });
    res.json({ success: true, message: 'Job saved' });
  } catch (err) { next(err); }
};

exports.unsaveJob = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $pull: { savedJobs: req.params.id } });
    res.json({ success: true, message: 'Job unsaved' });
  } catch (err) { next(err); }
};

exports.getSavedJobs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('savedJobs');
    res.json({ success: true, jobs: user.savedJobs });
  } catch (err) { next(err); }
};