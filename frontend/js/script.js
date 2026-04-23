// ==================== HireFlow Login ====================

const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', function () {

    // ---- DOM elements ----
    const loginForm       = document.getElementById('loginForm');
    const emailInput      = document.getElementById('email');
    const passwordInput   = document.getElementById('password');
    const rememberMe      = document.getElementById('rememberMe');
    const togglePwdBtn    = document.querySelector('.toggle-password');
    const forgotPwdLink   = document.querySelector('.forgot-password-link');
    const submitBtn       = document.querySelector('button[type="submit"]');

    // ---- If already logged in, redirect to dashboard ----
    const existingToken = localStorage.getItem('hireflow_auth_token');
    const existingUser  = JSON.parse(localStorage.getItem('hireflow_user') || 'null');
    if (existingToken && existingUser) {
        redirectToDashboard(existingUser.role);
        return;
    }

    // ---- Load remembered email ----
    const savedEmail    = localStorage.getItem('hireflow_email');
    const savedUserType = localStorage.getItem('hireflow_userType');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMe.checked = true;
    }
    if (savedUserType) {
        const radio = document.getElementById(savedUserType);
        if (radio) radio.checked = true;
    }

    // ---- Password toggle ----
    if (togglePwdBtn) {
        togglePwdBtn.addEventListener('click', function () {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye', !isPassword);
            icon.classList.toggle('fa-eye-slash', isPassword);
        });
    }

    // ---- Forgot password ----
    if (forgotPwdLink) {
        forgotPwdLink.addEventListener('click', function (e) {
            e.preventDefault();
            const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
            modal.show();
        });
    }

    // ---- Forgot password submit ----
    const resetBtn = document.getElementById('resetSubmitBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            const email = document.getElementById('resetEmail').value.trim();
            const msgEl = document.getElementById('resetMessage');
            if (!email) {
                msgEl.innerHTML = '<div class="alert alert-danger">Please enter your email</div>';
                return;
            }
            msgEl.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>If that email exists, a reset link has been sent.</div>';
        });
    }

    // ---- Real-time validation ----
    emailInput.addEventListener('blur', validateEmail);
    passwordInput.addEventListener('blur', validatePassword);

    // ---- Form submit ----
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearErrors();
        const emailOk = validateEmail();
        const passOk  = validatePassword();
        if (emailOk && passOk) await doLogin();
    });

    // ==================== VALIDATION ====================

    function validateEmail() {
        const val = emailInput.value.trim();
        const re  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!val)          return showFieldError(emailInput, 'emailError', 'Email is required'), false;
        if (!re.test(val)) return showFieldError(emailInput, 'emailError', 'Enter a valid email'), false;
        clearFieldError(emailInput, 'emailError');
        return true;
    }

    function validatePassword() {
        const val = passwordInput.value;
        if (!val)          return showFieldError(passwordInput, 'passwordError', 'Password is required'), false;
        if (val.length < 6) return showFieldError(passwordInput, 'passwordError', 'Password must be at least 6 characters'), false;
        clearFieldError(passwordInput, 'passwordError');
        return true;
    }

    function showFieldError(input, errorId, msg) {
        input.classList.add('is-invalid');
        const el = document.getElementById(errorId);
        if (el) { el.textContent = msg; el.style.display = 'block'; }
    }

    function clearFieldError(input, errorId) {
        input.classList.remove('is-invalid');
        const el = document.getElementById(errorId);
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    }

    function clearErrors() {
        [emailInput, passwordInput].forEach(el => el.classList.remove('is-invalid'));
        ['emailError','passwordError'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.textContent = ''; el.style.display = 'none'; }
        });
        hideAlert('errorAlert');
        hideAlert('successAlert');
    }

    // ==================== LOGIN LOGIC ====================

    async function doLogin() {
        const email    = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        // Loading state
        const origHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing in...';

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Save auth data
                localStorage.setItem('hireflow_auth_token', data.token);
                localStorage.setItem('hireflow_user', JSON.stringify(data.user));
                localStorage.setItem('hireflow_userType', data.user.role);

                if (rememberMe.checked) {
                    localStorage.setItem('hireflow_email', email);
                } else {
                    localStorage.removeItem('hireflow_email');
                    localStorage.removeItem('hireflow_userType');
                }

                showAlert('successAlert', `✅ Welcome back, ${data.user.name}! Redirecting...`);

                setTimeout(() => {
                    redirectToDashboard(data.user.role);
                }, 1200);

            } else {
                showAlert('errorAlert', data.message || 'Invalid email or password.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = origHTML;
            }

        } catch (err) {
            showAlert('errorAlert',
                '⚠️ Cannot connect to server. ' +
                'Make sure backend is running: <strong>cd backend && npm run dev</strong>'
            );
            submitBtn.disabled = false;
            submitBtn.innerHTML = origHTML;
        }
    }

    function redirectToDashboard(role) {
        const map = {
            candidate: 'dashboards/candidate-dashboard.html',
            recruiter: 'dashboards/recruiter-dashboard.html',
            admin:     'dashboards/admin-dashboard.html'
        };
        window.location.href = map[role] || 'index.html';
    }

    // ==================== ALERT HELPERS ====================

    function showAlert(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        const span = el.querySelector('span');
        if (span) span.innerHTML = msg;
        el.style.display = 'block';
        el.classList.remove('hide');
    }

    function hideAlert(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'none';
        el.classList.add('hide');
    }

});
