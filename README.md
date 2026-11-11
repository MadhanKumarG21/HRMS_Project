# TechNova HRMS (Human Resource Management System)

A state-of-the-art enterprise-grade Human Resource Management System built on the MERN stack (MongoDB, Express, React, Node.js). TechNova HRMS features dynamic modules, advanced role-based access controls, comprehensive security configurations, real-time audit logging, automated resume batch screening, and professional leave and attendance tracking dashboards.

---

## 🌟 Key Features

### 🔒 Enterprise Security
- **JWT Session Cookieless Architecture**: HttpOnly, Secure, SameSite cookies secure the admin auth tokens against XSS.
- **Dynamic Security Policies**: Set min password length, require symbols/uppercase/numbers, control session concurrency, login attempts lockout windows, and active sessions termination.
- **IP Whitelisting**: Restrict access to designated IP ranges or individual administration nodes.
- **Two-Factor Authentication (2FA)**: High-security authentication utilizing TOTP QR-codes and backup recovery codes.

### 🧩 Dynamic Module System
- **Module Gating**: Instantly suspend or activate sections of the platform (e.g. Leave Management, Recruitment).
- **Vibrant Navigation**: Sidebar navigation dynamically updates to reflect module availability in real-time.
- **Role-Based Views**: Fine-grained authorization structures depending on the admin role definitions.

### 📝 HR Core Operations
- **Employee Directories**: Standardized onboarding profile creations, banking coordinates, and document management.
- **Attendance Logging**: Log check-ins/outs with automatic calculation of working hours and status evaluation.
- **Leave Request Lifecycles**: Application processing with status revisions and audit logs history.
- **Resume Processing & Screening**: Upload multiple resumes in PDF/DOCX format to screen candidates against job descriptions using automated ATS keywords scoring.

---

## 📂 Project Architecture

```
HRMS_Project/
├── Backend/                 # Express REST API (ES Modules)
│   ├── config/              # Env & DB config
│   ├── Controllers/         # Business logic (admin + top-level)
│   ├── Middleware/          # Auth, validation, IP whitelist, password policy
│   ├── Models/              # Mongoose schemas (16 models)
│   ├── Routes/              # Route definitions & sub-routers
│   ├── utils/               # Email stub, security alerts
│   └── server.js            # Express entrypoint
├── Frontend/                # Vite + React 19 SPA
│   ├── src/
│   │   ├── Components/      # Sidebar, Topbar, ModuleGate, page sub-components
│   │   ├── hooks/           # AuthProvider context
│   │   ├── pages/           # 13 route pages
│   │   ├── services/        # Centralized fetch client with API namespaces
│   │   └── styles/          # Per-page + global CSS
│   ├── index.html
│   └── vite.config.js
└── README.md
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, React Router v6, Vite 8, Vanilla CSS.
- **Backend**: Node.js, Express v5, JWT, Multer, Mammoth.js, PDFjs-dist, Speakeasy (2FA), QRCode, bcryptjs, csv-writer, Helmet, express-rate-limit, express-validator, cookie-parser, cors, dotenv.
- **Database**: MongoDB, Mongoose v9.

---

## 🔌 API Endpoints Reference

All API routes are prefixed with `/api`.

### 🔑 Authentication (`/auth`)
* `POST /auth/login` - Authenticate admin credentials and set secure HttpOnly cookie session.
* `POST /auth/logout` - Clear the session cookie.
* `GET /auth/me` - Retrieve profile info for the currently authenticated user.
* `POST /auth/change-password` - Reset user password validating password policy rules.

### 👥 User Accounts (`/users`)
* `GET /users` - Retrieve users with pagination, filters, and sorting.
* `GET /users/password-policy` - Load current password complexity requirements.
* `GET /users/:id` - Fetch details for a specific user ID.
* `POST /users/create` - Create a new user account (Admin clearance required).
* `PATCH /users/:id` - Update user account properties (Admin clearance required).
* `PATCH /users/:id/toggle` - Deactivate or activate user accounts (Admin clearance required).
* `DELETE /users/:id` - Delete user account (Admin clearance required).

### 🏷️ Roles & Permissions (`/roles`)
* `GET /roles` - Fetch all role templates.
* `GET /roles/:id` - Fetch specific role template.
* `POST /roles` - Create a new custom role template.
* `PATCH /roles/:id` - Update role permissions.
* `DELETE /roles/:id` - Remove a custom role template.

### 📁 Employee Directory (`/employees`)
* `GET /employees` - Fetch all employee records.
* `GET /employees/:id` - Fetch detailed profile by record ID.
* `GET /employees/user/:userId` - Fetch employee details linked to a specific user account.
* `POST /employees` - Onboard a new employee.
* `PUT /employees/:id` - Edit employee records (Bank details, documents).
* `DELETE /employees/:id` - Delete an employee record.
* `GET /employees/stats` - Fetch aggregate counts (Active, On Leave, Terminated).

### 📅 Attendance Tracker (`/attendance`)
* `GET /attendance` - Fetch logs filtered by date or user.
* `GET /attendance/:id` - Fetch detailed log entry.
* `POST /attendance` - Log a new check-in/check-out.
* `PUT /attendance/:id` - Adjust check times and recalculate hours.
* `GET /attendance/stats` - Daily status metrics (Present, Absent, Late).

### 🏖️ Leave Management (`/leaves`)
* `GET /leaves` - Fetch leave applications.
* `GET /leaves/:id` - Get leave details.
* `POST /leaves` - Apply for a new leave request.
* `PATCH /leaves/:id/status` - Approve or reject leave application.
* `GET /leaves/stats` - Fetch approval queue metrics (Pending, Approved, Rejected).

### 🔎 Global Search & Analytics
* `GET /search?q={query}&type={type}` - Search unified collections.
* `GET /stats` - Admin dashboard stats.
* `GET /audit-logs` - View system activity history.
* `GET /audit-logs/export?format=csv` - Download audit files.

### 🛡️ System Infrastructure & Backups
* `POST /security/scan` - Run security diagnostic scans.
* `POST /backup` - Trigger system JSON database export.
* `POST /recruitment/batch-screen` - Process docx/pdf resumes for screening.

### ⚙️ Settings & Integrations
* Company settings, notification preferences, appearance (theme/sidebar/font/compact mode), integrations (Slack, Teams, Google Drive, Zoom), backup/restore.

---

## 🚀 Setup & Execution Instructions

### Prerequisites
- Node.js installed on your machine.
- MongoDB server running locally or via Atlas.

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your environmental settings inside a `.env` file:
   ```
   MONGO_URI=mongodb://127.0.0.1:27017/HRMS_Project
   JWT_SECRET=hrms_tn_super_secret_change_in_production_2026
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
   PORT=5000
   ```
4. Start the development server:
   ```bash
   npm run start
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot the local server:
   ```bash
   npm run dev
   ```

---

## 🛡️ Auditing & Fixes Summary

The codebase has undergone a full audit and performance optimization phase:
1. **Fetch API Stream Fix**: Resolved the double-read stream crash in `api.js` by reusing the parsed text object during `!response.ok` handles.
2. **Case-Sensitive Import Mismatches**: Fixed a build error on Linux systems where `App.jsx` imported `Auditlog.jsx` instead of the capitalized filename `AuditLog.jsx`.
3. **React Render Optimization**: Memoized the `moduleMap` reduction loop in `ModulesContext.jsx` to prevent hook recreation.
4. **Dynamic Sidebars**: Connected the navigation link items in the sidebar to the modules state context so they hide when a module is set to suspended.
5. **Backend Database Collision Prevention**: Added `userId` checks in the employee controller before creation to return a standard `400 Bad Request` instead of triggering a DB crash.
