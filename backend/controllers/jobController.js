const Job = require('../models/job');

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
    const jobs = await Job.find(filter).populate('recruiter', 'name email').sort('-createdAt');
    res.json({ success: true, count: jobs.length, jobs });
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
    const job = await Job.create({ ...req.body, recruiter: req.user.id });
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
    const apps = await Application.find({ job: req.params.id })
      .populate('candidate', 'name email');
    res.json({ success: true, count: apps.length, applications: apps });
  } catch (err) { next(err); }
};