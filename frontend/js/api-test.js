/**
 * HireFlow API Test Helper
 * Use this file to test if your frontend can connect to the backend
 * Open the browser console (F12) and run the test functions
 */

window.HireFlowTest = {
    API_URL: 'http://localhost:5000',

    /**
     * Test the health endpoint
     */
    async testHealth() {
        console.log('🔍 Testing health endpoint...');
        try {
            const res = await fetch(`${this.API_URL}/api/health`);
            const data = await res.json();
            console.log('✅ Health check passed:', data);
            return true;
        } catch (err) {
            console.error('❌ Health check failed:', err.message);
            return false;
        }
    },

    /**
     * Test signup endpoint
     */
    async testSignup(name, email, password, role = 'candidate') {
        console.log('🔍 Testing signup endpoint...');
        try {
            const res = await fetch(`${this.API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role })
            });
            const data = await res.json();
            if (res.ok) {
                console.log('✅ Signup successful:', data);
            } else {
                console.error('❌ Signup failed:', data.message);
            }
            return data;
        } catch (err) {
            console.error('❌ Signup error:', err.message);
            return null;
        }
    },

    /**
     * Test login endpoint
     */
    async testLogin(email, password) {
        console.log('🔍 Testing login endpoint...');
        try {
            const res = await fetch(`${this.API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                console.log('✅ Login successful:', data);
            } else {
                console.error('❌ Login failed:', data.message);
            }
            return data;
        } catch (err) {
            console.error('❌ Login error:', err.message);
            return null;
        }
    },

    /**
     * Run all tests
     */
    async runAll() {
        console.clear();
        console.log('🚀 Starting HireFlow API Tests...');
        console.log('================================\n');

        const healthPassed = await this.testHealth();
        if (!healthPassed) {
            console.error('❌ Backend is not running. Please start it with: cd backend && npm run dev');
            return;
        }

        console.log('\n✅ All tests passed! Backend is connected.');
        console.log('\n📝 To test signup: HireFlowTest.testSignup("John Doe", "john@example.com", "password123")');
        console.log('📝 To test login: HireFlowTest.testLogin("john@example.com", "password123")');
    }
};

// Auto-run tests on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('💡 HireFlow Test Helper loaded. Run HireFlowTest.runAll() in console to test connection.');
});
