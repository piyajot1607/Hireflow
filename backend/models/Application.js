const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coverLetter: { type: String, default: '' },
    resumeUrl: { type: String, default: '' },         // Path to uploaded resume file
    resumeText: { type: String, default: '' },         // Extracted text for AI analysis
    status: {
        type: String,
        enum: ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Offered', 'Rejected', 'Withdrawn'],
        default: 'Applied'
    },
    // AI scoring fields
    aiScore: { type: Number, default: null },           // 0-100 fit score
    aiSummary: { type: String, default: '' },           // AI explanation
    aiRankedAt: { type: Date, default: null },
}, { timestamps: true });

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);