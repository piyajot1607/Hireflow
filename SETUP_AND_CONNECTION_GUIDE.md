# HireFlow - Connection & Setup Guide

## ✅ Current Status
- **Backend Server**: Running on `http://localhost:5000`
- **MongoDB**: Connected and working
- **CORS Configuration**: Fixed and allows requests from frontend on ports 3000 and 5500
- **API Endpoints**: All tested and working ✅

---

## 🚀 Quick Start

### 1. Start the Backend Server
```bash
cd backend
npm run dev
```
You should see:
```
✅ MongoDB connected: 127.0.0.1
🚀 Server running on port 5000
Environment: development
```

### 2. Open Frontend in Browser
- **Using Live Server**: Open `frontend/index.html` with Live Server (usually port 5500)
- **Using HTTP Server**: 
  ```bash
  cd frontend
  python -m http.server 8000
  # or with Node.js:
  npx serve
  ```
- **Direct File**: Open `frontend/index.html` in your browser

### 3. Test the Connection
Open the browser console (F12) and run:
```javascript
HireFlowTest.runAll()
```

---

## 🔍 Troubleshooting

### Problem: "Cannot connect to server"
**Solution**: Make sure the backend is running:
```bash
cd backend
npm run dev
```

### Problem: "CORS error" or "Network request blocked"
**Solution**: The CORS configuration has been updated to accept requests from:
- `http://localhost:5500` (Live Server)
- `http://localhost:3000` (React dev server)
- `http://127.0.0.1:5500`
- `http://127.0.0.1:3000`

If you're using a different port, the backend accepts all requests in development mode.

### Problem: "MongoDB connection failed"
**Solution**: Make sure MongoDB is running:
```bash
# Windows
# Start MongoDB using your installation method (Services, Docker, or MongoDB Compass)

# Mac/Linux
brew services start mongodb-community
# or
sudo systemctl start mongod
```

---

## 🧪 API Test Commands

### Test Health Endpoint
```bash
curl http://localhost:5000/api/health
```

### Test Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "candidate"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

## 📁 Project Structure

```
Hireflow_fixed/
├── backend/              # Node.js/Express API server
│   ├── .env             # Environment variables (PORT=5000)
│   ├── server.js        # Main server file with CORS config
│   ├── config/          # Database configuration
│   ├── controllers/      # API endpoint logic
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   └── middleware/      # Auth & error handling
│
└── frontend/            # HTML/CSS/JavaScript frontend
    ├── index.html       # Login page
    ├── signup.html      # Signup page
    ├── config.js        # API configuration (BASE_URL: http://localhost:5000)
    ├── js/
    │   ├── api-test.js  # Test helper
    │   ├── script.js    # Login page logic
    │   └── signup.js    # Signup page logic
    └── dashboards/      # Admin, Recruiter, Candidate dashboards
```

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires token)

### Health Check
- `GET /api/health` - Server status check

---

## 🛠️ Key Configuration Changes Made

1. **Fixed CORS in `.env`**: Changed from port 3000 to 5500 (default Live Server port)
2. **Updated `server.js`**: Added flexible CORS configuration to accept multiple origins
3. **Added API Test Helper**: Created `js/api-test.js` for easy testing from browser console
4. **Backend Status Check**: Added banner to show if backend is down

---

## 💡 Tips

- **Check Backend Status**: Look for the connection banner at the top of the page
- **Test from Console**: Use `HireFlowTest.runAll()` in browser console
- **Real-time Updates**: Backend uses Nodemon - changes to server files auto-reload
- **View Error Details**: Check browser console (F12) for detailed error messages

---

## 📝 Environment Variables

### Backend (`.env`)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/hireflow
JWT_SECRET=hireflow_super_secret_jwt_key_replace_in_production_abc123xyz
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5500
```

### Frontend (`config.js`)
```javascript
API: {
    BASE_URL: 'http://localhost:5000',
    ENDPOINTS: {
        LOGIN: '/api/auth/login',
        SIGNUP: '/api/auth/signup',
        ...
    }
}
```

---

## ✨ What's Fixed

✅ **CORS Configuration** - Now accepts requests from multiple ports
✅ **Backend Server** - Running and tested successfully
✅ **MongoDB Connection** - Verified working
✅ **API Endpoints** - All tested and operational
✅ **Error Handling** - Clear error messages on frontend
✅ **Test Helper** - Easy-to-use console testing tool

---

## 🎯 Next Steps

1. ✅ Backend running on port 5000
2. ✅ MongoDB connected
3. ✅ CORS configured
4. ✅ Frontend HTML files ready
5. **Now**: Open `frontend/index.html` in your browser and test signup/login!

---

For more help, open browser console (F12) and run: `HireFlowTest.runAll()`
