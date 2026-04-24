const Application = require('../models/Application');
const Job = require('../models/Job');

exports.applyToJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job || job.status === 'closed')
      return res.status(404).json({ success: false, message: 'Job not found or closed' });
    const existing = await Application.findOne({ job: req.params.jobId, candidate: req.user.id });
    if (existing)
      return res.status(400).json({ success: false, message: 'Already applied to this job' });
    const resumeData = req.file ? {
        filename: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size
    } : null;

    const app = await Application.create({
      job: req.params.jobId,
      candidate: req.user.id,
      coverLetter: req.body.coverLetter || ''
    });
    await Job.findByIdAndUpdate(req.params.jobId, { $inc: { applicationsCount: 1 } });
    res.status(201).json({ success: true, application: app });
  } catch (err) { next(err); }
};

exports.getMyApplications = async (req, res, next) => {
  try {
    const apps = await Application.find({ candidate: req.user.id })
      .populate('job', 'title company location type salary status')
      .sort('-createdAt');
    res.json({ success: true, count: apps.length, applications: apps });
  } catch (err) { next(err); }
};
exports.getAllApplications = async (req, res, next) => {
  try {
    const apps = await Application.find()
      .populate('candidate', 'name email')
      .populate('job', 'title company')
      .sort('-createdAt')
      .limit(100);
    res.json({ success: true, count: apps.length, applications: apps });
  } catch (err) { next(err); }
};

exports.withdrawApplication = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    if (app.candidate.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });
    app.status = 'Withdrawn';
    await app.save();
    await Job.findByIdAndUpdate(app.job, { $inc: { applicationsCount: -1 } });
    res.json({ success: true, application: app });
  } catch (err) { next(err); }
};

exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Applied','Under Review','Shortlisted','Interview Scheduled','Offered','Rejected'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });
    const app = await Application.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).populate('candidate', 'name email');
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, application: app });
  } catch (err) { next(err); }
};