# School Manager ERP

A full-stack school management system covering students, staff, fees, marks, attendance, leave management, classrooms, and expenses. Runs as a **web app** (Render.com / any Node host) or a **one-click Windows desktop app** (Electron + embedded MongoDB — no server or internet required).

**Version:** 1.5.0 &nbsp;·&nbsp; **Stack:** React 18 · Express · MongoDB · Electron

---

## Table of Contents

1. [Features](#features)
2. [Roles & Permissions](#roles--permissions)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Quick Start (Web)](#quick-start-web)
6. [Desktop App (Electron)](#desktop-app-electron)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
9. [Multi-tenant Database Setup](#multi-tenant-database-setup)
10. [Deploy to Render.com](#deploy-to-rendercom)
11. [Keep the Server Always Running](#keep-the-server-always-running)
12. [Push to GitHub from VS Code](#push-to-github-from-vs-code)
13. [Fingerprint Authentication](#fingerprint-authentication)
14. [Caching & Performance Strategy](#caching--performance-strategy)

---

## Features

### Student Management
- Enroll students with name, class, section, roll number, guardian, contact, and address
- Assign and reassign students between sections freely (no restrictions)
- Student profile page with full payment history, marks, and result summary
- Class-wise and section-wise filtering throughout all views

### Class Sections
- Unlimited sections per class (not limited to Boys/Girls)
- Each section has its own assigned class teacher
- Sections are scoped per academic year
- Used as the basis for classroom assignments, marks filtering, and result filtering

### Classrooms
- Track every physical room: room number, floor, bench count, and student capacity
- Live student count per room (auto-computed from section assignments)
- **Multi-shift teacher assignment** — each room can have different teachers per shift (Morning, Day, Evening, or any custom shift name)
- Each shift maps to a specific class, section, and class teacher

### Cashier / Receptionist Portal
- Dedicated cashier dashboard designed for non-technical front-desk staff
- **Quick student finder** — search by name, roll number, or student ID with live dropdown results
- **One-click payment form** — select a student, fee type auto-fills from the class fee structure, enter amount received and submit
- **Auto-generated bill number** — every payment gets a unique `REC-YYYYMM-XXXXXX` receipt number
- **Printable A5 receipt** — PDF receipt prints automatically after every payment; re-print button persists for the last receipt
- Today's collection stats strip: total collected, payments made, students with dues, total outstanding
- Today's collection table showing all payments taken during the session
- Access scoped to: student payment records, class fees, results, and class teacher info
- No access to Settings, expenses, salaries, or employee records

### Fees & Payments
- Define fee structures per class: admission, session, monthly, and exam fees
- Record individual payments with fee type, billing month, amount paid, and due tracking
- Generate monthly fees for an entire class in one click
- Generate exam fees by term for a whole class in one click
- Full payment ledger per student with running due balance
- Responsive Finance Overview with collection stats

### Employee Management
- Staff profiles: name, role, salary type, phone, email, address, joining date, status
- **People overview dashboard**: total staff count, teacher count, other staff, monthly salary bill
- Role breakdown cards (teacher, accountant, staff, etc.) with active counts and salary totals
- Class teacher assignment grid showing which teacher covers which class

### Salaries & Increments
- Record monthly salary payments with paid amount and due tracking
- Generate monthly salary ledgers for all employees in one click
- **Pay (per employee)** — each employee with outstanding dues shows a **Pay** button that opens a dedicated modal:
  - Lists every unpaid month with amount / paid / due / status breakdown
  - **Bonus amount** field — added to the most recent unpaid month
  - Single confirm clears all unpaid months at once via `POST /api/salaries/pay-employee-due`
- **Pay All Salaries** — admin-only bulk payment for a selected month:
  - Only shows employees who are **unpaid or partial** for that month (skips already-paid)
  - Optional **bonus per employee** applied to everyone in the batch
  - Live preview table with salary + bonus + total per employee
  - Shows "✓ All employees are paid" if nothing is due
- **Dues alert strip** — salary section header shows total outstanding across all employees
- Salary ledger Due column: red badge with amount if unpaid, green "✓ Clear" if fully paid
- Salary increment records with previous salary, increment amount, effective date, and reason

### Leave & Absence Management
- Teachers and staff submit leave applications with date range and reason
- **Smart substitute assignment** — the form automatically lists all class periods the teacher is responsible for within the leave period (based on their class routine)
- For each affected period, applicant selects:
  - A **substitute teacher** from the list of active teachers
  - The **student section** the substitute will cover
- Applications are sent to admin for review
- Admin **Leave Requests** panel shows all applications with status filter tabs (All / Pending / Approved / Rejected)
- Admin can approve or reject each application with a written review note
- Full substitute assignment detail visible in both teacher and admin views

### Exam Marks & Results
- Enter marks per student: subject, exam type (monthly / half-yearly / annual / class test), total marks, obtained marks, contribution percentage
- **Class filter + section filter** on the Marks view to narrow down which students' marks you see
- **Result Cards** — automatically computed pass/fail results with grade and position
  - Filter by class, then teacher (shows only that teacher's section students), then student, then exam
  - Active filter chips with individual dismiss buttons
  - "Showing X of Y cards" count
- **Class Results** — tabular view with classwise filter dropdown

### Attendance
- Daily employee attendance: present, late, absent, leave, half-day
- Manual entry, bulk mark for a whole day, and biometric scan (WebAuthn / ZKTeco)
- Monthly attendance grid view
- Employees register fingerprint credentials from the Attendance panel

### Expenses
- Log school purchases and costs with title, category, amount, paid-to, payment method, and receipt number
- Categories: Asset Purchase, Tour, Food, Gifts, Event, Stationery, Utility, Maintenance, Other
- Monthly filter + category filter
- Category breakdown summary with totals

### Class Routines
- Full timetable for every class from **Nursery through Class 12** (including Science / Arts / Commerce streams)
- 6 periods per day × 6 days per week — 792 total routine entries seeded automatically
- **Timetable view** — visual day/period grid with subject colour-coding, teacher name, and room number; hover to edit or delete (admin)
- **List view** — searchable DataTable for bulk management
- **Class picker dropdown** to switch between all 22 classes
- Overlap detection (same teacher or same room at the same time)

### School Settings
- School name, short name, subtitle, address, phone, email, website
- Left and right logo URLs for report cards
- Academic year, session, default exam title, default pass mark, class start time
- Principal name, support email, admission notice, default result remarks

### Database Configuration *(Admin only)*
- Each school can connect their own MongoDB database from the Settings page
- Enter a MongoDB Atlas or local URI, test the connection, and save — server reconnects immediately
- Default admin accounts are automatically seeded into a new database on first connect
- Reset to the original database at any time
- Masked URI display (password hidden) with live connection status badge

### User Management
- Create, view, and manage user accounts with role assignment
- Roles: admin, teacher, accountant, accounts, staff, student, audit, cashier
- **Permissions matrix** — visual role-by-module grid showing each role's access level (full / view / write / own / none)
- Inline role change for any user account from the management table

### Dashboard
- Key metrics: total students, total employees, total income collected, total dues
- Monthly collection bar chart
- Recent payments feed
- **Cashier dashboard** — simplified payment station view with today's collection stats and quick payment form
- Role-filtered — teachers see only their class data, finance staff see fee data, cashiers see the payment terminal, students see their own records

---

## Roles & Permissions

| Role | Access |
|---|---|
| `admin` | Full access to all modules, leave requests management, bulk salary payment, database config, user management |
| `accountant` | Fees, payments, expenses, salaries — read + write |
| `accounts` | Finance read-only |
| `teacher` | Marks entry, routines, attendance, submit leave applications — scoped to assigned class/section |
| `staff` | Attendance view, submit leave applications, own profile |
| `student` | Own profile, own payment history, marks, and result cards |
| `audit` | Read-only access to all records |
| `cashier` | Student payment collection, class fees view, results, class teacher info — simplified payment terminal UI |

---

## Tech Stack

### Frontend
- React 18 + React Router v6
- Vite 6 (content-hashed production builds, vendor/react chunk split)
- Tailwind CSS v4 (utility-first, dark mode support)
- Axios with `Cache-Control: no-cache` interceptor
- `@simplewebauthn/browser` for WebAuthn biometric attendance registration

### Backend
- Node.js 22 · Express 4
- Mongoose 8 · MongoDB (Atlas cloud or local or embedded)
- **Gzip compression** on all responses (60–80% payload reduction)
- Custom JWT-based session tokens
- `Cache-Control: no-store` on all `/api` responses
- Dynamic database reconnection via `dbConfigService`

### Desktop
- Electron 31
- `mongodb-memory-server` — bundled offline MongoDB (no install needed)
- NSIS one-click installer for Windows x64 (no UAC prompt, per-user install)
- ZKTeco fingerprint reader integration via TCP/IP

---

## Project Structure

```
school-manager/
├── client/                        # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Login + health check pre-warm
│   │   │   ├── Dashboard.jsx      # All modules rendered here
│   │   │   └── Register.jsx
│   │   ├── layouts/
│   │   │   └── AdminLayout.jsx    # Sidebar, topbar, mobile nav
│   │   ├── components/            # Modal, reusable UI pieces
│   │   ├── services/
│   │   │   └── erpService.js      # All API calls (loadERPData + erpApi)
│   │   ├── api.js                 # Axios instance + interceptor
│   │   └── App.css                # All custom styles
│   └── vite.config.js             # Dev proxy /api → localhost:5001
│
├── server/                        # Express backend
│   ├── app.js                     # Middleware + all route registrations
│   ├── server.js                  # Entry point, DB connect, demo seed
│   ├── config/
│   │   ├── db.js                  # Mongoose connect (reads dbConfigService)
│   │   ├── roles.js               # Allowed roles list
│   │   └── school-config.json     # Runtime DB URI override (git-ignored)
│   ├── controllers/
│   │   ├── leaveController.js     # Leave application CRUD + admin review
│   │   ├── salaryController.js    # Salary payments + bulk pay-all
│   │   └── ...
│   ├── middleware/
│   │   ├── authMiddleware.js      # protect(), adminOnly(), permitRoles()
│   │   ├── cacheHeaders.js        # no-store for all /api routes
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── models/
│   │   ├── LeaveApplication.js    # Leave + embedded substitute entries
│   │   ├── Classroom.js           # Room + shifts schema
│   │   ├── ClassSection.js        # Sections per class
│   │   └── ...
│   ├── routes/
│   │   ├── leaveRoutes.js
│   │   ├── salaryRoutes.js        # Includes POST /pay-all
│   │   └── ...
│   ├── services/
│   │   ├── dbConfigService.js     # Read/write school-config.json, reconnect
│   │   ├── demoAccountService.js  # Seed default user accounts
│   │   ├── demoDataService.js     # Seed sample school data (792 routine entries)
│   │   └── salaryService.js       # recordSalaryPayment, payAllSalaries
│   └── utils/                     # password hash, session tokens, helpers
│
├── electron/
│   ├── main.cjs                   # Electron main process + tray
│   ├── preload.cjs                # Context bridge (IPC → renderer)
│   ├── mongodb.cjs                # Embedded MongoDB manager
│   ├── zkteco.cjs                 # ZKTeco fingerprint device (TCP/IP)
│   └── splash.html                # Loading screen
│
├── resources/                     # Installer icons (ico, icns, png)
├── scripts/                       # dev.js, ensure-deps.js
├── electron-builder.yml           # Desktop build config (NSIS)
├── render.yaml                    # Render.com one-command deploy
├── vercel.json                    # Vercel frontend deploy config
└── package.json
```

---

## Quick Start (Web)

### Prerequisites
- Node.js 22+
- MongoDB Atlas URI or local MongoDB

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/school-manager.git
cd school-manager
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5001
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/EducationManagement
JWT_SECRET=replace-with-a-long-random-secret
ENABLE_DEMO_ACCOUNTS=true
ENABLE_DEMO_DATA=true
CORS_ORIGIN=http://localhost:5173
```

### 3. Run in development

```bash
npm run dev
```

- Frontend: `http://localhost:5174` (or 5173)
- Backend API: `http://localhost:5001`

### 4. Build for production

```bash
npm run build    # builds client/dist
npm start        # serves both frontend + API from Express on PORT
```

### Demo accounts

| Email | Password | Role |
|---|---|---|
| admin@school.test | test1234 | admin |
| teacher@school.test | test1234 | teacher |
| accountant@school.test | test1234 | accountant |
| accounts@school.test | test1234 | accounts |
| staff@school.test | test1234 | staff |
| student@school.test | test1234 | student |
| audit@school.test | test1234 | audit |
| cashier@school.test | test1234 | cashier |

> These are only created when `ENABLE_DEMO_ACCOUNTS=true`.

---

## Desktop App (Electron)

The desktop app bundles Express + embedded MongoDB — **no internet, no external database, no setup required**.

### Development

```bash
npm run electron:dev
```

### Build Windows installer

```bash
npm run electron:build
```

Output: `dist-desktop/School Manager Setup.exe`

The installer is one-click NSIS, installs per-user (no UAC prompt), and creates a desktop shortcut. The app hides to the system tray when closed — right-click the tray icon → **Quit** to fully exit.

### Desktop database

By default the desktop app uses an embedded MongoDB instance stored in the user's app data folder. You can switch it to any MongoDB Atlas or network database from **Settings → Database Configuration** inside the app.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5001` | Express server port |
| `MONGODB_URI` | Yes* | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Secret for signing session tokens |
| `ENABLE_DEMO_ACCOUNTS` | No | `false` | Seed default accounts on startup |
| `ENABLE_DEMO_DATA` | No | `false` | Seed sample students/employees/classrooms/routines |
| `CORS_ORIGIN` | No | `*` | Allowed origin(s), comma-separated |
| `VITE_API_URL` | No | `/api` | Frontend API base URL |

> *Desktop app uses embedded MongoDB by default. `MONGODB_URI` is only required for web/server deployment.

---

## API Reference

All routes return JSON. Protected routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Server health check |
| POST | `/api/auth/login` | None | Login, returns token + user |
| POST | `/api/auth/register` | None | Self-register |
| GET | `/api/auth/me` | Bearer | Get current user profile |
| PUT | `/api/auth/me` | Bearer | Update name / email / photo / password |
| GET/POST | `/api/students` | Bearer | List / create students |
| GET/PUT/DELETE | `/api/students/:id` | Bearer | Read / update / delete student |
| GET/POST | `/api/employees` | Bearer | List / create employees |
| GET/PUT/DELETE | `/api/employees/:id` | Bearer | Read / update / delete employee |
| GET/POST | `/api/payments` | Bearer | Student fee payments |
| PUT | `/api/payments/:id` | Bearer | Update payment |
| POST | `/api/payments/generate-monthly` | Bearer | Bulk-generate monthly fees |
| POST | `/api/payments/generate-exam` | Bearer | Bulk-generate exam fees |
| GET/POST | `/api/salaries` | Bearer | Employee salary payments |
| POST | `/api/salaries/pay-all` | Bearer (admin) | Bulk pay all unpaid employees for a month (+ optional bonus) |
| POST | `/api/salaries/pay-employee-due` | Bearer (finance) | Clear all unpaid records for one employee (+ optional bonus) |
| POST | `/api/salaries/generate-monthly` | Bearer | Bulk-generate monthly salary ledger |
| GET/PUT/DELETE | `/api/salary-increments` | Bearer | Salary increment records |
| GET/POST | `/api/marks` | Bearer | Exam marks entry |
| GET | `/api/marks/results` | Bearer | Computed result cards |
| GET/POST | `/api/attendance` | Bearer | Employee attendance |
| POST | `/api/attendance/bulk` | Bearer | Bulk mark attendance |
| POST | `/api/attendance/biometric` | Bearer | Biometric attendance log |
| GET/POST | `/api/expenses` | Bearer | School expenses |
| GET/POST | `/api/class-fees` | Bearer | Class fee structures |
| GET/POST | `/api/routines` | Bearer | Class timetables |
| GET/POST | `/api/sections` | Bearer | Class sections |
| GET/POST | `/api/classrooms` | Bearer | Classrooms with shift assignments |
| GET/PUT | `/api/school-settings` | Bearer | School profile and report settings |
| GET/POST | `/api/users` | Bearer (admin) | User account management |
| GET | `/api/dashboard` | Bearer | Dashboard metrics |
| GET | `/api/db-config` | Bearer (admin) | Get current DB connection info |
| POST | `/api/db-config/test` | Bearer (admin) | Test a MongoDB URI |
| PUT | `/api/db-config` | Bearer (admin) | Save URI and reconnect |
| DELETE | `/api/db-config` | Bearer (admin) | Reset to default/env URI |
| GET | `/api/leaves` | Bearer | List leave applications (admin: all, others: own) |
| POST | `/api/leaves` | Bearer | Submit a new leave application |
| PUT | `/api/leaves/:id/review` | Bearer (admin) | Approve or reject an application |
| DELETE | `/api/leaves/:id` | Bearer | Delete application (own pending or admin any) |

---

## Multi-tenant Database Setup

Each school can use its own isolated MongoDB database without deploying separate servers.

### How it works

1. Deploy one instance of the app (web or desktop)
2. Admin logs in and goes to **Settings → Database Configuration**
3. Paste the school's MongoDB URI (Atlas or local)
4. Click **Test Connection** — verifies the URI works without saving
5. Click **Save & Connect** → confirms, server reconnects immediately
6. Default accounts (admin/teacher/student) are auto-seeded into the new database
7. All data (students, fees, marks, etc.) now comes from that school's database
8. Switching databases does **not** delete data — it only points the server elsewhere

### school-config.json

The saved URI is stored in `server/config/school-config.json` (git-ignored). URI priority on startup:

```
school-config.json → MONGODB_URI env → mongodb://127.0.0.1:27017/EducationManagement
```

### Default credentials after switching

When a fresh empty database is connected, these accounts are auto-created:

| Email | Password | Role |
|---|---|---|
| admin@school.test | test1234 | admin |
| teacher@school.test | test1234 | teacher |
| student@school.test | test1234 | student |
| cashier@school.test | test1234 | cashier |

Change passwords immediately after first login.

---

## Deploy to Render.com

### Option A — Full-stack on Render (recommended)

The repo includes `render.yaml` for a single-service deploy.

1. Push to GitHub
2. Go to [render.com](https://render.com) → **New → Blueprint** → connect your repo
3. Set these env vars in the Render dashboard:
   - `MONGODB_URI` — your Atlas connection string
   - `JWT_SECRET` — a long random string
   - `CORS_ORIGIN` — your Render app URL (e.g. `https://schooladmin.onrender.com`)
   - `ENABLE_DEMO_ACCOUNTS=true`
4. Deploy — Render runs `npm ci && npm run build` then `npm start`

**Cold starts:** The free tier spins down after 15 min of inactivity. The login page fires `GET /api/health` on mount to pre-warm the server before the user clicks Login. To eliminate cold starts entirely, see [Keep the Server Always Running](#keep-the-server-always-running).

### Option B — Render (API) + Vercel (frontend)

See [DEPLOYMENT_STEPS.md](./DEPLOYMENT_STEPS.md) for the full step-by-step guide.

---

## Keep the Server Always Running

On Render's free tier the server **sleeps after 15 minutes of no traffic** and takes 50–90 seconds to wake — this is what causes the "Starting the server…" spinner on the login page.

### Option A — UptimeRobot (free, no code changes)

1. Create a free account at [uptimerobot.com](https://uptimerobot.com)
2. **Add New Monitor** → HTTP(s)
3. Set the URL to `https://your-app.onrender.com/api/health`
4. Set the interval to **5 minutes**
5. Save

The server receives a ping every 5 minutes and never sleeps. Free plan allows up to 50 monitors.

### Option B — Upgrade Render to Starter ($7/month)

In the Render dashboard → your service → **Settings → Instance Type → Starter**. The server stays on 24/7 with no spin-up delay.

### Option C — Self-host with PM2 (local / VPS)

Run the server permanently on your own machine or a VPS using [PM2](https://pm2.keymetrics.io/):

```bash
# Install PM2 globally
npm install -g pm2

# Start the server
cd /path/to/school-manager
pm2 start server/server.js --name "school-manager"

# Auto-start on Windows reboot
pm2 startup
pm2 save

# Useful commands
pm2 status          # check running processes
pm2 logs school-manager   # view live logs
pm2 restart school-manager
pm2 stop school-manager
```

PM2 keeps the server alive forever and auto-restarts it if it crashes.

---

## Push to GitHub from VS Code

Your repo is already connected to GitHub. All changes can be committed and pushed directly from VS Code.

### Commit and push changes (VS Code UI)

1. Press `Ctrl + Shift + G` to open **Source Control**
2. Click `+` next to **Changes** to stage all modified files
3. Type a commit message in the box at the top
4. Press `Ctrl + Enter` to commit
5. Click the **Sync Changes** button (↑↓ icon) or go to `...` → **Push**

### First-time setup (new repo)

If the repo is not yet on GitHub:

1. Go to [github.com/new](https://github.com/new) → create a repo (no README)
2. Copy the HTTPS URL
3. In the VS Code terminal (`Ctrl + \``):
   ```bash
   git remote add origin https://github.com/yourname/school-manager.git
   git branch -M main
   git push -u origin main
   ```
4. VS Code will ask for a **Personal Access Token** — generate one at  
   GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token  
   Scopes needed: `repo`

### Quick reference

| Action | VS Code |
|---|---|
| Stage all | Source Control → `+` next to Changes |
| Stage one file | Hover file → click `+` |
| Commit | Type message → `Ctrl + Enter` |
| Push | `...` menu → Push |
| Pull | `...` menu → Pull |
| New branch | Click branch name bottom-left → Create new branch |

---

## Fingerprint Authentication

### Employee Attendance Biometric

Employees register fingerprint or Windows Hello credentials from the **Attendance** page. During daily check-in, they verify with their registered device — no password needed.

```
@simplewebauthn/browser  ──▶  POST /api/attendance/biometric
                                    │
                         Mongoose → EmployeeAttendance record
```

### ZKTeco Hardware Device (Desktop app)

Uses a physical ZKTeco fingerprint reader on the local network.

```
ZKTeco Device ──TCP/IP──▶ electron/zkteco.cjs ──IPC──▶ Electron main
                                                             │
                                             renderer (Login.jsx)
                                                             │
                                         POST /api/auth/fingerprint
                                                             │
                                         Express → looks up User by fingerprintId
                                                → returns JWT
```

**Setup:**
1. Add `fingerprintId: { type: String, default: null }` to `server/models/User.js`
2. Add `POST /api/auth/fingerprint` route that finds user by `fingerprintId` and returns a token
3. In `electron/main.cjs`, forward scan events via `mainWindow.webContents.send("fingerprint:scan", record)`
4. In `electron/preload.cjs`, expose `onFingerprintScan` via `contextBridge`
5. In `Login.jsx`, call the fingerprint login API on the scan event

---

## Caching & Performance Strategy

### HTTP Caching

| Layer | Policy | Reason |
|---|---|---|
| All `/api/*` responses | `Cache-Control: no-store` | Auth-protected, user-specific — never cache |
| Vite hashed assets (`/assets/*`) | `Cache-Control: public, max-age=31536000, immutable` | Content-hashed filenames — safe to cache forever |
| `index.html` | `Cache-Control: no-cache` | Must revalidate so browsers pick up new asset hashes after deploy |
| Other static files (icons, logos) | `Cache-Control: public, max-age=86400` | Rarely change — 1-day cache |
| Axios requests | `Cache-Control: no-cache`, `Pragma: no-cache` | Defence-in-depth against proxy caching |

### Compression

All API and HTML responses are **gzip-compressed** by the `compression` Express middleware, reducing payload size by 60–80%.

### Bundle Splitting (Vite)

The production build splits JavaScript into separate chunks:

| Chunk | Contents | Why |
|---|---|---|
| `vendor` | `react`, `react-dom` | Never changes between deploys — cached permanently |
| `router` | `react-router-dom` | Changes less often than app code |
| `http` | `axios` | Changes less often than app code |
| `index` | Application code | Re-downloads only when you deploy new features |

### Database Indexes

All high-traffic queries are backed by Mongoose indexes:

| Collection | Indexed fields |
|---|---|
| `Student` | `(className, rollNumber)` unique · `(status, className)` |
| `StudentPayment` | `(student, feeType, billingMonth, term)` |
| `SalaryPayment` | `(employee, salaryMonth)` unique |
| `Employee` | `(status, role)` |
| `ExamMark` | `(student, subject, academicYear, examType, examNo, month)` unique · `(className, subject, academicYear)` |
| `EmployeeAttendance` | `(employee, date)` unique · `(date)` |
| `ClassRoutine` | `(className, day, startTime, subject)` unique |
| `LeaveApplication` | `(applicant, status)` · `(fromDate, toDate)` |
| `Expense` | `(date, category)` |

---

## Changelog

### v1.5.0 — Cashier role · SVG icon system · Role-aware mobile nav

- **Cashier / Receptionist role** — new `cashier` role with a dedicated payment-station dashboard; quick student search, one-click payment form, auto-generated `REC-YYYYMM-XXXXXX` bill number, auto-print A5 PDF receipt, today's collection stats strip
- **8th user role** — `cashier` added to ALLOWED_ROLES, demo account (`cashier@school.test / test1234`) auto-seeded, role permissions matrix updated
- **SVG icon system** — all emoji characters removed from the UI and replaced with inline SVG icons (DashboardIcon component); affects result cards (rank medals), payment status indicators, student gender labels, info chips, search/browse tabs, and the role permissions matrix
- **Role-aware mobile bottom nav** — mobile bottom navigation now shows the 4 most relevant shortcuts per role (e.g. teacher gets Marks + Leave Apply, cashier gets Students + Fees, admin gets Students + Employees)
- **Sticky login page header** — the homepage header stays fixed at the top on both mobile and desktop at all viewport sizes
- **Permissions matrix** — role management panel now shows a full colour-coded access-level grid; inline role change available for all users

### v1.4.1 — Bug fixes
- **Critical:** `payEmployeeDue` was missing from `salaryService` module exports — caused a hard server crash on every Pay request; fixed
- **High:** UI did not update after Pay All / Pay Employee — `refreshPartialData` result was discarded instead of being merged into state; fixed
- **High:** Teacher filters (classwise results, mark entry section list) used `user.id` which is `undefined` — teachers saw no data; fixed to `user._id`
- **Medium:** "Pay in Full" button used base salary instead of total amount (ignoring bonus already entered); fixed to use `form.amount`
- **Medium:** All leave success notifications (submit, review, delete) used `setSuccess` instead of `showDoneAlert` so they never auto-cleared; fixed
- **Medium:** Receipt popup window was left open as a blank tab when blocked by the browser; now closed immediately on block
- **Low:** Modal `form` state was not reset on Cancel — stale data from a previous form could bleed into the next modal opened; fixed
- **Low:** `payAllNote` and `payEmpNote` were not cleared after a successful payment; fixed
- **Low:** Biometric attendance `useCallback` listed `refresh` in deps but called `refreshPartialData`; fixed to correct deps

### v1.4.0
- **Leave & Absence Management** — teachers/staff submit applications with date range, reason, and substitute teacher assignments per class period; admin review panel with approve/reject/note
- **Pay per employee** — dedicated modal shows all unpaid months, optional bonus amount, single confirm clears everything via new `pay-employee-due` endpoint
- **Pay All Salaries** — admin bulk payment; only processes unpaid/partial records for selected month; optional bonus per employee; live totals preview
- **Salary due visibility** — red badge on due amounts, green "✓ Clear" when paid, dues alert strip showing total outstanding, Pay button appears only when there are dues
- **Full class routines** — Nursery through Class 12 (including Science/Arts/Commerce streams), 792 entries seeded automatically
- **Routine timetable view** — visual day × period grid with subject colour-coding, teacher, room, class picker dropdown
- **Student section in leave substitutes** — each substitute assignment can specify which section the substitute covers
- **Gzip compression** — all API responses compressed, 60–80% smaller
- **Bundle splitting** — React/vendor chunk cached permanently by browser
- **MongoDB indexes** — added on Employee, Student, LeaveApplication for faster queries
- **Finance Overview responsive** — fixed overflow on mid-size and mobile screens
- **Mobile nav improvements** — Settings + Logout side-by-side in footer, Help moved to Appearance section, section titles in white

### v1.3.0
- **Classrooms** — manage physical rooms with bench count, capacity, live student count, and multi-shift teacher assignments
- **Unlimited sections** — any number of sections per class with free teacher assignment
- **Multi-tenant database** — admin can configure a per-school MongoDB URI from Settings; server reconnects live, seeds accounts automatically
- **People overview** — role breakdown stats, class teacher assignment grid, salary totals
- **Result Cards** — class + teacher + student + exam filter chain with active-filter chips
- **Marks view** — class + section filter showing only matching students' marks
- **Class Results** — classwise filter dropdown

### v1.2.0
- Attendance (manual, bulk, biometric/WebAuthn)
- Expenses tracker with category breakdown
- Dark mode
- Role-based route guards throughout

### v1.1.0
- Salary increments
- Class routines with conflict detection
- School settings with logo URLs

### v1.0.0
- Initial release: students, fees, payments, employees, salaries, marks, results

---

*School Manager ERP — built by [Md. Al Amin Hossain](mailto:alaminjava@gmail.com)*
