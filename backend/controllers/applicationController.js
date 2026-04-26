/**
 * Application Controller
 * Handles job applications, status updates, and AI ranking
 */

const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const Job = require('../models/job');
const User = require('../models/User');
const { extractTextFromFile } = require('../utils/resumeParser');
const { rankAllCandidates } = require('../utils/aiRanker');

function resolveResumePath(app) {
    const appResume = app.resumeUrl ? path.join(__dirname, '..', app.resumeUrl.replace(/^\//, '')) : '';
    if (appResume && fs.existsSync(appResume)) return appResume;

    const candidateFilename = app.candidate?.resume?.filename;
    if (!candidateFilename) return '';

    const candidateResume = path.join(__dirname, '..', 'uploads', 'resumes', candidateFilename);
    return fs.existsSync(candidateResume) ? candidateResume : '';
}

// ==================== APPLY TO JOB ====================
// Accepts multipart/form-data with optional resume file
exports.applyToJob = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params.jobId);
        if (!job || job.status === 'closed')
            return res.status(404).json({ success: false, message: 'Job not found or closed' });

        const existing = await Application.findOne({ job: req.params.jobId, candidate: req.user.id });
        if (existing)
            return res.status(400).json({ success: false, message: 'Already applied to this job' });

        // Handle uploaded resume (optional)
        let resumeUrl = '';
        let resumeText = '';

        if (req.file) {
            resumeUrl = `/uploads/resumes/${req.file.filename}`;
            // Extract text for AI analysis
            resumeText = await extractTextFromFile(req.file.path, req.file.mimetype);
            // Also update the user's profile resume
            await User.findByIdAndUpdate(req.user.id, {
                resume: {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    text: resumeText,
                    uploadedAt: new Date()
                }
            });
        } else {
            // Use candidate's existing profile resume
            const candidate = await User.findById(req.user.id);
            if (candidate?.resume?.text) {
                resumeText = candidate.resume.text;
                resumeUrl = candidate.resume.filename
                    ? `/uploads/resumes/${candidate.resume.filename}`
                    : '';
            }
        }

        const app = await Application.create({
            job: req.params.jobId,
            candidate: req.user.id,
            coverLetter: req.body.coverLetter || '',
            resumeUrl,
            resumeText,
        });

        await Job.findByIdAndUpdate(req.params.jobId, { $inc: { applicationsCount: 1 } });

        res.status(201).json({ success: true, application: app });
    } catch (err) { next(err); }
};

// ==================== GET MY APPLICATIONS (candidate) ====================
exports.getMyApplications = async (req, res, next) => {
    try {
        const apps = await Application.find({ candidate: req.user.id })
            .populate('job', 'title company location type salary status')
            .sort('-createdAt');
        res.json({ success: true, count: apps.length, applications: apps });
    } catch (err) { next(err); }
};

// ==================== WITHDRAW APPLICATION ====================
exports.withdrawApplication = async (req, res, next) => {
    try {
        const app = await Application.findById(req.params.id);
        if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
        if (app.candidate.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: 'Not authorized' });
        app.status = 'Withdrawn';
        await app.save();
        res.json({ success: true, application: app });
    } catch (err) { next(err); }
};

// ==================== UPDATE APPLICATION STATUS (recruiter/admin) ====================
exports.updateApplicationStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Offered', 'Rejected'];
        if (!validStatuses.includes(status))
            return res.status(400).json({ success: false, message: 'Invalid status' });

        const app = await Application.findByIdAndUpdate(
            req.params.id, { status }, { new: true }
        ).populate('candidate', 'name email');

        if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
        res.json({ success: true, application: app });
    } catch (err) { next(err); }
};

// ==================== GET JOB APPLICANTS (recruiter) ====================
exports.getJobApplicants = async (req, res, next) => {
    try {
        // Verify recruiter owns this job or is admin
        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
        if (job.recruiter.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const apps = await Application.find({ job: req.params.jobId })
            .populate('candidate', 'name email skills headline location resume')
            .sort('-createdAt');

        res.json({ success: true, count: apps.length, applications: apps });
    } catch (err) { next(err); }
};

// ==================== AI RANK APPLICANTS (recruiter) ====================
exports.rankApplicants = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
        if (job.recruiter.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const apps = await Application.find({
            job: req.params.jobId,
            status: { $ne: 'Withdrawn' }
        }).populate('candidate', 'name email skills headline resume');

        if (apps.length === 0)
            return res.json({ success: true, message: 'No applicants to rank', rankings: [] });

        // Backfill resume text for older applications where extraction previously failed.
        await Promise.all(apps.map(async (app) => {
            if (app.resumeText) return;

            if (app.candidate?.resume?.text) {
                app.resumeText = app.candidate.resume.text;
                return;
            }

            const resumePath = resolveResumePath(app);
            if (!resumePath) return;

            const extracted = await extractTextFromFile(resumePath, 'application/pdf');
            if (!extracted) return;

            app.resumeText = extracted;

            await Application.findByIdAndUpdate(app._id, { resumeText: extracted });
            if (app.candidate?._id) {
                await User.findByIdAndUpdate(app.candidate._id, { 'resume.text': extracted });
            }
        }));

        // Run AI ranking
        const rankings = await rankAllCandidates(job, apps);

        // Persist scores back to Application documents
        await Promise.all(rankings.map(r =>
            Application.findByIdAndUpdate(r.appId, {
                aiScore: r.score,
                aiSummary: r.summary,
                aiRankedAt: new Date()
            })
        ));

        // Return full applicant data merged with scores, sorted best-first
        const appsById = {};
        apps.forEach(app => { appsById[app._id.toString()] = app; });

        const rankedApps = rankings.map(r => ({
            ...appsById[r.appId.toString()].toObject(),
            aiScore: r.score,
            aiSummary: r.summary,
        }));

        res.json({ success: true, count: rankedApps.length, rankings: rankedApps });
    } catch (err) {
        if (err.message.includes('XAI_API_KEY') || err.message.includes('GOOGLE_API_KEY')) {
            return res.status(400).json({
                success: false,
                message: 'AI ranking is not configured. Please add your XAI_API_KEY to the backend .env file.'
            });
        }
        next(err);
    }
};