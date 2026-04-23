// ==================== HireFlow Signup ====================

const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', function () {

    // ---- DOM elements ----
    const signupForm        = document.getElementById('signupForm');
    const nameInput         = document.getElementById('name');
    const emailInput        = document.getElementById('email');
    const passwordInput     = document.getElementById('password');
    const confirmInput      = document.getElementById('confirmPassword');
    const togglePwdBtn      = document.querySelector('.toggle-password');
    const toggleConfirmBtn  = document.querySelector('.toggle-confirm-password');
    const submitBtn         = document.querySelector('button[type="submit"]');

    // ---- Password visibility toggles ----
    if (togglePwdBtn) {
        togglePwdBtn.addEventListener('click', function () {
            toggleVisibility(passwordInput, this.querySelector('i'));
        });
    }
    if (toggleConfirmBtn) {
        toggleConfirmBtn.addEventListener('click', function () {
            toggleVisibility(confirmInput, this.querySelector('i'));
        });
    }

    function toggleVisibility(input, icon) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        icon.classList.toggle('fa-eye', !isPassword);
        icon.classList.toggle('fa-eye-slash', isPassword);
    }

    // ---- Real-time validation ----
    nameInput.addEventListener('blur', () => validateName());
    emailInput.addEventListener('blur', () => validateEmail());
    passwordInput.addEventListener('blur', () => validatePassword());
    confirmInput.addEventListener('blur', () => validateConfirm());

    // ---- Form submit ----
    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAllErrors();

        const isValid = validateName() & validateEmail() & validatePassword() & validateConfirm();
        if (!isValid) return;

        await doSignup();
    });

    // ==================== VALIDATION ====================

    function validateName() {
        const val = nameInput.value.trim();
        if (!val)            return setError(nameInput, 'nameError', 'Full name is required');
        if (val.length < 2)  return setError(nameInput, 'nameError', 'Name must be at least 2 characters');
        return clearError(nameInput, 'nameError');
    }

    function validateEmail() {
        const val = emailInput.value.trim();
        const re  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!val)        return setError(emailInput, 'emailError', 'Email is required');
        if (!re.test(val)) return setError(emailInput, 'emailError', 'Enter a valid email address');
        return clearError(emailInput, 'emailError');
    }

    function validatePassword() {
        const val = passwordInput.value;
        if (!val)          return setError(passwordInput, 'passwordError', 'Password is required');
        if (val.length < 6) return setError(passwordInput, 'passwordError', 'Password must be at least 6 characters');
        return clearError(passwordInput, 'passwordError');
    }

    function validateConfirm() {
        const val = confirmInput.value;
        if (!val)                          return setError(confirmInput, 'confirmPasswordError', 'Please confirm your password');
        if (val !== passwordInput.value)   return setError(confirmInput, 'confirmPasswordError', 'Passwords do not match');
        return clearError(confirmInput, 'confirmPasswordError');
    }

    function setError(input, errorId, msg) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        const el = document.getElementById(errorId);
        if (el) { el.textContent = msg; el.style.display = 'block'; }
        return false;
    }

    function clearError(input, errorId) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        const el = document.getElementById(errorId);
        if (el) { el.textContent = ''; el.style.display = 'none'; }
        return true;
    }

    function clearAllErrors() {
        [nameInput, emailInput, passwordInput, confirmInput].forEach(el => {
            el.classList.remove('is-invalid', 'is-valid');
        });
        ['nameError','emailError','passwordError','confirmPasswordError'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.textContent = ''; el.style.display = 'none'; }
        });
        hideAlert('successAlert');
        hideAlert('errorAlert');
    }

    // ==================== SIGNUP LOGIC ====================

    async function doSignup() {
        const name     = nameInput.value.trim();
        const email    = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const role     = document.querySelector('input[name="userType"]:checked').value;

        // Loading state
        const origHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';

        try {
            const res = await fetch(`${API_BASE}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Save token + user to localStorage
                localStorage.setItem('hireflow_auth_token', data.token);
                localStorage.setItem('hireflow_user', JSON.stringify(data.user));
                localStorage.setItem('hireflow_userType', data.user.role);

                showAlert('successAlert', '✅ Account created! Redirecting to your dashboard...');

                setTimeout(() => {
                    redirectToDashboard(data.user.role);
                }, 1500);

            } else {
                showAlert('errorAlert', data.message || 'Signup failed. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = origHTML;
            }

        } catch (err) {
            // Backend is down - show clear message
            showAlert('errorAlert',
                '⚠️ Cannot connect to server (localhost:5000). ' +
                'Make sure the backend is running: <strong>cd backend && npm run dev</strong>'
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
        const msgEl = el.querySelector('span');
        if (msgEl) msgEl.innerHTML = msg;
        el.style.display = 'block';
        el.classList.remove('hide');
        el.classList.add('show');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideAlert(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'none';
        el.classList.add('hide');
        el.classList.remove('show');
    }

});
