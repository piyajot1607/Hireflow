// ==================== HireFlow Admin Dashboard ====================
// Requires: dashboard.js to be loaded first

const ADMIN_API = API_BASE; // from dashboard.js

document.addEventListener('DOMContentLoaded', function () {
    loadAdminStats();
    loadAllUsers();
    loadAllJobs();
});

async function loadAdminStats() {
    try {
        // Load users
        const usersRes = await fetch(`${ADMIN_API}/api/admin/users`, { headers: getAuthHeaders() });
        const usersData = await usersRes.json();

        // Load jobs
        const jobsRes = await fetch(`${ADMIN_API}/api/jobs?limit=1000`, { headers: getAuthHeaders() });
        const jobsData = await jobsRes.json();

        if (usersData.success) {
            const candidates = usersData.users.filter(u => u.role === 'candidate').length;
            const recruiters = usersData.users.filter(u => u.role === 'recruiter').length;
            const el = document.getElementById('statTotalUsers');
            if (el) el.textContent = usersData.users.length;
            const elC = document.getElementById('statCandidates');
            if (elC) elC.textContent = candidates;
            const elR = document.getElementById('statRecruiters');
            if (elR) elR.textContent = recruiters;
        }
        if (jobsData.success) {
            const el = document.getElementById('statTotalJobs');
            if (el) el.textContent = jobsData.count;
        }
    } catch (err) {
        console.warn('Failed to load admin stats:', err);
    }
}

async function loadAllUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;
    container.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    try {
        const res = await fetch(`${ADMIN_API}/api/admin/users`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        container.innerHTML = '';
        data.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-${user.role === 'admin' ? 'danger' : user.role === 'recruiter' ? 'warning' : 'primary'}">${user.role}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            container.appendChild(row);
        });
    } catch (err) {
        container.innerHTML = '<tr><td colspan="5" class="text-danger text-center">Failed to load users</td></tr>';
    }
}

async function loadAllJobs() {
    const container = document.getElementById('allJobsList');
    if (!container) return;
    try {
        const res = await fetch(`${ADMIN_API}/api/jobs?limit=50`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.success) return;
        container.innerHTML = '';
        data.jobs.forEach(job => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${job.title}</td>
                <td>${job.company}</td>
                <td>${job.recruiter?.name || 'N/A'}</td>
                <td><span class="badge bg-${job.status === 'active' ? 'success' : 'secondary'}">${job.status}</span></td>
                <td>${job.applicationsCount}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="adminDeleteJob('${job._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            container.appendChild(row);
        });
    } catch (err) {
        console.warn('Failed to load jobs for admin:', err);
    }
}

async function deleteUser(userId) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
        const res = await fetch(`${ADMIN_API}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
            showNotification('User deleted', 'success');
            loadAllUsers();
            loadAdminStats();
        } else {
            alert(data.message || 'Failed to delete user');
        }
    } catch (err) {
        alert('Network error');
    }
}

async function adminDeleteJob(jobId) {
    if (!confirm('Delete this job?')) return;
    try {
        const res = await fetch(`${ADMIN_API}/api/jobs/${jobId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
            showNotification('Job deleted', 'success');
            loadAllJobs();
            loadAdminStats();
        }
    } catch (err) {
        alert('Network error');
    }
}

function showNotification(message, type = 'info') {
    const alertClass = `alert-${type}`;
    const div = document.createElement('div');
    div.className = `alert ${alertClass} alert-dismissible fade show`;
    div.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;min-width:300px;';
    div.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}