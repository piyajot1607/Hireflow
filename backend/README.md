# HireFlow Backend

Production-ready backend for HireFlow - A hiring platform built with Node.js, Express, and MongoDB.

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js           # MongoDB connection setup
├── controllers/
│   └── authController.js     # Auth logic (signup, login)
├── middleware/
│   ├── authMiddleware.js     # JWT verification & role-based access
│   └── errorHandler.js       # Centralized error handling
├── models/
│   └── User.js              # User schema and methods
├── routes/
│   └── authRoutes.js        # Auth endpoints
├── utils/
│   └── validators.js        # Input validation functions
├── .env                     # Environment variables
├── .gitignore              # Git ignore file
├── package.json            # Dependencies
└── server.js               # Entry point
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Edit `.env` file:

```
PORT=5000
NODE_ENV=development

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/hireflow?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 3. Start the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:5000`

---

## 📚 API Endpoints

### Authentication

#### 1. **Signup**
```
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "candidate"  // optional: "candidate" | "recruiter" | "admin"
}
```

**Response (201):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "candidate",
    "createdAt": "2024-04-08T10:30:00.000Z"
  }
}
```

#### 2. **Login**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "candidate",
    "createdAt": "2024-04-08T10:30:00.000Z"
  }
}
```

#### 3. **Get Current User**
```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "candidate",
    "createdAt": "2024-04-08T10:30:00.000Z"
  }
}
```

---

## 🔐 Authentication & Authorization

### How JWT Works

1. **Signup/Login** → Receive JWT token
2. **Store token** in frontend (localStorage/sessionStorage)
3. **Send token** in Authorization header: `Bearer <token>`
4. **Backend verifies** token and grants access

### Protected Routes Example

```javascript
// Protect route with JWT verification
router.get('/protected', protect, controller);

// Protect route with role-based access
router.delete('/admin/users/:id', protect, authorize('admin'), controller);
```

### Using Token in Frontend

**JavaScript (Axios):**
```javascript
const token = localStorage.getItem('token');

axios.get('/api/auth/me', {
  headers: { Authorization: `Bearer ${token}` }
});
```

**JavaScript (Fetch):**
```javascript
const token = localStorage.getItem('token');

fetch('/api/auth/me', {
  headers: { Authorization: `Bearer ${token}` }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## ✅ Input Validation

All inputs are validated before being processed:

### Signup Validation
- **Name:** Required, minimum 2 characters
- **Email:** Required, valid email format, unique
- **Password:** Required, minimum 6 characters
- **Role:** One of: candidate, recruiter, admin

### Login Validation
- **Email:** Required, valid email format
- **Password:** Required

---

## 🛡️ Security Features

✅ Password hashing with bcrypt (10 salt rounds)
✅ JWT token authentication with expiration
✅ Input validation and sanitization
✅ Role-based access control
✅ Environment variables for sensitive data
✅ Centralized error handling
✅ CORS protection
✅ MongoDB injection prevention (via Mongoose)

---

## 📋 User Roles

### 1. **Candidate**
- Browse and apply for jobs
- Manage profile and applications
- Message recruiters

### 2. **Recruiter**
- Post job listings
- View candidate profiles
- Manage applications
- Message candidates

### 3. **Admin**
- Manage users
- Manage job postings
- View analytics
- System settings

---

## 🧪 Testing API Endpoints

Use **Postman**, **Insomnia**, or **cURL**:

### Signup Example (cURL)
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

### Login Example (cURL)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Current User (cURL)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

---

## 📦 Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT token generation
- **dotenv** - Environment variables
- **cors** - Cross-origin requests
- **nodemon** - Development auto-reload

---

## 🔧 What's Next?

The backend is ready for extension. Next features to implement:

1. **Job Management**
   - POST /api/jobs (create job)
   - GET /api/jobs (list jobs)
   - GET /api/jobs/:id (view job)
   - PUT /api/jobs/:id (edit job)
   - DELETE /api/jobs/:id (delete job)

2. **Application Management**
   - POST /api/applications (apply to job)
   - GET /api/applications (view applications)
   - PUT /api/applications/:id (update status)

3. **Profile Management**
   - PUT /api/users/profile (update profile)
   - POST /api/users/upload-resume (upload resume)
   - POST /api/users/upload-photo (upload profile picture)

4. **Messaging System**
   - WebSocket for real-time chat
   - Store messages in MongoDB

---

## 🐛 Error Handling

All errors are handled centrally and return consistent JSON responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 📝 Notes

- Always use `npm run dev` during development
- Keep `.env` in `.gitignore` - never commit it
- Change JWT_SECRET in production
- Use MongoDB Atlas for production database
- Add more validation as needed
- Implement refresh tokens for better security (future feature)

---

## 👤 Author

HireFlow Team

---

**Happy coding! 🚀**
