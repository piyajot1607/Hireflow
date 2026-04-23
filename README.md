# 🚀 HireFlow — Full-Stack Job Portal

A complete job portal with three user roles: **Candidate**, **Recruiter**, and **Admin**.

---

## 📁 Project Structure

```
HireFlow/
├── backend/          ← Node.js + Express + MongoDB API
│   ├── config/       ← Database connection
│   ├── controllers/  ← Route logic
│   ├── middleware/   ← Auth + error handling
│   ├── models/       ← Mongoose schemas
│   ├── routes/       ← API route definitions
│   ├── utils/        ← Validators
│   ├── .env          ← Environment variables (DO NOT commit)
│   ├── .env.example  ← Safe env template
│   └── server.js     ← Entry point
│
└── frontend/         ← Vanilla HTML/CSS/JS
    ├── css/          ← Stylesheets
    ├── js/           ← JavaScript files
    ├── dashboards/   ← Role-based dashboard pages
    ├── index.html    ← Login page
    └── signup.html   ← Registration page
```

---

## ⚙️ Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### 2. Frontend Setup

Open `frontend/index.html` using **VS Code Live Server** (port 5500) or any static server.

> ⚠️ Do NOT just double-click the HTML file — CORS requires a proper server origin.

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/signup | Public | Register |
| POST | /api/auth/login | Public | Login |
| GET | /api/auth/me | Protected | Current user |
| GET | /api/jobs | Public | List all active jobs |
| POST | /api/jobs | Recruiter | Post a job |
| GET | /api/jobs/my-jobs | Recruiter | Recruiter's own jobs |
| GET | /api/jobs/:id | Public | Job detail |
| PUT | /api/jobs/:id | Recruiter/Admin | Update job |
| DELETE | /api/jobs/:id | Recruiter/Admin | Delete job |
| GET | /api/jobs/:id/applicants | Recruiter/Admin | View applicants |
| POST | /api/applications/job/:jobId | Candidate | Apply to job |
| GET | /api/applications/my | Candidate | My applications |
| PATCH | /api/applications/:id/withdraw | Candidate | Withdraw |
| PATCH | /api/applications/:id/status | Recruiter/Admin | Update status |

---

## 🔒 Security Features

- JWT authentication with 7-day expiry
- Bcrypt password hashing (10 salt rounds)
- Helmet.js security headers
- Rate limiting on auth routes (20 req / 15 min)
- Role-based access control (candidate / recruiter / admin)
- Auth guard on all dashboard pages

---

## 🐛 Bugs Fixed (v2)

1. **server.js** — `app` used before declaration; routes mounted before `app = express()`
2. **.env** — Duplicate key `MONGODB_URI=MONGODB_URI=...`
3. **User.js** — Stray backtick in comment; missing `return` in pre-save hook
4. **index.html** — `config.js` never loaded, causing `HireFlowConfig is not defined` crash
5. **candidate.js** — `mockApplications` declared as `const` but reassigned (`let` required)
6. **candidate.js** — Invalid CSS selectors `input[id="x"]` → `#x`
7. **dashboard.js** — Nested duplicate `addEventListener` inside `setupSaveJobButtons`
8. **server.js CORS** — Wrong origin `localhost:3000` (frontend runs on 5500)

---

## 🚀 Improvements Added

- `recruiter.js` — Full API-connected recruiter dashboard (post jobs, view applicants, update status, delete)
- Rate limiting + Helmet security headers
- `.env.example` safe template
- `applyForJob()` now calls real API with localStorage fallback
- `loadMyApplicationsFromAPI()` syncs real applications from backend
- User name/email populated in dashboard header from localStorage
