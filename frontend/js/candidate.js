// ==================== CANDIDATE-SPECIFIC FUNCTIONALITY ====================

// API base URL
const CANDIDATE_API_BASE = 'http://localhost:5000';

// Store fetched jobs from API
let allJobs = [];

// Mock applications data (let so we can reassign from storage)
let mockApplications = [];
let pendingApplicationJob = null;

// Initialize candidate page
document.addEventListener('DOMContentLoaded', function () {
    loadJobListings();
    setupJobFilters();
    setupApplicationFilters();
    setupProfileForms();
    setupApplicationModals();
    setupApplyJobModal();
    loadMyApplicationsFromAPI(); // Load real applications from API
});

// ==================== JOB LISTING FUNCTIONALITY ====================

async function loadJobListings(filters = {}) {
    const jobListing = document.getElementById('jobListing');
    jobListing.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin"></i> Loading jobs...</div>';
    
    try {
        // Fetch jobs from API
        const params = new URLSearchParams();
        if (filters.keyword) params.append('search', filters.keyword);
        if (filters.location) params.append('location', filters.location);
        if (filters.types?.length) params.append('type', filters.types[0]);
        if (filters.levels?.length) params.append('level', filters.levels[0]);
        
        const res = await fetch(`${CANDIDATE_API_BASE}/api/jobs?${params}`);
        const data = await res.json();
        
        if (!data.success || !data.jobs || data.jobs.length === 0) {
            jobListing.innerHTML = '<div class="text-center py-5 text-muted"><h5>No jobs posted yet</h5><p>Check back soon for new opportunities!</p></div>';
            document.getElementById('jobCount').textContent = '0 jobs found';
            return;
        }
        
        // Store jobs globally for later access
        allJobs = data.jobs;
        
        let filteredJobs = data.jobs.filter(job => {
            // Salary filter
            if (filters.salaryMin || filters.salaryMax) {
                const jobSalaryMin = parseInt(job.salary?.split('-')[0] || 0);
                if (filters.salaryMin && jobSalaryMin < filters.salaryMin) return false;
                if (filters.salaryMax && jobSalaryMin > filters.salaryMax) return false;
            }
            return true;
        });

        // Sort jobs
        if (filters.sortBy === 'salary') {
            filteredJobs.sort((a, b) => {
                const aSalary = parseInt(a.salary?.split('-')[0] || 0);
                const bSalary = parseInt(b.salary?.split('-')[0] || 0);
                return bSalary - aSalary;
            });
        } else if (filters.sortBy === 'relevant' && filters.keyword) {
            // Simple relevance based on keyword match priority
            filteredJobs.sort((a, b) => {
                const keyword = filters.keyword.toLowerCase();
                const aMatch = a.title?.toLowerCase().includes(keyword) ? 1 : 0;
                const bMatch = b.title?.toLowerCase().includes(keyword) ? 1 : 0;
                return bMatch - aMatch;
            });
        }
        // else default to 'newest' (already sorted from API)

        // Update job count
        document.getElementById('jobCount').textContent = `${filteredJobs.length} jobs found`;

        // Display jobs
        jobListing.innerHTML = '';
        filteredJobs.slice(0, 8).forEach(job => {
            const saved = isSavedJob(job._id);
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            jobCard.innerHTML = `
                <div class="job-header">
                    <h5>${job.title}</h5>
                    <button class="btn btn-sm btn-${saved ? 'primary' : 'outline-primary'} save-job-btn" data-job-id="${job._id}">
                        <i class="fas fa-heart${saved ? '-solid' : ''}"></i> ${saved ? 'Saved' : 'Save'}
                    </button>
                </div>
                <p class="company">${job.company}</p>
                <p class="job-description">${job.description}</p>
                <div class="job-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                    <span><i class="fas fa-briefcase"></i> ${job.type}</span>
                    <span><i class="fas fa-dollar-sign"></i> $${job.salary}</span>
                </div>
                <button class="btn btn-primary btn-sm mt-3 apply-job-btn" data-job-id="${job._id}">Apply Now</button>
            `;
            jobListing.appendChild(jobCard);
        });

        // Reattach event listeners
        attachJobButtonListeners();
    } catch (err) {
        console.error('Failed to load jobs:', err);
        jobListing.innerHTML = '<div class="text-center py-5 text-danger"><h5>Failed to load jobs</h5><p>Please try again later.</p></div>';
    }
}

function setupJobFilters() {
    const filterInputs = document.querySelectorAll('.job-filter');
    const salaryMinSlider = document.getElementById('salaryMin');
    const salaryMaxSlider = document.getElementById('salaryMax');
    const clearBtn = document.getElementById('clearFilters');

    filterInputs.forEach(input => {
        input.addEventListener('change', applyJobFilters);
        if (input.type === 'text' || input.type === 'range') {
            input.addEventListener('input', applyJobFilters);
        }
    });

    // Update salary display
    if (salaryMinSlider) {
        salaryMinSlider.addEventListener('input', function () {
            document.getElementById('salaryMinDisplay').textContent = this.value;
            applyJobFilters();
        });
    }

    if (salaryMaxSlider) {
        salaryMaxSlider.addEventListener('input', function () {
            document.getElementById('salaryMaxDisplay').textContent = this.value;
            applyJobFilters();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            document.querySelectorAll('.job-filter').forEach(input => {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = false;
                } else if (input.type === 'range') {
                    input.value = input.id === 'salaryMax' ? '200' : '0';
                } else {
                    input.value = '';
                }
            });
            document.getElementById('salaryMinDisplay').textContent = '0';
            document.getElementById('salaryMaxDisplay').textContent = '200';
            loadJobListings();
        });
    }
}

function applyJobFilters() {
    const filters = {
        keyword: document.getElementById('jobKeyword')?.value || '',
        location: document.getElementById('jobLocation')?.value || '',
        types: Array.from(document.querySelectorAll('#fullTime, #partTime, #contract, #remote'))
            .filter(cb => cb.checked)
            .map(cb => cb.value),
        levels: Array.from(document.querySelectorAll('#entry, #mid, #senior'))
            .filter(cb => cb.checked)
            .map(cb => cb.value),
        salaryMin: parseInt(document.getElementById('salaryMin')?.value || 0) * 1000,
        salaryMax: parseInt(document.getElementById('salaryMax')?.value || 200) * 1000,
        sortBy: document.getElementById('sortBy')?.value || 'newest'
    };

    loadJobListings(filters);
}

function attachJobButtonListeners() {
    // Save job buttons
    document.querySelectorAll('.save-job-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const jobId = this.dataset.jobId;
            toggleSaveJob(jobId);
            
            if (this.classList.contains('btn-outline-primary')) {
                this.classList.remove('btn-outline-primary');
                this.classList.add('btn-primary');
                this.innerHTML = '<i class="fas fa-heart-solid"></i> Saved';
            } else {
                this.classList.add('btn-outline-primary');
                this.classList.remove('btn-primary');
                this.innerHTML = '<i class="fas fa-heart"></i> Save';
            }
        });
    });

    // Apply buttons
    document.querySelectorAll('.apply-job-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const jobId = this.dataset.jobId;
            const job = allJobs.find(j => j._id === jobId);
            if (job) {
                applyForJob(job);
            }
        });
    });
}

async function applyForJob(job) {
    const token = localStorage.getItem('hireflow_auth_token');
    if (!token) {
        showNotification('Please log in to apply for jobs', 'warning');
        return;
    }

    pendingApplicationJob = job;
    document.getElementById('applyJobTitle').textContent = job.title || 'Selected Job';
    document.getElementById('applyJobCompany').textContent = `${job.company || 'Company'} • ${job.location || 'Location'}`;
    document.getElementById('coverLetterInput').value = '';
    document.getElementById('applyResumeUpload').value = '';
    document.getElementById('applyJobError').className = 'alert alert-danger d-none mt-3 mb-0';
    document.getElementById('applyJobError').textContent = '';

    const modal = new bootstrap.Modal(document.getElementById('applyJobModal'));
    modal.show();
}

function setupApplyJobModal() {
    const form = document.getElementById('applyJobForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!pendingApplicationJob?._id) return;

        const submitBtn = document.getElementById('submitApplicationBtn');
        const errorBox = document.getElementById('applyJobError');
        const coverLetter = document.getElementById('coverLetterInput').value.trim();
        const resumeFile = document.getElementById('applyResumeUpload').files[0];
        const token = localStorage.getItem('hireflow_auth_token');

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        errorBox.className = 'alert alert-danger d-none mt-3 mb-0';

        try {
            const formData = new FormData();
            formData.append('coverLetter', coverLetter);
            if (resumeFile) formData.append('resume', resumeFile);

            const res = await fetch(`${CANDIDATE_API_BASE}/api/applications/job/${pendingApplicationJob._id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (!data.success) {
                errorBox.className = 'alert alert-danger mt-3 mb-0';
                errorBox.textContent = data.message || 'Failed to submit application.';
                return;
            }

            bootstrap.Modal.getInstance(document.getElementById('applyJobModal'))?.hide();
            showNotification(`Application submitted for ${pendingApplicationJob.title}`, 'success');
            pendingApplicationJob = null;
            await loadMyApplicationsFromAPI();
        } catch (err) {
            errorBox.className = 'alert alert-danger mt-3 mb-0';
            errorBox.textContent = 'Network error. Please try again.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Submit Application';
        }
    });
}

// Load real applications from API (if authenticated)
async function loadMyApplicationsFromAPI() {
    const token = localStorage.getItem('hireflow_auth_token');
    if (!token) {
        // Clear applications if not logged in
        mockApplications = [];
        filterApplications('all');
        return;
    }
    try {
        const res = await fetch(`${CANDIDATE_API_BASE}/api/applications/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.applications) {
            // Map API applications for display
            mockApplications = data.applications.map(app => ({
                id: app._id,
                jobTitle: app.job?.title || 'N/A',
                company: app.job?.company || 'N/A',
                status: app.status || 'Applied',
                appliedDate: new Date(app.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                updates: [app.status || 'Applied'],
                _apiId: app._id
            }));
            filterApplications('all');
        } else {
            mockApplications = [];
            filterApplications('all');
        }
    } catch (err) {
        console.warn('Could not load applications from API:', err);
        mockApplications = [];
        filterApplications('all');
    }
}

function isSavedJob(jobId) {
    const saved = JSON.parse(localStorage.getItem('hireflow_savedJobs') || '[]');
    return saved.includes(jobId);
}

function toggleSaveJob(jobId) {
    let saved = JSON.parse(localStorage.getItem('hireflow_savedJobs') || '[]');
    const index = saved.indexOf(jobId);
    
    if (index > -1) {
        saved.splice(index, 1);
    } else {
        saved.push(jobId);
    }
    
    localStorage.setItem('hireflow_savedJobs', JSON.stringify(saved));
}

// ==================== APPLICATION FUNCTIONALITY ====================

function setupApplicationFilters() {
    const filterRadios = document.querySelectorAll('.app-filter');
    
    filterRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            filterApplications(this.value);
        });
    });
}

function filterApplications(status) {
    const appList = document.getElementById('applicationsList');
    appList.innerHTML = '';
    
    let filtered = mockApplications;
    if (status !== 'all') {
        filtered = mockApplications.filter(app => app.status === status);
    }

    if (filtered.length === 0) {
        appList.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No applications found</td></tr>';
        return;
    }

    filtered.forEach(app => {
        const statusBadge = getStatusBadge(app.status);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${app.jobTitle}</strong></td>
            <td>${app.company}</td>
            <td>${statusBadge}</td>
            <td>${app.appliedDate}</td>
            <td>
                <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#appModal" data-app-id="${app.id}">View</button>
                <button class="btn btn-sm btn-outline-danger withdraw-app" data-app-id="${app.id}">Withdraw</button>
            </td>
        `;
        appList.appendChild(row);
    });

    attachApplicationListeners();
}

function getStatusBadge(status) {
    let className = 'bg-secondary';
    if (status === 'Under Review') className = 'bg-warning';
    if (status === 'Interview Scheduled') className = 'bg-success';
    if (status === 'Rejected') className = 'bg-danger';
    if (status === 'Accepted') className = 'bg-success';
    
    return `<span class="badge ${className}">${status}</span>`;
}

function attachApplicationListeners() {
    document.querySelectorAll('.withdraw-app').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            const appId = this.dataset.appId;
            const app = mockApplications.find(a => String(a.id) === String(appId));
            
            if (!app) return;

            if (!['Applied', 'Under Review', 'Shortlisted'].includes(app.status)) {
                showNotification('This application cannot be withdrawn at its current status', 'warning');
                return;
            }

            if (!confirm(`Withdraw application for ${app.jobTitle}?`)) {
                return;
            }

            if (app._apiId) {
                try {
                    const token = localStorage.getItem('hireflow_auth_token');
                    const res = await fetch(`${CANDIDATE_API_BASE}/api/applications/${app._apiId}/withdraw`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (!data.success) {
                        showNotification(data.message || 'Could not withdraw application', 'warning');
                        return;
                    }
                } catch (err) {
                    showNotification('Failed to withdraw application. Try again.', 'warning');
                    return;
                }
                await loadMyApplicationsFromAPI();
            } else {
                mockApplications = mockApplications.filter(a => String(a.id) !== String(appId));
                saveApplicationsToStorage();
                filterApplications('all');
                showNotification('Application withdrawn successfully', 'success');
            }
        });
    });
}

function setupApplicationModals() {
    const appModal = document.getElementById('appModal');
    if (!appModal) return;

    appModal.addEventListener('show.bs.modal', function (e) {
        const appId = e.relatedTarget.dataset.appId;
        const app = mockApplications.find(a => String(a.id) === String(appId));
        
        if (app) {
            const modalBody = document.getElementById('appModalBody');
            let timeline = app.updates.map((update, idx) => `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h6>${update}</h6>
                        <small class="text-muted">Step ${idx + 1}</small>
                    </div>
                </div>
            `).join('');

            modalBody.innerHTML = `
                <div class="mb-4">
                    <h5>${app.jobTitle}</h5>
                    <p class="text-muted">${app.company}</p>
                </div>
                
                <div class="mb-4">
                    <h6>Application Status</h6>
                    ${getStatusBadge(app.status)}
                </div>

                ${app.interviewDate ? `
                    <div class="mb-4 p-3 bg-light rounded">
                        <h6><i class="fas fa-calendar"></i> Interview Scheduled</h6>
                        <p>${app.interviewDate}</p>
                    </div>
                ` : ''}

                <div class="mb-4">
                    <h6>Timeline</h6>
                    <div class="timeline">
                        ${timeline}
                    </div>
                </div>

                <div class="mb-4">
                    <h6>Applied on</h6>
                    <p>${app.appliedDate}</p>
                </div>
            `;
        }
    });
}

// ==================== PROFILE FUNCTIONALITY ====================

function setupProfileForms() {
    // Personal Info Form
    const personalInfoForm = document.getElementById('personalInfoForm');
    if (personalInfoForm) {
        personalInfoForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            localStorage.setItem('hireflow_profile', JSON.stringify(data));
            showNotification('Personal information saved successfully!', 'success');
        });
    }

    // Profile picture upload
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    if (uploadPhotoBtn) {
        uploadPhotoBtn.addEventListener('click', function () {
            const fileInput = document.getElementById('profilePic');
            if (fileInput.files.length > 0) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    // Update profile picture in profile section
                    document.querySelector('.rounded-circle').src = e.target.result;
                    // Update header avatar
                    document.querySelector('.profile-avatar').src = e.target.result;
                    localStorage.setItem('hireflow_profilePic', e.target.result);
                    showNotification('Profile picture updated successfully!', 'success');
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                showNotification('Please select a file first', 'warning');
            }
        });
    }

    // Load profile picture from localStorage
    const savedProfilePic = localStorage.getItem('hireflow_profilePic');
    if (savedProfilePic) {
        const profileImg = document.querySelector('.rounded-circle');
        const headerAvatar = document.querySelector('.profile-avatar');
        if (profileImg) profileImg.src = savedProfilePic;
        if (headerAvatar) headerAvatar.src = savedProfilePic;
    }

    // Resume upload
    const uploadResumeBtn = document.getElementById('uploadResumeBtn');
    if (uploadResumeBtn) {
        uploadResumeBtn.addEventListener('click', async function () {
            const fileInput = document.getElementById('resumeUpload');
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const uploaded = await uploadResumeToAPI(file);
                if (uploaded) {
                    document.getElementById('resumeFile').textContent = uploaded.originalName || file.name;
                    localStorage.setItem('hireflow_resumeName', uploaded.originalName || file.name);
                    fileInput.value = '';
                }
            } else {
                showNotification('Please select a file first', 'warning');
            }
        });
    }

    const quickUploadBtn = document.getElementById('quickUploadResumeBtn');
    if (quickUploadBtn) {
        quickUploadBtn.addEventListener('click', function () {
            const resumeInput = document.getElementById('resumeUpload');
            if (!resumeInput) return;
            navigateToProfileSection();
            resumeInput.click();
        });
    }

    const resumeInputEl = document.getElementById('resumeUpload');
    if (resumeInputEl) {
        resumeInputEl.addEventListener('change', async function () {
            if (!this.files.length) return;
            const uploaded = await uploadResumeToAPI(this.files[0]);
            if (uploaded) {
                document.getElementById('resumeFile').textContent = uploaded.originalName || this.files[0].name;
                localStorage.setItem('hireflow_resumeName', uploaded.originalName || this.files[0].name);
                this.value = '';
            }
        });
    }

    // Resume download
    const downloadResumeBtn = document.getElementById('downloadResume');
    if (downloadResumeBtn) {
        downloadResumeBtn.addEventListener('click', function () {
            alert('Resume download functionality would connect to backend storage');
        });
    }

    // Resume delete
    const deleteResumeBtn = document.getElementById('deleteResume');
    if (deleteResumeBtn) {
        deleteResumeBtn.addEventListener('click', function () {
            if (confirm('Delete resume?')) {
                document.getElementById('resumeFile').textContent = 'No resume uploaded';
                localStorage.removeItem('hireflow_resumeName');
                showNotification('Resume deleted', 'success');
            }
        });
    }

    // Work experience form
    setupExperienceHandlers();
    
    // Education form
    setupEducationHandlers();
    
    // Skills form
    setupSkillsHandlers();
}

function setupExperienceHandlers() {
    const form = document.getElementById('experienceForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            const experience = JSON.parse(localStorage.getItem('hireflow_experience') || '[]');
            experience.push({
                id: Date.now(),
                ...data
            });
            
            localStorage.setItem('hireflow_experience', JSON.stringify(experience));
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('experienceModal'));
            modal.hide();
            form.reset();
            
            showNotification('Experience added successfully!', 'success');
        });
    }

    // Delete experience
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('delete-exp')) {
            if (confirm('Delete this experience?')) {
                const experience = JSON.parse(localStorage.getItem('hireflow_experience') || '[]');
                localStorage.setItem('hireflow_experience', JSON.stringify(experience));
                showNotification('Experience deleted', 'success');
            }
        }
    });
}

function setupEducationHandlers() {
    const form = document.getElementById('educationForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            const education = JSON.parse(localStorage.getItem('hireflow_education') || '[]');
            education.push({
                id: Date.now(),
                ...data
            });
            
            localStorage.setItem('hireflow_education', JSON.stringify(education));
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('educationModal'));
            modal.hide();
            form.reset();
            
            showNotification('Education added successfully!', 'success');
        });
    }

    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('delete-edu')) {
            if (confirm('Delete this education?')) {
                showNotification('Education deleted', 'success');
            }
        }
    });
}

function setupSkillsHandlers() {
    const form = document.getElementById('skillForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const skillName = document.querySelector('input[name="skillName"]').value;
            
            const skills = JSON.parse(localStorage.getItem('hireflow_skills') || '[]');
            skills.push({
                id: Date.now(),
                name: skillName
            });
            
            localStorage.setItem('hireflow_skills', JSON.stringify(skills));
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('skillModal'));
            modal.hide();
            form.reset();
            
            showNotification('Skill added successfully!', 'success');
        });
    }

    document.addEventListener('click', function (e) {
        if (e.target.parentElement.dataset.skillId) {
            const skillId = e.target.parentElement.dataset.skillId;
            if (confirm('Delete this skill?')) {
                showNotification('Skill deleted', 'success');
            }
        }
    });
}

// ==================== UTILITY FUNCTIONS ====================

function showNotification(message, type = 'info') {
    const alertClass = `alert-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'}`;
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass} alert-dismissible fade show`;
    alert.style.position = 'fixed';
    alert.style.top = '70px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

async function uploadResumeToAPI(file) {
    try {
        const token = localStorage.getItem('hireflow_auth_token');
        if (!token) {
            showNotification('Please log in to upload resume', 'warning');
            return null;
        }

        const formData = new FormData();
        formData.append('resume', file);

        const res = await fetch(`${CANDIDATE_API_BASE}/api/auth/upload-resume`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();
        if (!data.success) {
            showNotification(data.message || 'Resume upload failed', 'warning');
            return null;
        }

        showNotification('Resume uploaded successfully!', 'success');
        return data.resume;
    } catch (err) {
        showNotification('Failed to upload resume. Please try again.', 'warning');
        return null;
    }
}

function navigateToProfileSection() {
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));

    const profileLink = document.querySelector('.sidebar .nav-link[data-page="profile"]');
    const profileSection = document.getElementById('profile');
    const titleEl = document.getElementById('pageTitle');

    if (profileLink) profileLink.classList.add('active');
    if (profileSection) profileSection.classList.add('active');
    if (titleEl) titleEl.textContent = 'My Profile';
}

function saveApplicationsToStorage() {
    localStorage.setItem('hireflow_applications', JSON.stringify(mockApplications));
}

function loadApplicationsFromStorage() {
    const stored = localStorage.getItem('hireflow_applications');
    if (stored) {
        mockApplications = JSON.parse(stored);
    }
}

// Load data on page load
window.addEventListener('load', function () {
    loadApplicationsFromStorage();
    filterApplications('all');
});

// Add CSS for timeline
const style = document.createElement('style');
style.textContent = `
    .timeline {
        position: relative;
        padding: 20px 0;
    }

    .timeline-item {
        display: flex;
        margin-bottom: 20px;
        position: relative;
    }

    .timeline-dot {
        width: 12px;
        height: 12px;
        background: #667eea;
        border-radius: 50%;
        margin-top: 5px;
        margin-right: 20px;
        flex-shrink: 0;
    }

    .timeline-content {
        flex: 1;
    }

    .timeline-content h6 {
        margin-bottom: 5px;
        color: #333;
    }

    .experience-item,
    .education-item {
        padding: 15px 0;
    }

    .skill-item {
        display: inline-block;
    }
`;
document.head.appendChild(style);

// On page load, try to load real applications from API
document.addEventListener('DOMContentLoaded', function () {
    loadMyApplicationsFromAPI();
});
