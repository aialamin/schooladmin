# School Manager ERP

A full-stack school management system covering students, staff, fees, marks, attendance, classrooms, and expenses. Runs as a **web app** (Render.com / any Node host) or a **one-click Windows desktop app** (Electron + embedded MongoDB — no server or internet required).

**Version:** 1.3.0 &nbsp;·&nbsp; **Stack:** React 18 · Express · MongoDB · Electron

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
11. [Push to GitHub from VS Code](#push-to-github-from-vs-code)
12. [Fingerprint Authentication](#fingerprint-authentication)
13. [Caching Strategy](#caching-strategy)

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

### Fees & Payments
- Define fee structures per class: admission, session, monthly, and exam fees
- Record individual payments with fee type, billing month, amount paid, and due tracking
- Generate monthly fees for an entire class in one click
- Generate exam fees by term for a whole class in one click
- Full payment ledger per student with running due balance

### Employee Management
- Staff profiles: name, role, salary type, phone, email, address, joining date, status
- **People overview dashboard**: total staff count, teacher count, other staff, monthly salary bill
- Role breakdown cards (teacher, accountant, staff, etc.) with active counts and salary totals
- Class teacher assignment grid showing which teacher covers which class

### Salaries & Increments
- Record monthly salary payments with paid amount and due tracking
- Generate monthly salaries for all employees in one click
- Salary increment records with previous salary, increment amount, effective date, and reason

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
- Register new fingerprint credentials from the Profile Settings page

### Expenses
- Log school purchases and costs with title, category, amount, paid-to, payment method, and receipt number
- Categories: Asset Purchase, Tour, Food, Gifts, Event, Stationery, Utility, Maintenance, Other
- Monthly filter + category filter
- Category breakdown summary with totals

### Class Routines
- Timetable entries per class: day, subject, teacher, room, start and end time
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
- Roles: admin, teacher, accountant, accounts, staff, student, audit
- WebAuthn credential management from the profile page

### Dashboard
- Key metrics: total students, total employees, total income collected, total dues
- Monthly collection bar chart
- Recent payments feed
- Role-filtered — teachers see only their relevant data, finance staff see fee data, etc.

---

## Roles & Permissions

| Role | Access |
|---|---|
| `admin` | Full access to all modules, database config, user management |
| `accountant` | Fees, payments, expenses, salaries — read + write |
| `accounts` | Finance read-only |
| `teacher` | Marks entry, routines, attendance — scoped to assigned class/section |
| `staff` | Attendance view, own profile |
| `student` | Own profile, own payment history |
| `audit` | Read-only access to all records |

---

## Tech Stack

### Frontend
- React 18 + React Router v6
- Vite 6 (content-hashed production builds)
- Tailwind CSS v4 (utility-first, dark mode support)
- Axios with `Cache-Control: no-cache` interceptor
- `@simplewebauthn/browser` for WebAuthn fingerprint registration

### Backend
- Node.js 22 · Express 4
- Mongoose 8 · MongoDB (Atlas cloud or local or embedded)
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
│   ├── controllers/               # One file per resource
│   │   ├── classroomController.js
│   │   ├── dbConfigController.js
│   │   └── ...
│   ├── middleware/
│   │   ├── authMiddleware.js      # protect(), adminOnly(), permitRoles()
│   │   ├── cacheHeaders.js        # no-store for all /api routes
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── models/
│   │   ├── Classroom.js           # Room + shifts schema
│   │   ├── ClassSection.js        # Sections per class
│   │   └── ...
│   ├── routes/
│   │   ├── classroomRoutes.js
│   │   ├── dbConfigRoutes.js
│   │   ├── sectionRoutes.js
│   │   └── ...
│   ├── services/
│   │   ├── dbConfigService.js     # Read/write school-config.json, reconnect
│   │   ├── demoAccountService.js  # Seed default user accounts
│   │   └── demoDataService.js     # Seed sample school data
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
| admin@school.test | admin | admin |
| teacher@school.test | teacher | teacher |
| accountant@school.test | accountant | accountant |
| accounts@school.test | accounts | accounts |
| staff@school.test | staff | staff |
| student@school.test | student | student |
| audit@school.test | audit | audit |

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
| `ENABLE_DEMO_DATA` | No | `false` | Seed sample students/employees/classrooms |
| `CORS_ORIGIN` | No | `*` | Allowed origin(s), comma-separated |
| `VITE_API_URL` | No | `/api` | Frontend API base URL |

> *Desktop app uses embedded MongoDB by default. `MONGODB_URI` is only required for the web/server deployment.

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
| POST | `/api/salaries/generate-monthly` | Bearer | Bulk-generate monthly salaries |
| GET/POST | `/api/salary-increments` | Bearer | Salary increment records |
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
| admin@school.test | admin | admin |
| teacher@school.test | teacher | teacher |
| student@school.test | student | student |

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

**Cold starts:** The free tier spins down after 15 min of inactivity. The login page fires `GET /api/health` on mount to pre-warm the server before the user clicks Login.

### Option B — Render (API) + Vercel (frontend)

See [DEPLOYMENT_STEPS.md](./DEPLOYMENT_STEPS.md) for the full step-by-step guide.

---

## Push to GitHub from VS Code

### First time (new repo)

1. **Create the repo on GitHub**
   - Go to [github.com/new](https://github.com/new)
   - Name it, set it to Public or Private, **do not** check "Add a README" (you already have one)
   - Click **Create repository**
   - Copy the HTTPS URL shown (e.g. `https://github.com/yourname/school-manager.git`)

2. **Open VS Code Source Control**
   - Press `Ctrl + Shift + G` or click the branch icon in the left sidebar

3. **Initialize Git (if not already a repo)**
   - Click **Initialize Repository** button in the Source Control panel
   - Or run in the terminal: `git init`

4. **Check `.gitignore`** — make sure these are listed:
   ```
   node_modules/
   client/dist/
   dist-desktop/
   .env
   server/config/school-config.json
   ```

5. **Stage all files**
   - In Source Control, click the `+` next to **Changes** to stage everything
   - Or run: `git add .`

6. **Write a commit message and commit**
   - Type a message in the "Message" box at the top of Source Control
   - Press `Ctrl + Enter` (or click the ✓ checkmark)

7. **Add the remote and push**
   - Open the terminal in VS Code (`Ctrl + \``)
   - Run:
     ```bash
     git remote add origin https://github.com/yourname/school-manager.git
     git branch -M main
     git push -u origin main
     ```
   - VS Code will ask for your GitHub username and password/token
   - Use a **Personal Access Token** (not your GitHub password) — generate one at  
     GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token  
     Scopes needed: `repo`

8. **Done** — your code is on GitHub

### Subsequent pushes

After making changes:

1. In **Source Control** panel, click `+` next to each changed file (or `+` next to Changes for all)
2. Type a commit message
3. Press `Ctrl + Enter` to commit
4. Click the **Sync Changes** button (circular arrows) at the top of Source Control  
   — this does `git pull` then `git push` in one step

### Using the VS Code UI (no terminal)

| Action | VS Code UI |
|---|---|
| Stage all changes | Source Control → click `+` next to **Changes** |
| Stage one file | Source Control → hover the file → click `+` |
| Commit | Type message → `Ctrl + Enter` |
| Push | Click `...` menu → **Push** |
| Pull | Click `...` menu → **Pull** |
| View branches | Click branch name in the bottom-left status bar |
| Create branch | Bottom-left branch name → **Create new branch** |

### Tip — GitHub extension

Install the **GitHub Pull Requests** extension from the VS Code marketplace for in-editor PR reviews and issue tracking.

---

## Fingerprint Authentication

### Option A — ZKTeco Hardware Device (Desktop app)

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
3. In `electron/main.cjs`, forward scan events to the renderer via `mainWindow.webContents.send("fingerprint:scan", record)`
4. In `electron/preload.cjs`, expose `onFingerprintScan` via `contextBridge`
5. In `Login.jsx`, call the fingerprint login API on the scan event

### Option B — WebAuthn / FIDO2 (Web + Windows Hello / Touch ID)

Already integrated. Users register their fingerprint or Windows Hello from **Profile Settings** and can use it to log in.

**Libraries:** `@simplewebauthn/server` (backend) · `@simplewebauthn/browser` (frontend — already installed)

See the full implementation guide in the previous version of this README or the `electron/zkteco.cjs` source file.

---

## Caching Strategy

| Layer | Policy | Reason |
|---|---|---|
| All `/api/*` responses | `Cache-Control: no-store` | Auth-protected, user-specific — never cache |
| Vite hashed assets (`/assets/*`) | `Cache-Control: public, max-age=31536000, immutable` | Content-hashed filenames — safe to cache forever |
| `index.html` | `Cache-Control: no-cache` | Must revalidate so browsers pick up new asset hashes after deploy |
| Other static files (icons, logos) | `Cache-Control: public, max-age=86400` | Rarely change — 1-day cache |
| Axios requests | `Cache-Control: no-cache`, `Pragma: no-cache` | Defence-in-depth against intermediate proxy caching |

---

## Changelog

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
