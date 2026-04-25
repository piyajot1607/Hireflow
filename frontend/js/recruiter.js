// ==================== RECRUITER-SPECIFIC FUNCTIONALITY ====================

const API_BASE = 'http://localhost:5000';

function getAuthHeaders() {
    const token = localStorage.getItem('hireflow_auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ==================== POST JOB ====================
document.addEventListener('DOMContentLoaded', function () {
    loadRecruiterName();        // ← ADD
    loadMyJobs();
    updateDashboardStats();
    loadRecentApplications();   // ← ADD
    loadActiveJobPostings();
    const postJobForm = document.getElementById('postJobForm');
    if (postJobForm) {
        postJobForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            // Convert requirements and skills from textarea to arrays
            data.requirements = data.requirements
                ? data.requirements.split('\n').map(s => s.trim()).filter(Boolean)
                : [];
            data.skills = data.skills
                ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            const btn = this.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

            try {
                const res = await fetch(`${API_BASE}/api/jobs`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (result.success) {
                    alert('Job posted successfully!');
                    postJobForm.reset();
                    loadMyJobs(); // refresh my jobs list
                    updateDashboardStats(); // Update stats after posting
                    // Navigate to my-jobs section
                    document.querySelector('[data-page="my-jobs"]')?.click();
                } else {
                    alert(result.message || 'Failed to post job');
                }
            } catch (err) {
                alert('Network error. Please try again.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Job';
            }
        });
    }

   
});
document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', function () {
        const page = this.dataset.page;
        if (page === 'applications') loadAllApplications();
        if (page === 'candidates') loadShortlistedCandidates();
    });
});

// ==================== LOAD MY JOBS ====================
async function loadMyJobs() {
    const container = document.getElementById('myJobsList');
    if (!container) return;

    container.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/api/jobs/my-jobs`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (!data.success || data.jobs.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No jobs posted yet</td></tr>';
            return;
        }

        container.innerHTML = '';
        data.jobs.forEach(job => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${job.title}</strong><br><small class="text-muted">${job.company}</small></td>
                <td><span class="badge bg-${job.status === 'active' ? 'success' : 'secondary'}">${job.status}</span></td>
                <td>${job.applicationsCount || 0}</td>
                <td>${new Date(job.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewApplicants('${job._id}', '${job.title}')">
                        <i class="fas fa-users"></i> Applicants
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteJob('${job._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            container.appendChild(row);
        });
    } catch (err) {
        console.error('Failed to load jobs:', err);
    }
}

// ==================== UPDATE DASHBOARD STATS ====================
async function updateDashboardStats() {
    try {
        const res = await fetch(`${API_BASE}/api/jobs/my-jobs`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (data.success && data.jobs) {
            // Count active jobs
            const activeJobs = data.jobs.filter(job => job.status === 'active').length;
            
            // Count total applications across all jobs
            let totalApplications = 0;
            data.jobs.forEach(job => {
                totalApplications += job.applicationsCount || 0;
            });

            // Update active jobs stat
            const activeJobsElement = document.querySelector('[class*="stat-card"]:nth-child(1) h3');
            if (activeJobsElement) activeJobsElement.textContent = activeJobs;

            // Update applications stat
            const applicationsElement = document.querySelector('[class*="stat-card"]:nth-child(2) h3');
            if (applicationsElement) applicationsElement.textContent = totalApplications;

            // Update applications badge in sidebar
            const appBadge = document.querySelector('a[data-page="applications"] .badge');
            if (appBadge) appBadge.textContent = totalApplications;
        }
    } catch (err) {
        console.warn('Failed to update dashboard stats:', err);
    }
}
async function viewApplicants(jobId, jobTitle) {
    try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}/applicants`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        let html = `<h6 class="mb-3">Applicants for: <strong>${jobTitle}</strong></h6>`;
        if (!data.success || data.applications.length === 0) {
            html += '<p class="text-muted">No applicants yet.</p>';
        } else {
            html += '<table class="table table-sm"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Action</th></tr></thead><tbody>';
            data.applications.forEach(app => {
                html += `
                    <tr>
                        <td>${app.candidate.name}</td>
                        <td>${app.candidate.email}</td>
                        <td><span class="badge bg-secondary">${app.status}</span></td>
                        <td>
                            <select class="form-select form-select-sm" onchange="updateAppStatus('${app._id}', this.value)" style="width:auto">
                                <option value="Applied" ${app.status==='Applied'?'selected':''}>Applied</option>
                                <option value="Under Review" ${app.status==='Under Review'?'selected':''}>Under Review</option>
                                <option value="Shortlisted" ${app.status==='Shortlisted'?'selected':''}>Shortlisted</option>
                                <option value="Interview Scheduled" ${app.status==='Interview Scheduled'?'selected':''}>Interview Scheduled</option>
                                <option value="Offered" ${app.status==='Offered'?'selected':''}>Offered</option>
                                <option value="Rejected" ${app.status==='Rejected'?'selected':''}>Rejected</option>
                            </select>
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
        }

        const modalBody = document.getElementById('applicantsModalBody');
        if (modalBody) {
            modalBody.innerHTML = html;
            const modal = new bootstrap.Modal(document.getElementById('applicantsModal'));
            modal.show();
        } else {
            alert(html.replace(/<[^>]+>/g, ' '));
        }
    } catch (err) {
        alert('Failed to load applicants');
    }
}

// ==================== UPDATE APPLICATION STATUS ====================
async function updateAppStatus(appId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/api/applications/${appId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (!data.success) {
            alert('Failed to update status');
        } else {
            // Refresh stats if status was updated
            loadMyJobs();
            updateDashboardStats();
        }
    } catch (err) {
        alert('Network error');
    }
}

// ==================== DELETE JOB ====================
async function deleteJob(jobId) {
    if (!confirm('Delete this job posting?')) return;
    try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
            alert('Job deleted successfully');
            loadMyJobs();
            updateDashboardStats(); // Update stats after deletion
        } else {
            alert(data.message || 'Failed to delete job');
        }
    } catch (err) {
        alert('Network error');
    }
}
// ==================== LOAD RECRUITER NAME ====================
function loadRecruiterName() {
    const user = JSON.parse(localStorage.getItem('hireflow_user') || '{}');
    const el = document.getElementById('recruiterWelcome');
    if (el && user.name) el.textContent = `Welcome, ${user.name}`;
}

// ==================== LOAD RECENT APPLICATIONS (Dashboard) ====================
async function loadRecentApplications() {
    const container = document.getElementById('recentApplicationsList');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/api/jobs/my-jobs`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.success || data.jobs.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-3">No applications yet</p>';
            return;
        }
        // Fetch applicants for each job
        let allApps = [];
        for (const job of data.jobs.slice(0, 3)) {
            try {
                const appRes = await fetch(`${API_BASE}/api/jobs/${job._id}/applicants`, { headers: getAuthHeaders() });
                const appData = await appRes.json();
                if (appData.success) {
                    appData.applications.forEach(app => {
                        allApps.push({ ...app, jobTitle: job.title });
                    });
                }
            } catch (e) {}
        }
        if (allApps.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-3">No applications yet</p>';
            return;
        }
        container.innerHTML = '';
        allApps.slice(0, 5).forEach(app => {
            const statusColors = {
                'Applied': 'info', 'Under Review': 'warning', 'Shortlisted': 'primary',
                'Interview Scheduled': 'success', 'Offered': 'success', 'Rejected': 'danger'
            };
            const div = document.createElement('div');
            div.className = 'application-item';
            div.innerHTML = `
                <div class="app-company">
                    <h6>${app.candidate?.name || 'Candidate'}</h6>
                    <p>${app.jobTitle}</p>
                </div>
                <div class="app-status">
                    <span class="badge bg-${statusColors[app.status] || 'secondary'}">${app.status}</span>
                </div>
                <div class="app-date">
                    <small>${new Date(app.createdAt).toLocaleDateString()}</small>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        container.innerHTML = '<p class="text-danger text-center">Failed to load</p>';
    }
}

// ==================== LOAD ACTIVE JOB POSTINGS (Dashboard sidebar) ====================
async function loadActiveJobPostings() {
    const container = document.getElementById('activeJobPostingsList');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/api/jobs/my-jobs`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.success || data.jobs.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No jobs posted yet</p>';
            return;
        }
        container.innerHTML = '';
        data.jobs.filter(j => j.status === 'active').slice(0, 4).forEach(job => {
            const div = document.createElement('div');
            div.className = 'recommended-job';
            div.innerHTML = `
                <div class="job-info">
                    <h6>${job.title}</h6>
                    <p>${job.skills?.join(', ') || job.type}</p>
                    <small><i class="fas fa-inbox"></i> ${job.applicationsCount || 0} applications</small>
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="viewApplicants('${job._id}', '${job.title}')">
                    <i class="fas fa-users"></i>
                </button>
            `;
            container.appendChild(div);
        });
    } catch (err) {}
}

// ==================== LOAD ALL APPLICATIONS PAGE ====================
async function loadAllApplications() {
    const container = document.getElementById('allApplicationsList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    try {
        const res = await fetch(`${API_BASE}/api/jobs/my-jobs`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.success || data.jobs.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-4">No applications yet</p>';
            return;
        }
        let allApps = [];
        for (const job of data.jobs) {
            try {
                const appRes = await fetch(`${API_BASE}/api/jobs/${job._id}/applicants`, { headers: getAuthHeaders() });
                const appData = await appRes.json();
                if (appData.success) {
                    appData.applications.forEach(app => allApps.push({ ...app, jobTitle: job.title }));
                }
            } catch (e) {}
        }
        // Populate position filter
        const posFilter = document.getElementById('filterPosition');
        if (posFilter) {
            posFilter.innerHTML = '<option value="">All Positions</option>';
            data.jobs.forEach(j => {
                posFilter.innerHTML += `<option value="${j._id}">${j.title}</option>`;
            });
        }
        if (allApps.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-4">No applications yet</p>';
            return;
        }
        renderApplicationCards(allApps, container);

        // Filter handlers
        document.getElementById('filterPosition')?.addEventListener('change', () => filterAllApplications(allApps));
        document.getElementById('filterStatus')?.addEventListener('change', () => filterAllApplications(allApps));
    } catch (err) {
        container.innerHTML = '<p class="text-danger text-center">Failed to load applications</p>';
    }
}

function filterAllApplications(allApps) {
    const container = document.getElementById('allApplicationsList');
    const posFilter = document.getElementById('filterPosition')?.value;
    const statusFilter = document.getElementById('filterStatus')?.value;
    let filtered = allApps;
    if (posFilter) filtered = filtered.filter(a => a.job === posFilter || a.job?._id === posFilter);
    if (statusFilter) filtered = filtered.filter(a => a.status === statusFilter);
    renderApplicationCards(filtered, container);
}

function renderApplicationCards(apps, container) {
    const statusColors = {
        'Applied': 'info', 'Under Review': 'warning', 'Shortlisted': 'primary',
        'Interview Scheduled': 'success', 'Offered': 'success', 'Rejected': 'danger', 'Withdrawn': 'secondary'
    };
    container.innerHTML = '';
    apps.forEach(app => {
        const div = document.createElement('div');
        div.className = 'job-card';
        div.innerHTML = `
            <div class="job-header">
                <div>
                    <h5>${app.candidate?.name || 'Candidate'}</h5>
                    <p class="company">${app.jobTitle}</p>
                </div>
                <div class="d-flex gap-2 align-items-center">
                    <span class="badge bg-${statusColors[app.status] || 'secondary'}">${app.status}</span>
                </div>
            </div>
            <p class="job-description"><strong>Email:</strong> ${app.candidate?.email || 'N/A'}</p>
            <div class="job-meta">
                <span><i class="fas fa-calendar"></i> Applied: ${new Date(app.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="mt-3">
                <select class="form-select form-select-sm d-inline-block w-auto" onchange="updateAppStatus('${app._id}', this.value)">
                    <option value="Applied" ${app.status==='Applied'?'selected':''}>Applied</option>
                    <option value="Under Review" ${app.status==='Under Review'?'selected':''}>Under Review</option>
                    <option value="Shortlisted" ${app.status==='Shortlisted'?'selected':''}>Shortlisted</option>
                    <option value="Interview Scheduled" ${app.status==='Interview Scheduled'?'selected':''}>Interview Scheduled</option>
                    <option value="Offered" ${app.status==='Offered'?'selected':''}>Offered</option>
                    <option value="Rejected" ${app.status==='Rejected'?'selected':''}>Rejected</option>
                </select>
            </div>
        `;
        container.appendChild(div);
    });
}

// ==================== LOAD SHORTLISTED CANDIDATES ====================
async function loadShortlistedCandidates() {
    const container = document.getElementById('shortlistedCandidatesList');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/api/jobs/my-jobs`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.success) return;
        let shortlisted = [];
        for (const job of data.jobs) {
            try {
                const appRes = await fetch(`${API_BASE}/api/jobs/${job._id}/applicants`, { headers: getAuthHeaders() });
                const appData = await appRes.json();
                if (appData.success) {
                    appData.applications
                        .filter(a => ['Shortlisted','Interview Scheduled','Offered'].includes(a.status))
                        .forEach(app => shortlisted.push({ ...app, jobTitle: job.title }));
                }
            } catch (e) {}
        }
        container.innerHTML = '';
        if (shortlisted.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No shortlisted candidates yet</td></tr>';
            return;
        }
        shortlisted.forEach(app => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${app.candidate?.name}</strong><br><small class="text-muted">${app.candidate?.email}</small></td>
                <td>${app.jobTitle}</td>
                <td>N/A</td>
                <td><span class="badge bg-warning">${app.status}</span></td>
                <td><button class="btn btn-sm btn-outline-primary" onclick="viewApplicants('${app.job}', '${app.jobTitle}')">View</button></td>
            `;
            container.appendChild(tr);
        });
    } catch (err) {}
}
