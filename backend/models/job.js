const mongoose = require('mongoose');
const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, enum: ['Full-time','Part-time','Contract','Remote'], default: 'Full-time' },
  level: { type: String, enum: ['Entry Level','Mid Level','Senior'], default: 'Mid Level' },
  salary: String,
  description: { type: String, required: true },
  requirements: [String],
  skills: [String],
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active','closed'], default: 'active' },
  applicationsCount: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('Job', jobSchema);