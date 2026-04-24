const mongoose = require('mongoose');
const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coverLetter: String,
  resume: {
      filename: String,       // original file name
      path: String,           // path on server disk
      mimetype: String,       // e.g. application/pdf
      size: Number            // in bytes
  },
  status: { type: String, enum: ['Applied','Under Review','Shortlisted','Interview Scheduled','Offered','Rejected','Withdrawn'], default: 'Applied' }
}, { timestamps: true });
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true }); // prevent duplicate apps
module.exports = mongoose.model('Application', applicationSchema);