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

    loadMyJobs();
    updateDashboardStats();
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
