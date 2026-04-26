// ==================== RECRUITER DASHBOARD JS ====================

let myJobs = [];
let currentJobId = null;

function getAuthHeaders() {
    const token = localStorage.getItem('hireflow_auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async function () {
    // Set user name
    const name = localStorage.getItem('hireflow_name') || 'Recruiter';
    document.getElementById('recruiterName').textContent = name.split(' ')[0];
    document.getElementById('userNameHeader').textContent = name;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const avatarEl = document.getElementById('avatarInitials');
    if (avatarEl) avatarEl.textContent = initials;

    await loadMyJobs();
    await updateDashboardStats();
    await loadRecentApplications();
    populateJobSelector();
});

// ==================== NAVIGATION HELPER ====================
function navigateTo(page) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const link = document.querySelector(`[data-page="${page}"]`);
    const section = document.getElementById(page);
    if (link) link.classList.add('active');
    if (section) section.classList.add('active');
    document.getElementById('pageTitle').textContent =
        link?.querySelector('span')?.textContent || page;
}

// ==================== POST JOB ====================
document.addEventListener('DOMContentLoaded', function () {
    const postJobForm = document.getElementById('postJobForm');
    if (!postJobForm) return;

    postJobForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);

        data.requirements = data.requirements
            ? data.requirements.split('\n').map(s => s.trim()).filter(Boolean)
            : [];
        data.skills = data.skills
            ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        const btn = document.getElementById('postJobBtn');
        const alertEl = document.getElementById('postJobAlert');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
        alertEl.className = 'alert d-none mb-3';

        try {
            const res = await fetch(`${API_BASE}/api/jobs`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                alertEl.className = 'alert alert-success mb-3';
                alertEl.textContent = '✅ Job posted successfully! Redirecting to My Jobs...';
                postJobForm.reset();
                await loadMyJobs();
                await updateDashboardStats();
                populateJobSelector();
                setTimeout(() => navigateTo('my-jobs'), 1500);
            } else {
                alertEl.className = 'alert alert-danger mb-3';
                alertEl.textContent = result.message || 'Failed to post job.';
            }
        } catch (err) {
            alertEl.className = 'alert alert-danger mb-3';
            alertEl.textContent = 'Network error. Please try again.';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Job';
        }
    });
});

// ==================== LOAD MY JOBS ====================
async function loadMyJobs() {
    const container = document.getElementById('myJobsList');
    if (container) {
        container.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    }

    try {
        const res = await fetch(`${API_BASE}/api/jobs/my-jobs`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (!data.success) throw new Error(data.message);
        myJobs = data.jobs || [];

        if (!container) return;

        if (myJobs.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">' +
                '<i class="fas fa-briefcase fa-2x mb-2 d-block opacity-25"></i>No jobs posted yet. ' +
                '<a href="#" onclick="navigateTo(\'post-job\')">Post your first job!</a></td></tr>';
            return;
        }

        container.innerHTML = '';
        myJobs.forEach(job => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>${job.title}</strong><br>
                    <small class="text-muted">${job.company} &bull; ${job.location}</small>
                </td>
                <td class="job-row-status">
                    <span class="badge bg-${job.status === 'active' ? 'success' : 'secondary'}">
                        ${job.status}
                    </span>
                </td>
                <td>
                    <span class="badge bg-primary rounded-pill">${job.applicationsCount || 0}</span>
                </td>
                <td><small>${new Date(job.createdAt).toLocaleDateString()}</small></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1"
                        onclick="viewCandidatesForJob('${job._id}', '${job.title.replace(/'/g, "\\'")}')" title="View Candidates">
                        <i class="fas fa-users"></i> Candidates
                    </button>
                    ${job.status === 'active'
                        ? `<button class="btn btn-sm btn-outline-warning me-1" onclick="toggleJobStatus('${job._id}', 'closed')" title="Close Job">
                            <i class="fas fa-pause"></i>
                           </button>`
                        : `<button class="btn btn-sm btn-outline-success me-1" onclick="toggleJobStatus('${job._id}', 'active')" title="Reopen Job">
                            <i class="fas fa-play"></i>
                           </button>`
                    }
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteJob('${job._id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            container.appendChild(row);
        });
    } catch (err) {
        if (container) container.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message}</td></tr>`;
    }
}

// ==================== POPULATE JOB SELECTOR ====================
function populateJobSelector() {
    const sel = document.getElementById('jobSelectorForCandidates');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select a Job --</option>';
    myJobs.forEach(job => {
        const opt = document.createElement('option');
        opt.value = job._id;
        opt.textContent = `${job.title} (${job.applicationsCount || 0} apps)`;
        sel.appendChild(opt);
    });
}

// ==================== UPDATE DASHBOARD STATS ====================
async function updateDashboardStats() {
    try {
        if (myJobs.length === 0) {
            const res = await fetch(`${API_BASE}/api/jobs/my-jobs`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) myJobs = data.jobs || [];
        }

        const activeJobs = myJobs.filter(j => j.status === 'active').length;
        const totalApps = myJobs.reduce((sum, j) => sum + (j.applicationsCount || 0), 0);
        const totalJobs = myJobs.length;
        let shortlisted = 0;

        // Build shortlist stat from real application statuses.
        await Promise.all(
            myJobs.map(async (job) => {
                try {
                    const res = await fetch(`${API_BASE}/api/applications/job/${job._id}`, { headers: getAuthHeaders() });
                    const data = await res.json();
                    if (data.success && Array.isArray(data.applications)) {
                        shortlisted += data.applications.filter(a => a.status === 'Shortlisted').length;
                    }
                } catch (e) {
                    // Ignore per-job failures to keep dashboard responsive.
                }
            })
        );

        setStatEl('statActiveJobs', activeJobs);
        setStatEl('statTotalApps', totalApps);
        setStatEl('statShortlisted', shortlisted);
        setStatEl('statTotalJobs', totalJobs);
        setStatEl('metricTotalJobs', totalJobs);
        setStatEl('metricTotalApps', totalApps);
        setStatEl('metricActiveJobs', activeJobs);
        setStatEl('metricAvgApps', totalJobs > 0 ? (totalApps / totalJobs).toFixed(1) : '0');

        // Update badge
        const badge = document.getElementById('appBadge');
        if (badge) badge.textContent = totalApps;

        // Active jobs sidebar card
        const activeJobsContainer = document.getElementById('activeJobsContainer');
        if (activeJobsContainer) {
            const active = myJobs.filter(j => j.status === 'active').slice(0, 4);
            if (active.length === 0) {
                activeJobsContainer.innerHTML = '<p class="text-muted text-center">No active jobs</p>';
            } else {
                activeJobsContainer.innerHTML = active.map(j => `
                    <div class="recommended-job">
                        <div class="job-info">
                            <h6>${j.title}</h6>
                            <p>${(j.skills || []).slice(0, 3).join(', ') || j.company}</p>
                            <small><i class="fas fa-inbox"></i> ${j.applicationsCount || 0} applications</small>
                        </div>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewCandidatesForJob('${j._id}', '${j.title.replace(/'/g, "\\'")}')">
                            <i class="fas fa-users"></i>
                        </button>
                    </div>
                `).join('');
            }
        }

        // Funnel
        updateFunnel(totalApps);
    } catch (err) {
        console.warn('Stats update failed:', err);
    }
}

function setStatEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function updateFunnel(totalApps) {
    const container = document.getElementById('funnelContainer');
    if (!container) return;
    if (totalApps === 0) {
        container.innerHTML = '<p class="text-muted text-center">No applications yet</p>';
        return;
    }
    container.innerHTML = `
        <div class="mb-3">
            <div class="d-flex justify-content-between mb-1"><span>Applications Received</span><strong>${totalApps}</strong></div>
            <div class="progress" style="height:22px;">
                <div class="progress-bar" style="width:100%;background:linear-gradient(135deg,#667eea,#764ba2)"></div>
            </div>
        </div>
    `;
}

// ==================== RECENT APPLICATIONS ====================
async function loadRecentApplications() {
    const container = document.getElementById('recentAppsContainer');
    if (!container) return;

    if (myJobs.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Post a job to see applications here.</p>';
        return;
    }

    // Fetch applicants for first few jobs to build recent list
    let allApps = [];
    for (const job of myJobs.slice(0, 3)) {
        try {
            const res = await fetch(`${API_BASE}/api/applications/job/${job._id}`, { headers: getAuthHeaders() });
            const data = await res.json();
            if (data.success) {
                allApps = allApps.concat(data.applications.map(a => ({ ...a, jobTitle: job.title })));
            }
        } catch (e) { /* skip */ }
    }

    allApps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recent = allApps.slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No applications yet.</p>';
        return;
    }

    container.innerHTML = recent.map(app => `
        <div class="application-item">
            <div class="app-company">
                <h6>${app.candidate?.name || 'Candidate'}</h6>
                <p>${app.jobTitle}</p>
            </div>
            <div class="app-status">${getStatusBadge(app.status)}</div>
            <div class="app-date"><small>${timeAgo(app.createdAt)}</small></div>
        </div>
    `).join('');
}

// ==================== VIEW CANDIDATES FOR JOB ====================
async function viewCandidatesForJob(jobId, jobTitle) {
    navigateTo('candidates');
    const sel = document.getElementById('jobSelectorForCandidates');
    if (sel) sel.value = jobId;
    currentJobId = jobId;
    await loadApplicantsForJob(jobId, jobTitle);
}

async function loadApplicantsForSelected() {
    const sel = document.getElementById('jobSelectorForCandidates');
    if (!sel || !sel.value) return;
    const job = myJobs.find(j => j._id === sel.value);
    currentJobId = sel.value;
    await loadApplicantsForJob(sel.value, job?.title || 'Job');
}

async function loadApplicantsForJob(jobId, jobTitle) {
    const panel = document.getElementById('applicantsPanel');
    const rankBtn = document.getElementById('rankWithAIBtn');
    if (!panel) return;

    panel.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fas fa-users me-2"></i>Applicants — <em>${jobTitle}</em></h5>
                <span id="applicantCount" class="badge bg-primary rounded-pill">...</span>
            </div>
            <div class="card-body" id="applicantsList">
                <div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
            </div>
        </div>`;

    if (rankBtn) rankBtn.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/api/applications/job/${jobId}`, { headers: getAuthHeaders() });
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        const apps = data.applications || [];
        document.getElementById('applicantCount').textContent = `${apps.length} applicant${apps.length !== 1 ? 's' : ''}`;

        if (rankBtn && apps.length > 0) rankBtn.style.display = 'inline-flex';

        renderApplicants(apps, false);
    } catch (err) {
        document.getElementById('applicantsList').innerHTML =
            `<p class="text-danger text-center">${err.message}</p>`;
    }
}

function renderApplicants(apps, ranked) {
    const list = document.getElementById('applicantsList');
    if (!list) return;

    if (apps.length === 0) {
        list.innerHTML = '<p class="text-muted text-center py-4">No applicants yet.</p>';
        return;
    }

    list.innerHTML = '';
    apps.forEach((app, idx) => {
        const candidate = app.candidate || {};
        const hasResume = app.resumeUrl || candidate.resume?.filename;
        const hasScore = app.aiScore !== null && app.aiScore !== undefined;

        const scoreHtml = hasScore
            ? `<span class="ai-score-badge ${scoreClass(app.aiScore)}">
                   <i class="fas fa-robot"></i> ${app.aiScore}%
               </span>`
            : '';

        const summaryHtml = app.aiSummary && ranked
            ? `<div class="ai-summary-text"><i class="fas fa-lightbulb me-1"></i>${app.aiSummary}</div>`
            : '';

        const rankBadge = ranked
            ? `<span class="rank-badge">#${idx + 1}</span>`
            : '';

        const card = document.createElement('div');
        card.className = `applicant-card ${ranked && idx < 3 ? `rank-${idx + 1}` : ''}`;
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div class="d-flex gap-3 align-items-center">
                    ${rankBadge}
                    <div>
                        <h6 class="mb-1">${candidate.name || 'Unknown'}</h6>
                        <small class="text-muted">${candidate.email || ''}</small>
                        ${candidate.headline ? `<br><small class="text-muted"><i class="fas fa-briefcase me-1"></i>${candidate.headline}</small>` : ''}
                    </div>
                </div>
                <div class="d-flex gap-2 align-items-center flex-wrap">
                    ${scoreHtml}
                    ${getStatusBadge(app.status)}
                    ${hasResume ? `<a href="${API_BASE}${app.resumeUrl || `/uploads/resumes/${candidate.resume?.filename}`}"
                        target="_blank" class="btn btn-sm btn-outline-info" title="View Resume">
                        <i class="fas fa-file-pdf"></i> Resume
                    </a>` : '<span class="badge bg-light text-muted">No Resume</span>'}
                </div>
            </div>
            ${app.coverLetter ? `<p class="mt-2 mb-1 text-muted" style="font-size:0.83rem;"><i class="fas fa-quote-left me-1"></i>${app.coverLetter.slice(0, 120)}${app.coverLetter.length > 120 ? '...' : ''}</p>` : ''}
            ${summaryHtml}
            <div class="mt-2 d-flex gap-2 flex-wrap">
                <select class="form-select form-select-sm" style="width:auto;"
                    onchange="updateAppStatus('${app._id}', this.value)">
                    ${['Applied','Under Review','Shortlisted','Interview Scheduled','Offered','Rejected']
                        .map(s => `<option ${app.status === s ? 'selected' : ''} value="${s}">${s}</option>`).join('')}
                </select>
                <small class="text-muted align-self-center">Applied ${timeAgo(app.createdAt)}</small>
            </div>
        `;
        list.appendChild(card);
    });
}

function scoreClass(score) {
    if (score >= 70) return 'ai-score-high';
    if (score >= 40) return 'ai-score-mid';
    if (score > 0)   return 'ai-score-low';
    return 'ai-score-none';
}

// ==================== AI RANKING ====================
async function rankWithAI() {
    if (!currentJobId) return;

    const rankBtn = document.getElementById('rankWithAIBtn');
    const list = document.getElementById('applicantsList');
    const originalHtml = rankBtn.innerHTML;

    rankBtn.disabled = true;
    rankBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Ranking...';

    // Show a loading overlay in the list
    if (list) {
        list.insertAdjacentHTML('afterbegin',
            '<div id="aiLoadingMsg" class="alert alert-info mb-3">' +
            '<i class="fas fa-robot me-2"></i>AI is analyzing all resumes against the job description. This may take 10–30 seconds...</div>');
    }

    try {
        const res = await fetch(`${API_BASE}/api/applications/job/${currentJobId}/rank`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const data = await res.json();

        document.getElementById('aiLoadingMsg')?.remove();

        if (!data.success) {
            showToast(data.message || 'AI ranking failed', 'danger');
            return;
        }

        renderApplicants(data.rankings, true);
        showToast(`✅ AI ranked ${data.rankings.length} candidates successfully!`, 'success');
    } catch (err) {
        document.getElementById('aiLoadingMsg')?.remove();
        showToast('Network error during AI ranking', 'danger');
    } finally {
        rankBtn.disabled = false;
        rankBtn.innerHTML = originalHtml;
    }
}

// ==================== UPDATE STATUS ====================
async function updateAppStatus(appId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/api/applications/${appId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Status updated to "${newStatus}"`, 'success');
            // Update stats
            await updateDashboardStats();
        } else {
            showToast(data.message || 'Failed to update status', 'danger');
        }
    } catch (err) {
        showToast('Network error', 'danger');
    }
}

// ==================== DELETE JOB ====================
async function deleteJob(jobId) {
    if (!confirm('Delete this job posting? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
            showToast('Job deleted successfully', 'success');
            await loadMyJobs();
            await updateDashboardStats();
            populateJobSelector();
        } else {
            showToast(data.message || 'Failed to delete job', 'danger');
        }
    } catch (err) {
        showToast('Network error', 'danger');
    }
}

// ==================== TOGGLE JOB STATUS ====================
async function toggleJobStatus(jobId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Job ${newStatus === 'active' ? 'reopened' : 'closed'}`, 'success');
            await loadMyJobs();
            await updateDashboardStats();
        } else {
            showToast(data.message || 'Failed to update', 'danger');
        }
    } catch (err) {
        showToast('Network error', 'danger');
    }
}

// ==================== HELPERS ====================
function getStatusBadge(status) {
    const map = {
        'Applied': 'bg-secondary',
        'Under Review': 'bg-warning text-dark',
        'Shortlisted': 'bg-info',
        'Interview Scheduled': 'bg-primary',
        'Offered': 'bg-success',
        'Rejected': 'bg-danger',
        'Withdrawn': 'bg-dark'
    };
    return `<span class="badge ${map[status] || 'bg-secondary'}">${status}</span>`;
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.style.cssText = 'position:fixed;top:70px;right:20px;z-index:9999;min-width:300px;max-width:400px;';
    toast.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
