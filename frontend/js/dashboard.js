// ==================== HireFlow Dashboard ====================

const API_BASE = 'http://localhost:5000';

function getAuthHeaders() {
    const token = localStorage.getItem('hireflow_auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ---- AUTH GUARD (runs immediately) ----
(function () {
    const token = localStorage.getItem('hireflow_auth_token');
    const user  = JSON.parse(localStorage.getItem('hireflow_user') || 'null');

    if (!token || !user) {
        // Show a message briefly before redirecting
        document.addEventListener('DOMContentLoaded', function () {
            document.body.innerHTML = `
                <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
                            background:linear-gradient(135deg,#667eea,#764ba2);font-family:sans-serif;">
                    <div style="background:white;padding:40px;border-radius:15px;text-align:center;max-width:400px;">
                        <i class="fas fa-lock" style="font-size:3rem;color:#667eea;margin-bottom:20px;display:block;"></i>
                        <h4 style="margin-bottom:10px;">Session Expired</h4>
                        <p style="color:#666;margin-bottom:20px;">You need to login to access the dashboard.</p>
                        <a href="../index.html" style="background:#667eea;color:white;padding:12px 30px;
                           border-radius:8px;text-decoration:none;font-weight:600;">Go to Login</a>
                    </div>
                </div>`;
        });
        // Also redirect after 2 seconds
        setTimeout(() => { window.location.href = '../index.html'; }, 2000);
        return;
    }

    // ---- Populate user info in header ----
    document.addEventListener('DOMContentLoaded', function () {
        const nameEl  = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');
        const roleEl  = document.getElementById('userRole');
        const avatarEl = document.querySelector('.user-avatar-text');
        const userNameDisplay = document.getElementById('userNameDisplay');

        if (nameEl)   nameEl.textContent  = user.name  || 'User';
        if (emailEl)  emailEl.textContent = user.email || '';
        if (roleEl)   roleEl.textContent  = capitalize(user.role || '');
        if (avatarEl) avatarEl.textContent = (user.name || 'U')[0].toUpperCase();
        if (userNameDisplay) userNameDisplay.textContent = user.name || 'User';
    });
})();

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ==================== DASHBOARD NAV ====================

document.addEventListener('DOMContentLoaded', function () {

    const navLinks      = document.querySelectorAll('.sidebar .nav-link');
    const sidebar       = document.querySelector('.sidebar');
    const toggleBtn     = document.getElementById('toggleSidebar');
    const closeBtn      = document.getElementById('closeSidebar');
    const logoutBtn     = document.getElementById('logoutBtn');
    const notifBtn      = document.getElementById('notificationBtn');
    const pageTitleEl   = document.getElementById('pageTitle');

    const pageTitles = {
        dashboard:    'Dashboard',
        jobs:         'Explore Jobs',
        applications: 'My Applications',
        saved:        'Saved Jobs',
        profile:      'My Profile',
        messages:     'Messages',
        'post-job':   'Post a Job',
        'my-jobs':    'My Job Listings',
        candidates:   'Candidates',
        analytics:    'Analytics',
        users:        'User Management',
        settings:     'Settings'
    };

    // ---- Sidebar navigation ----
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (!page) return;

            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
            const section = document.getElementById(page);
            if (section) section.classList.add('active');

            if (pageTitleEl) pageTitleEl.textContent = pageTitles[page] || 'Dashboard';

            if (window.innerWidth < 768 && sidebar) {
                sidebar.classList.remove('active');
            }

            // Refresh data based on page
            const userRole = JSON.parse(localStorage.getItem('hireflow_user') || '{}').role;
            if (userRole === 'candidate') {
                if (page === 'dashboard') {
                    loadRecentApplications();
                    loadRecommendedJobs();
                    loadCandidateDashboardStats();
                } else if (page === 'saved') {
                    loadSavedJobs();
                } else if (page === 'applications') {
                    loadAllApplications();
                    setupApplicationFilters();
                } else if (page === 'profile') {
                    loadProfileData();
                    loadExperiences();
                    loadEducation();
                    loadSkills();
                    setupPhotoUpload();
                }
            }
        });
    });

    // ---- Sidebar toggle ----
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
    }
    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => sidebar.classList.remove('active'));
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', function (e) {
        if (window.innerWidth < 768 && sidebar) {
            if (!sidebar.contains(e.target) && toggleBtn && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });

    // ---- Logout ----
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (confirm('Are you sure you want to logout?')) {
                ['hireflow_auth_token','hireflow_user','hireflow_userType','hireflow_email'].forEach(k => {
                    localStorage.removeItem(k);
                });
                window.location.href = '../index.html';
            }
        });
    }

    // ---- Notifications ----
    if (notifBtn) {
        notifBtn.addEventListener('click', function () {
            alert('Notifications:\n\n• Your application is under review\n• Interview scheduled with Tech Corp\n• New job match: Senior Developer');
        });
    }

    // ---- Save job buttons ----
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        if ((btn.classList.contains('btn-outline-primary') || btn.classList.contains('save-btn')) &&
             btn.textContent.trim().startsWith('Save')) {
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary');
            btn.innerHTML = '<i class="fas fa-bookmark me-1"></i>Saved';
        }
    });

    // ---- Responsive resize ----
    window.addEventListener('resize', function () {
        if (window.innerWidth >= 768 && sidebar) {
            sidebar.classList.remove('active');
        }
    });

    // ---- Live search ----
    document.addEventListener('input', function (e) {
        if (e.target.placeholder && e.target.placeholder.toLowerCase().includes('search')) {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.job-card').forEach(card => {
                const title   = card.querySelector('h5')?.textContent.toLowerCase() || '';
                const company = card.querySelector('.company')?.textContent.toLowerCase() || '';
                card.style.display = (!term || title.includes(term) || company.includes(term)) ? '' : 'none';
            });
        }
    });

    // ---- Keyboard shortcuts ----
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.querySelector('input[placeholder*="earch"]')?.focus();
        }
        if (e.key === 'Escape' && sidebar?.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    console.log('✅ HireFlow Dashboard ready');

    // Load candidate dashboard data
    const userRole = JSON.parse(localStorage.getItem('hireflow_user') || '{}').role;
    if (userRole === 'candidate') {
        const dashboardLink = document.querySelector('[data-page="dashboard"]');
        if (dashboardLink) dashboardLink.click();
        setupPhotoUpload();
        setupProfileModalHandlers();
        startPolling();                                        // ← ADD
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();                  // ← ADD
        }
    }
});

// ==================== CANDIDATE DASHBOARD DATA LOADING ====================

async function loadCandidateDashboardStats() {
    try {
        const res = await fetch(`${API_BASE}/api/applications/my`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (!data.success || !data.applications) return;

        const applications = data.applications;
        
        // Count applications in progress (Under Review, Shortlisted)
        const inProgress = applications.filter(app => 
            app.status === 'Applied' || app.status === 'Under Review' || app.status === 'Shortlisted'
        ).length;

        // Count interview scheduled
        const interviews = applications.filter(app => 
            app.status === 'Interview Scheduled'
        ).length;

        // Update stats
        const statApplications = document.getElementById('statApplications');
        const statInterviews = document.getElementById('statInterviews');

        if (statApplications) statApplications.textContent = inProgress;
        if (statInterviews) statInterviews.textContent = interviews;

        // Count saved jobs
        const savedJobs = JSON.parse(localStorage.getItem('hireflow_savedJobs') || '[]');
        const statSavedJobs = document.getElementById('statSavedJobs');
        if (statSavedJobs) statSavedJobs.textContent = savedJobs.length;

    } catch (err) {
        console.warn('Failed to load dashboard stats:', err);
    }
}

async function loadRecentApplications() {
    try {
        const res = await fetch(`${API_BASE}/api/applications/my`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        const container = document.getElementById('recentApplicationsContainer');
        if (!container) return;

        if (!data.success || !data.applications || data.applications.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-4">No applications yet</p>';
            return;
        }

        // Get recent 3 applications, sorted by latest first
        const recent = data.applications.slice(0, 3);
        
        let html = '';
        recent.forEach(app => {
            const statusClass = getStatusBadgeClass(app.status);
            const appliedDate = new Date(app.createdAt);
            const daysAgo = Math.floor((Date.now() - appliedDate) / (1000 * 60 * 60 * 24));
            let dateText = 'Just now';
            if (daysAgo === 1) dateText = '1 day ago';
            else if (daysAgo > 1) dateText = `${daysAgo} days ago`;
            else if (Math.floor((Date.now() - appliedDate) / (1000 * 60 * 60)) > 0) {
                const hoursAgo = Math.floor((Date.now() - appliedDate) / (1000 * 60 * 60));
                dateText = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
            }

            html += `
                <div class="application-item">
                    <div class="app-company">
                        <h6>${app.job?.title || 'Job Title'}</h6>
                        <p>${app.job?.company || 'Company'}</p>
                    </div>
                    <div class="app-status">
                        <span class="badge ${statusClass}">${app.status}</span>
                    </div>
                    <div class="app-date">
                        <small>Applied ${dateText}</small>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (err) {
        console.warn('Failed to load recent applications:', err);
    }
}

async function loadRecommendedJobs() {
    try {
        const res = await fetch(`${API_BASE}/api/jobs`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        const container = document.getElementById('recommendedJobsContainer');
        if (!container) return;

        if (!data.success || !data.jobs || data.jobs.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-4">No jobs available</p>';
            return;
        }

        const savedJobs = JSON.parse(localStorage.getItem('hireflow_savedJobs') || '[]');
        
        // Get first 3 jobs as recommendations
        const recommended = data.jobs.slice(0, 3);
        
        let html = '';
        recommended.forEach(job => {
            const isSaved = savedJobs.includes(job._id);
            html += `
                <div class="recommended-job">
                    <div class="job-info">
                        <h6>${job.title}</h6>
                        <p>${job.company}</p>
                        <small><i class="fas fa-map-marker-alt"></i> ${job.location}</small>
                    </div>
                    <button class="btn btn-sm btn-${isSaved ? 'primary' : 'outline-primary'} save-recommended-job" data-job-id="${job._id}">
                        <i class=\"${isSaved ? 'fas' : 'far'} fa-heart\"></i>
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;

        // Add event listeners for save buttons
        document.querySelectorAll('.save-recommended-job').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const jobId = this.dataset.jobId;
                let saved = JSON.parse(localStorage.getItem('hireflow_savedJobs') || '[]');
                const index = saved.indexOf(jobId);
                
                if (index > -1) {
                    saved.splice(index, 1);
                    this.classList.remove('btn-primary');
                    this.classList.add('btn-outline-primary');
                    this.innerHTML = '<i class="fas fa-heart"></i>';
                } else {
                    saved.push(jobId);
                    this.classList.remove('btn-outline-primary');
                    this.classList.add('btn-primary');
                    this.innerHTML = '<i class="fas fa-heart"></i>';
                }
                
                localStorage.setItem('hireflow_savedJobs', JSON.stringify(saved));
                loadCandidateDashboardStats(); // Refresh stats
            });
        });
    } catch (err) {
        console.warn('Failed to load recommended jobs:', err);
    }
}

async function loadSavedJobs() {
    try {
        const res = await fetch(`${API_BASE}/api/jobs`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        const container = document.getElementById('savedJobsContainer');
        if (!container) return;

        if (!data.success || !data.jobs) {
            container.innerHTML = '<p class="text-muted text-center py-4">No jobs available</p>';
            return;
        }

        const savedJobIds = JSON.parse(localStorage.getItem('hireflow_savedJobs') || '[]');
        const savedJobs = data.jobs.filter(job => savedJobIds.includes(job._id));

        if (savedJobs.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-4">No saved jobs yet</p>';
            return;
        }

        let html = '';
        savedJobs.forEach(job => {
            html += `
                <div class="job-card">
                    <div class="job-header">
                        <h5>${job.title}</h5>
                        <button class="btn btn-sm btn-primary unsave-job" data-job-id="${job._id}">
                           <i class=\"fas fa-heart\"></i> Saved
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
                </div>
            `;
        });

        container.innerHTML = html;

        // Add event listeners for unsave buttons
        document.querySelectorAll('.unsave-job').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const jobId = this.dataset.jobId;
                let saved = JSON.parse(localStorage.getItem('hireflow_savedJobs') || '[]');
                saved = saved.filter(id => id !== jobId);
                localStorage.setItem('hireflow_savedJobs', JSON.stringify(saved));
                loadSavedJobs(); // Refresh
                loadCandidateDashboardStats(); // Refresh stats
            });
        });
    } catch (err) {
        console.warn('Failed to load saved jobs:', err);
    }
}

function getStatusBadgeClass(status) {
    const statusMap = {
        'Applied': 'bg-info',
        'Under Review': 'bg-warning',
        'Shortlisted': 'bg-primary',
        'Interview Scheduled': 'bg-success',
        'Offered': 'bg-success',
        'Rejected': 'bg-danger',
        'Withdrawn': 'bg-secondary'
    };
    return statusMap[status] || 'bg-secondary';
}

// ==================== MY APPLICATIONS REAL-TIME LOADING ====================

let allApplications = [];

async function loadAllApplications() {
    try {
        const res = await fetch(`${API_BASE}/api/applications/my`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (!data.success || !data.applications) {
            displayApplications([]);
            return;
        }

        allApplications = data.applications;
        displayApplications(allApplications);
    } catch (err) {
        console.warn('Failed to load applications:', err);
        displayApplications([]);
    }
}

function displayApplications(applications) {
    const container = document.getElementById('applicationsList');
    if (!container) return;

    if (applications.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No applications found</td></tr>';
        return;
    }

    let html = '';
    applications.forEach(app => {
        const statusClass = getStatusBadgeClass(app.status);
        const appliedDate = new Date(app.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        // Check if can withdraw (not rejected or withdrawn)
        const canWithdraw = !['Rejected', 'Withdrawn', 'Offered'].includes(app.status);
        
        html += `
            <tr>
                <td><strong>${app.job?.title || 'Job Title'}</strong></td>
                <td>${app.job?.company || 'Company'}</td>
                <td><span class="badge ${statusClass}">${app.status}</span></td>
                <td>${appliedDate}</td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary view-app" data-app-id="${app._id}" data-bs-toggle="modal" data-bs-target="#appModal">View</button>
                    ${canWithdraw ? `<button class="btn btn-sm btn-outline-danger withdraw-app" data-app-id="${app._id}">Withdraw</button>` : ''}
                </td>
            </tr>
        `;
    });

    container.innerHTML = html;
    attachApplicationEventListeners();
}

function setupApplicationFilters() {
    const filterRadios = document.querySelectorAll('.app-filter');
    filterRadios.forEach(radio => {
        radio.removeEventListener('change', handleApplicationFilterChange);
        radio.addEventListener('change', handleApplicationFilterChange);
    });
}

function handleApplicationFilterChange(e) {
    const status = e.target.value;
    let filtered = allApplications;

    if (status !== 'all') {
        if (status === 'Interview') {
            filtered = allApplications.filter(app => app.status === 'Interview Scheduled');
        } else {
            filtered = allApplications.filter(app => app.status === status);
        }
    }

    displayApplications(filtered);
}

function attachApplicationEventListeners() {
    // View application
    document.querySelectorAll('.view-app').forEach(btn => {
        btn.addEventListener('click', function () {
            const appId = this.dataset.appId;
            const app = allApplications.find(a => a._id === appId);
            if (app) {
                showApplicationModal(app);
            }
        });
    });

    // Withdraw application
    document.querySelectorAll('.withdraw-app').forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            const appId = this.dataset.appId;
            const app = allApplications.find(a => a._id === appId);
            
            if (app && confirm(`Are you sure you want to withdraw your application for ${app.job?.title}?`)) {
                try {
                    const res = await fetch(`${API_BASE}/api/applications/${appId}/withdraw`, {
                        method: 'PATCH',
                        headers: getAuthHeaders()
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        alert('Application withdrawn successfully');
                        loadAllApplications(); // Refresh the list
                        loadCandidateDashboardStats(); // Update stats
                    } else {
                        alert(data.message || 'Failed to withdraw application');
                    }
                } catch (err) {
                    console.error('Failed to withdraw:', err);
                    alert('Failed to withdraw application');
                }
            }
        });
    });
}

function showApplicationModal(app) {
    const modal = document.getElementById('appModal');
    if (!modal) return;

    const modalBody = document.getElementById('appModalBody');
    if (modalBody) {
        const statusClass = getStatusBadgeClass(app.status);
        const appliedDate = new Date(app.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        let content = `
            <div class="mb-4">
                <h5>${app.job?.title || 'Job Title'}</h5>
                <p class="text-muted">${app.job?.company || 'Company'}</p>
            </div>
            
            <div class="mb-4">
                <h6>Job Details</h6>
                <div class="row">
                    <div class="col-sm-6">
                        <small class="text-muted">Location</small><br>
                        <p>${app.job?.location || 'N/A'}</p>
                    </div>
                    <div class="col-sm-6">
                        <small class="text-muted">Job Type</small><br>
                        <p>${app.job?.type || 'N/A'}</p>
                    </div>
                </div>
                <small class="text-muted">Salary</small><br>
                <p>${app.job?.salary || 'Not specified'}</p>
            </div>

            <div class="mb-4">
                <h6>Application Status</h6>
                <span class="badge ${statusClass} p-2">${app.status}</span>
            </div>

            <div class="mb-4">
                <h6>Applied On</h6>
                <p>${appliedDate}</p>
            </div>

            ${app.coverLetter ? `
                <div class="mb-4">
                    <h6>Cover Letter</h6>
                    <p class="bg-light p-3 rounded">${app.coverLetter}</p>
                </div>
            ` : ''}

            <div class="mb-4">
                <h6>Job Description</h6>
                <p>${app.job?.description || 'No description available'}</p>
            </div>
        `;

        modalBody.innerHTML = content;
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// ==================== CANDIDATE PROFILE LOADING ====================

function loadProfileData() {
    const user = JSON.parse(localStorage.getItem('hireflow_user') || '{}');
    
    // Auto-populate from login details (read-only)
    const firstNameEl = document.getElementById('firstName');
    const lastNameEl = document.getElementById('lastName');
    const emailEl = document.getElementById('email');
    
    if (firstNameEl) firstNameEl.value = user.firstName || (user.name ? user.name.split(' ')[0] : '');
    if (lastNameEl) lastNameEl.value = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '');
    if (emailEl) emailEl.value = user.email || '';

    // Load other profile data from localStorage
    const profile = JSON.parse(localStorage.getItem('hireflow_profile') || '{}');
    const phoneEl = document.getElementById('phone');
    const locationEl = document.getElementById('location');
    const summaryEl = document.getElementById('summary');
    const linkedinEl = document.getElementById('linkedin');
    const githubEl = document.getElementById('github');
    const salaryEl = document.getElementById('salary');
    const availabilityEl = document.getElementById('availability');

    if (phoneEl) phoneEl.value = profile.phone || '';
    if (locationEl) locationEl.value = profile.location || '';
    if (summaryEl) summaryEl.value = profile.summary || '';
    if (linkedinEl) linkedinEl.value = profile.linkedin || '';
    if (githubEl) githubEl.value = profile.github || '';
    if (salaryEl) salaryEl.value = profile.salary || '';
    if (availabilityEl) availabilityEl.value = profile.availability || '';

    // Load profile picture
    loadProfilePicture();

    // Setup form submission
    const form = document.getElementById('personalInfoForm');
    if (form) {
        form.removeEventListener('submit', handleProfileSubmit);
        form.addEventListener('submit', handleProfileSubmit);
    }
}

function handleProfileSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const profile = Object.fromEntries(formData);

    // Remove read-only fields (firstName, lastName, email are from login)
    delete profile.firstName;
    delete profile.lastName;
    delete profile.email;

    localStorage.setItem('hireflow_profile', JSON.stringify(profile));
    
    const successMsg = document.createElement('div');
    successMsg.className = 'alert alert-success alert-dismissible fade show';
    successMsg.innerHTML = `
        <strong>Success!</strong> Your profile has been saved.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    successMsg.style.position = 'fixed';
    successMsg.style.top = '80px';
    successMsg.style.right = '20px';
    successMsg.style.zIndex = '9999';
    document.body.appendChild(successMsg);

    setTimeout(() => {
        successMsg.remove();
    }, 4000);
}

// ==================== PROFILE PICTURE HANDLERS ====================

function loadProfilePicture() {
    const savedPicture = localStorage.getItem('hireflow_profile_picture');
    
    if (savedPicture) {
        // Update profile picture display
        const profilePicDisplay = document.getElementById('profilePicDisplay');
        if (profilePicDisplay) {
            profilePicDisplay.src = savedPicture;
        }
        
        // Update topbar avatar
        const topbarAvatar = document.getElementById('topbarProfileAvatar');
        if (topbarAvatar) {
            topbarAvatar.src = savedPicture;
        }
    }
}

function setupPhotoUpload() {
    const fileInput = document.getElementById('profilePic');
    const uploadBtn = document.getElementById('uploadPhotoBtn');
    const profilePicDisplay = document.getElementById('profilePicDisplay');

    if (!fileInput || !uploadBtn || !profilePicDisplay) return;

    // Click upload button to select file
    uploadBtn.addEventListener('click', function () {
        fileInput.click();
    });

    // Click profile picture to select file
    profilePicDisplay.addEventListener('click', function () {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = function (event) {
            const base64String = event.target.result;
            updateProfilePicture(base64String);
        };
        reader.readAsDataURL(file);
    });
}

function updateProfilePicture(base64String) {
    // Save to localStorage
    localStorage.setItem('hireflow_profile_picture', base64String);

    // Update profile picture display
    const profilePicDisplay = document.getElementById('profilePicDisplay');
    if (profilePicDisplay) {
        profilePicDisplay.src = base64String;
    }

    // Update topbar avatar
    const topbarAvatar = document.getElementById('topbarProfileAvatar');
    if (topbarAvatar) {
        topbarAvatar.src = base64String;
    }

    // Show success message
    const successMsg = document.createElement('div');
    successMsg.className = 'alert alert-success alert-dismissible fade show';
    successMsg.innerHTML = `
        <strong>Success!</strong> Your profile picture has been updated.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    successMsg.style.position = 'fixed';
    successMsg.style.top = '80px';
    successMsg.style.right = '20px';
    successMsg.style.zIndex = '9999';
    document.body.appendChild(successMsg);

    setTimeout(() => {
        successMsg.remove();
    }, 4000);
}

function loadExperiences() {
    const experiences = JSON.parse(localStorage.getItem('hireflow_experience') || '[]');
    const container = document.getElementById('experienceList');
    
    if (!container) return;

    if (experiences.length === 0) {
        container.innerHTML = '<p class="text-muted">No experience added yet</p>';
        return;
    }

    let html = '';
    experiences.forEach((exp, index) => {
        html += `
            <div class="experience-item">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6>${exp.position || 'Position'}</h6>
                        <p class="text-muted">${exp.company || 'Company'}</p>
                        <small>${exp.startDate || 'Start'} - ${exp.endDate || 'End'}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-warning edit-exp" data-exp-index="${index}">Edit</button>
                        <button class="btn btn-sm btn-outline-danger delete-exp" data-exp-index="${index}">Delete</button>
                    </div>
                </div>
                <p>${exp.description || ''}</p>
            </div>
            ${index < experiences.length - 1 ? '<hr>' : ''}
        `;
    });

    container.innerHTML = html;

    // Attach delete handlers
    document.querySelectorAll('.delete-exp').forEach(btn => {
        btn.addEventListener('click', function () {
            const index = parseInt(this.dataset.expIndex);
            if (confirm('Delete this experience?')) {
                experiences.splice(index, 1);
                localStorage.setItem('hireflow_experience', JSON.stringify(experiences));
                loadExperiences();
            }
        });
    });
}

function loadEducation() {
    const education = JSON.parse(localStorage.getItem('hireflow_education') || '[]');
    const container = document.getElementById('educationList');
    
    if (!container) return;

    if (education.length === 0) {
        container.innerHTML = '<p class="text-muted">No education added yet</p>';
        return;
    }

    let html = '';
    education.forEach((edu, index) => {
        html += `
            <div class="education-item">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6>${edu.degree || 'Degree'}</h6>
                        <p class="text-muted">${edu.school || 'School'}</p>
                        <small>${edu.startYear || 'Start'} - ${edu.endYear || 'End'}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-warning edit-edu" data-edu-index="${index}">Edit</button>
                        <button class="btn btn-sm btn-outline-danger delete-edu" data-edu-index="${index}">Delete</button>
                    </div>
                </div>
                ${edu.gpa ? `<p>GPA: ${edu.gpa}</p>` : ''}
                ${edu.field ? `<p>Field: ${edu.field}</p>` : ''}
            </div>
            ${index < education.length - 1 ? '<hr>' : ''}
        `;
    });

    container.innerHTML = html;

    // Attach delete handlers
    document.querySelectorAll('.delete-edu').forEach(btn => {
        btn.addEventListener('click', function () {
            const index = parseInt(this.dataset.eduIndex);
            if (confirm('Delete this education?')) {
                education.splice(index, 1);
                localStorage.setItem('hireflow_education', JSON.stringify(education));
                loadEducation();
            }
        });
    });
}

function loadSkills() {
    const skills = JSON.parse(localStorage.getItem('hireflow_skills') || '[]');
    const container = document.getElementById('skillsList');
    
    if (!container) return;

    if (skills.length === 0) {
        container.innerHTML = '<p class="text-muted">No skills added yet</p>';
        return;
    }

    let html = '';
    skills.forEach((skill, index) => {
        html += `
            <span class="badge bg-primary p-2 me-2 mb-2">
                ${skill.name || skill} 
                <button class="btn-close btn-close-white btn-sm ms-1 delete-skill" data-skill-index="${index}" style="cursor: pointer;"></button>
            </span>
        `;
    });

    container.innerHTML = html;

    // Attach delete handlers
    document.querySelectorAll('.delete-skill').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const index = parseInt(this.dataset.skillIndex);
            if (confirm('Delete this skill?')) {
                skills.splice(index, 1);
                localStorage.setItem('hireflow_skills', JSON.stringify(skills));
                loadSkills();
            }
        });
    });
}

// ==================== PROFILE MODALS HANDLERS ====================

function setupProfileModalHandlers() {
    // Experience Modal
    const experienceForm = document.getElementById('experienceForm');
    if (experienceForm) {
        experienceForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const experience = {
                position: formData.get('jobTitle'),
                company: formData.get('company'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                currentlyWorking: formData.get('currentlyWorking') === 'on',
                description: formData.get('description'),
                id: Date.now()
            };
            
            const experiences = JSON.parse(localStorage.getItem('hireflow_experience') || '[]');
            experiences.push(experience);
            
            localStorage.setItem('hireflow_experience', JSON.stringify(experiences));
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('experienceModal'));
            if (modal) modal.hide();
            this.reset();
            loadExperiences();
        });
    }

    // Education Modal
    const educationForm = document.getElementById('educationForm');
    if (educationForm) {
        educationForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const education = {
                school: formData.get('school'),
                degree: formData.get('degree'),
                field: formData.get('field'),
                startYear: formData.get('startYear'),
                endYear: formData.get('endYear'),
                gpa: formData.get('gpa'),
                id: Date.now()
            };
            
            const educations = JSON.parse(localStorage.getItem('hireflow_education') || '[]');
            educations.push(education);
            
            localStorage.setItem('hireflow_education', JSON.stringify(educations));
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('educationModal'));
            if (modal) modal.hide();
            this.reset();
            loadEducation();
        });
    }

    // Skills Modal
    const skillForm = document.getElementById('skillForm');
    if (skillForm) {
        skillForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const skillName = formData.get('skillName');
            const proficiency = formData.get('proficiency');
            
            if (!skillName.trim()) {
                alert('Please enter a skill name');
                return;
            }
            
            const skills = JSON.parse(localStorage.getItem('hireflow_skills') || '[]');
            skills.push({
                id: Date.now(),
                name: skillName,
                proficiency: proficiency
            });
            
            localStorage.setItem('hireflow_skills', JSON.stringify(skills));
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('skillModal'));
            if (modal) modal.hide();
            this.reset();
            loadSkills();
        });
    }
}
// ==================== POLLING FOR REAL-TIME UPDATES ====================

let pollingInterval = null;

function startPolling() {
    pollingInterval = setInterval(async () => {
        const userRole = JSON.parse(localStorage.getItem('hireflow_user') || '{}').role;
        if (userRole === 'candidate') {
            await checkForApplicationStatusChanges();
        } else if (userRole === 'recruiter') {
            await checkForNewApplications();
        }
    }, 30000);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

async function checkForApplicationStatusChanges() {
    try {
        const res = await fetch(`${API_BASE}/api/applications/my`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.success) return;
        const previous = window._previousApplications || [];
        const current = data.applications;
        current.forEach(app => {
            const prev = previous.find(p => p._id === app._id);
            if (prev && prev.status !== app.status) {
                showRealTimeNotification(`Application Update`, `Your application for "${app.job?.title}" is now: ${app.status}`);
            }
        });
        window._previousApplications = current;
        loadCandidateDashboardStats();
    } catch (err) {}
}

async function checkForNewApplications() {
    try {
        const res = await fetch(`${API_BASE}/api/jobs/my-jobs`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.success) return;
        let total = 0;
        data.jobs.forEach(j => total += (j.applicationsCount || 0));
        const prev = window._previousApplicationCount || 0;
        if (total > prev) {
            showRealTimeNotification('New Application!', `You have ${total - prev} new application(s)`);
            updateDashboardStats();
        }
        window._previousApplicationCount = total;
    } catch (err) {}
}

function showRealTimeNotification(title, body) {
    const badge = document.querySelector('#notificationBtn .badge');
    if (badge) {
        badge.textContent = (parseInt(badge.textContent || '0') + 1);
        badge.style.display = 'block';
    }
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
    }
    const toast = document.createElement('div');
    toast.className = 'alert alert-info alert-dismissible fade show';
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;min-width:300px;';
    toast.innerHTML = `<strong>${title}</strong><br>${body}<button class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
}

window.addEventListener('beforeunload', stopPolling);