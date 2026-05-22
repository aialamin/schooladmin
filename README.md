# School Manager ERP

A full-stack school management system for student records, staff payroll, attendance, exams, fees, and expenses. Runs as a web app (self-hosted or Render.com) or as a one-click Windows desktop app powered by Electron + embedded MongoDB.

**Version:** 1.2.0 — **Stack:** React 18 · Express · MongoDB · Electron

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
9. [Deploy to Render.com](#deploy-to-rendercom)
10. [Fingerprint Authentication — Implementation Guide](#fingerprint-authentication--implementation-guide)
11. [Caching Strategy](#caching-strategy)

---

## Features

| Module | What it does |
|---|---|
| **Students** | Enroll, search, view profiles, track class/section |
| **Payments** | Collect tuition fees, generate receipts, payment history |
| **Class Fees** | Define fee structures per class |
| **Employees** | Staff profiles, job titles, departments |
| **Salaries** | Monthly salary processing, payment records |
| **Salary Increments** | Track and apply pay raises |
| **Exam Marks** | Enter and view subject-wise marks, class positions |
| **Attendance** | Daily employee attendance with present/absent/late status |
| **Expenses** | Log and categorize school expenses |
| **Class Routine** | Manage timetables per class |
| **School Settings** | School name, logo, address, contact |
| **Users** | Manage accounts, assign roles |
| **Dashboard** | Role-filtered overview with key metrics |

---

## Roles & Permissions

| Role | Access |
|---|---|
| `admin` | Full access to everything |
| `accountant` | Fees, payments, expenses, salary |
| `accounts` | Read-only finance views |
| `teacher` | Marks, routines, attendance |
| `staff` | Own profile, limited reads |
| `employee` | Own profile, limited reads |
| `student` | Own profile and payment history |
| `audit` | Read-only access to all records |

---

## Tech Stack

**Frontend**
- React 18 + React Router v6
- Vite 6 (with content-hashed builds)
- Tailwind CSS v4
- Axios (with `Cache-Control: no-cache` interceptor)

**Backend**
- Node.js 22 · Express 4
- Mongoose 8 · MongoDB Atlas (cloud) or embedded MongoDB (desktop)
- JWT-based sessions (custom session util)
- `Cache-Control: no-store` on all `/api` responses

**Desktop**
- Electron 31
- `mongodb-memory-server` (bundled offline MongoDB)
- NSIS one-click installer for Windows x64

---

## Project Structure

```
school-manager/
├── client/                   # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx     # Login + server pre-warm health check
│   │   │   ├── Dashboard.jsx # All modules rendered here
│   │   │   └── Register.jsx
│   │   ├── layouts/
│   │   │   └── AdminLayout.jsx  # Sidebar, topbar, mobile menu
│   │   ├── components/       # Modal, StatCard, StatusBadge
│   │   ├── api.js            # Axios instance + no-cache interceptor
│   │   └── App.css           # All styles (WCAG AA compliant)
│   └── vite.config.js        # Proxy /api → localhost:5001
│
├── server/                   # Express backend
│   ├── app.js                # Middleware, routes, static serving
│   ├── server.js             # Entry point, DB connect, demo seed
│   ├── config/
│   │   ├── db.js             # Mongoose connection
│   │   └── roles.js          # Allowed roles list
│   ├── controllers/          # One file per resource
│   ├── middleware/
│   │   ├── authMiddleware.js # protect(), adminOnly(), permitRoles()
│   │   ├── cacheHeaders.js   # no-store for all /api routes
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── models/               # Mongoose schemas
│   ├── routes/               # Express routers
│   ├── services/
│   │   ├── demoAccountService.js
│   │   └── demoDataService.js
│   └── utils/                # password hash, session, user helpers
│
├── electron/
│   ├── main.cjs              # Electron main process
│   ├── preload.cjs           # Context bridge
│   ├── mongodb.cjs           # Embedded MongoDB manager
│   ├── zkteco.cjs            # ZKTeco fingerprint device integration
│   └── splash.html           # Loading screen
│
├── resources/                # Icons for installer (ico, icns, png)
├── scripts/                  # dev.js, ensure-deps.js
├── electron-builder.yml      # Desktop build config (NSIS)
├── render.yaml               # Render.com deploy config
└── package.json
```

---

## Quick Start (Web)

### Prerequisites

- Node.js 22+
- MongoDB Atlas URI (or local MongoDB)

### 1. Clone and install

```bash
git clone https://github.com/alaminjava/schooladmin.git
cd schooladmin
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
MONGODB_DB=EducationManagement
JWT_SECRET=your-long-random-secret-here
ENABLE_DEMO_ACCOUNTS=true
ENABLE_DEMO_DATA=true
CORS_ORIGIN=http://localhost:5173
VITE_API_URL=/api
```

### 3. Run in development

```bash
npm run dev
```

Frontend: `http://localhost:5174` (or 5173)
Backend API: `http://localhost:5001`

### 4. Build for production

```bash
npm run build      # builds client/dist
npm start          # serves frontend + API from Express
```

### Demo accounts (when `ENABLE_DEMO_ACCOUNTS=true`)

| Email | Password | Role |
|---|---|---|
| admin@school.test | admin | admin |
| teacher@school.test | teacher | teacher |
| accountant@school.test | accountant | accountant |
| accounts@school.test | accounts | accounts |
| staff@school.test | staff | staff |
| student@school.test | student | student |
| audit@school.test | audit | audit |

---

## Desktop App (Electron)

The desktop app bundles Express + embedded MongoDB — **no internet or external database required**.

### Development

```bash
npm run electron:dev
```

### Build installer (Windows x64)

```bash
npm run electron:build
```

Output: `dist-desktop/School Manager Setup.exe`

The NSIS installer is one-click (no wizard), installs per-user (no UAC prompt), and creates a desktop shortcut.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5001` | Express server port |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `MONGODB_DB` | No | `EducationManagement` | Database name |
| `JWT_SECRET` | Yes | — | Secret for signing session tokens |
| `ENABLE_DEMO_ACCOUNTS` | No | `false` | Seed test accounts on startup |
| `ENABLE_DEMO_DATA` | No | `false` | Seed sample students/employees |
| `CORS_ORIGIN` | No | `*` | Allowed origin(s), comma-separated |
| `VITE_API_URL` | No | `/api` | Frontend API base URL |

---

## API Reference

All routes return JSON. Protected routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Server health check |
| POST | `/api/auth/login` | None | Login, returns token + user |
| POST | `/api/auth/register` | None | Self-register (student only) |
| GET | `/api/auth/me` | Bearer | Get current user |
| GET/POST | `/api/students` | Bearer | List / create students |
| GET/PUT/DELETE | `/api/students/:id` | Bearer | Read / update / delete student |
| GET/POST | `/api/employees` | Bearer | List / create employees |
| GET/POST | `/api/payments` | Bearer | Student fee payments |
| GET/POST | `/api/salaries` | Bearer | Employee salary payments |
| GET/POST | `/api/salary-increments` | Bearer | Salary increments |
| GET/POST | `/api/marks` | Bearer | Exam marks |
| GET/POST | `/api/attendance` | Bearer | Employee attendance |
| GET/POST | `/api/expenses` | Bearer | School expenses |
| GET/POST | `/api/class-fees` | Bearer | Class fee structures |
| GET/POST | `/api/routines` | Bearer | Class timetables |
| GET/PUT | `/api/school-settings` | Bearer | School profile |
| GET/POST | `/api/users` | Bearer (admin) | User management |
| GET | `/api/dashboard` | Bearer | Dashboard metrics |

---

## Deploy to Render.com

The repo includes `render.yaml` for one-command deploy.

### Steps

1. Push to GitHub.
2. Go to [render.com](https://render.com) → **New → Blueprint** → connect your repo.
3. Set these env vars in the Render dashboard (they are marked `sync: false` in `render.yaml`):
   - `MONGODB_URI` — your Atlas connection string
   - `CORS_ORIGIN` — your Render app URL (e.g. `https://schooladmin.onrender.com`)
4. Deploy.

**Cold starts:** The free tier spins down after 15 minutes of inactivity. The login page fires `GET /api/health` on mount to pre-warm the server before the user clicks login.

---

## Fingerprint Authentication — Implementation Guide

The desktop app already ships with `electron/zkteco.cjs` for ZKTeco hardware devices. Below is the complete guide for both **ZKTeco (desktop)** and **WebAuthn / FIDO2 (web + modern OS sensors)**.

---

### Option A — ZKTeco Hardware Device (Desktop app)

Use this when you have a physical ZKTeco fingerprint reader on the local network.

#### How it works

```
ZKTeco Device ──TCP/IP──▶ electron/zkteco.cjs ──IPC──▶ Electron main
                                                              │
                                              renderer (Login.jsx)
                                                              │
                                          POST /api/auth/fingerprint
                                                              │
                                          Express verifies device ID
                                          → looks up User by fingerprintId
                                          → returns JWT (same as password login)
```

#### Step 1 — Add `fingerprintId` to the User model

In `server/models/User.js`, add:

```js
fingerprintId: {
  type: String,
  default: null,
  sparse: true,   // allows multiple null values in the index
},
```

Enroll staff fingerprints on the ZKTeco device physically. The device assigns each person a **User ID** (numeric string). Store that ID in the user's `fingerprintId` field via the Users admin panel.

#### Step 2 — Add a fingerprint login route

In `server/routes/authRoutes.js`:

```js
// POST /api/auth/fingerprint
// Body: { fingerprintId: "12" }
router.post("/fingerprint", async (req, res, next) => {
  try {
    const { fingerprintId } = req.body;
    if (!fingerprintId) {
      return res.status(400).json({ message: "Fingerprint ID is required." });
    }
    const user = await User.findOne({ fingerprintId: String(fingerprintId) });
    if (!user) {
      return res.status(401).json({ message: "Fingerprint not recognised." });
    }
    return res.json({ token: createSession(user), user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});
```

#### Step 3 — Forward the scan event from Electron main

In `electron/main.cjs`, listen to the ZKTeco event and send it to the renderer:

```js
zkDevice.on("attendance", (record) => {
  // record = { userId: "12", timestamp: Date, type: 0 }
  mainWindow.webContents.send("fingerprint:scan", record);
});
```

#### Step 4 — Expose the channel in the preload

In `electron/preload.cjs`:

```js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onFingerprintScan: (callback) => {
    const handler = (_event, record) => callback(record);
    ipcRenderer.on("fingerprint:scan", handler);
    return () => ipcRenderer.removeListener("fingerprint:scan", handler);
  },
});
```

#### Step 5 — Listen in Login.jsx

In `client/src/pages/Login.jsx`, add inside the component:

```jsx
useEffect(() => {
  if (!window.electronAPI?.onFingerprintScan) return;

  const unsub = window.electronAPI.onFingerprintScan(async (record) => {
    try {
      const { data } = await api.post("/api/auth/fingerprint", {
        fingerprintId: record.userId,
      });
      login(data.token, data.user);  // your existing auth context fn
    } catch {
      setError("Fingerprint not recognised. Please use your password.");
    }
  });

  return () => unsub?.();
}, []);
```

Add a visual indicator on the login page:

```jsx
{window.electronAPI?.onFingerprintScan && (
  <p className="alert info" style={{ textAlign: "center" }}>
    Place your finger on the reader to log in instantly
  </p>
)}
```

---

### Option B — WebAuthn / FIDO2 (Web app, Windows Hello, Touch ID)

Use this for the **browser version** — works with built-in laptop sensors, Windows Hello, Android fingerprint.

#### Install libraries

```bash
npm install @simplewebauthn/server    # backend
npm install @simplewebauthn/browser   # frontend (client/)
```

#### Step 1 — Add credential storage to the User model

```js
// server/models/User.js
webauthnCredentials: [
  {
    credentialID:        { type: String, required: true },
    credentialPublicKey: { type: String, required: true },  // base64
    counter:             { type: Number, default: 0 },
    transports:          [String],
  }
],
```

#### Step 2 — Registration routes (one-time, done by the user)

```js
// server/routes/authRoutes.js
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} = require("@simplewebauthn/server");

// GET /api/auth/webauthn/register-options
router.get("/webauthn/register-options", protect, async (req, res) => {
  const options = await generateRegistrationOptions({
    rpName: "School Manager",
    rpID: process.env.WEBAUTHN_RP_ID || "localhost",
    userID: req.user._id.toString(),
    userName: req.user.email,
    attestationType: "none",
    authenticatorSelection: { userVerification: "required" },
  });
  // store challenge in session/cache briefly for verification
  req.user.webauthnChallenge = options.challenge;
  await req.user.save();
  res.json(options);
});

// POST /api/auth/webauthn/register
router.post("/webauthn/register", protect, async (req, res, next) => {
  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: req.user.webauthnChallenge,
      expectedOrigin: process.env.CORS_ORIGIN,
      expectedRPID: process.env.WEBAUTHN_RP_ID || "localhost",
    });
    if (!verification.verified) {
      return res.status(400).json({ message: "Verification failed." });
    }
    const { credentialID, credentialPublicKey, counter } =
      verification.registrationInfo;
    req.user.webauthnCredentials.push({
      credentialID: Buffer.from(credentialID).toString("base64url"),
      credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64"),
      counter,
    });
    await req.user.save();
    res.json({ message: "Fingerprint registered." });
  } catch (err) {
    next(err);
  }
});
```

#### Step 3 — Login routes

```js
const {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

// GET /api/auth/webauthn/login-options
router.get("/webauthn/login-options", async (req, res) => {
  const options = await generateAuthenticationOptions({
    rpID: process.env.WEBAUTHN_RP_ID || "localhost",
    userVerification: "required",
  });
  // store challenge in a short-lived server-side map keyed by challenge
  challengeStore.set(options.challenge, Date.now());
  res.json(options);
});

// POST /api/auth/webauthn/login
router.post("/webauthn/login", async (req, res, next) => {
  try {
    const { assertion } = req.body;
    // find user by credentialID
    const user = await User.findOne({
      "webauthnCredentials.credentialID": assertion.id,
    });
    if (!user) return res.status(401).json({ message: "Credential not found." });

    const cred = user.webauthnCredentials.find((c) => c.credentialID === assertion.id);
    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: assertion.clientDataJSON /* decoded challenge */,
      expectedOrigin: process.env.CORS_ORIGIN,
      expectedRPID: process.env.WEBAUTHN_RP_ID || "localhost",
      authenticator: {
        credentialID: Buffer.from(cred.credentialID, "base64url"),
        credentialPublicKey: Buffer.from(cred.credentialPublicKey, "base64"),
        counter: cred.counter,
      },
    });
    if (!verification.verified) {
      return res.status(401).json({ message: "Fingerprint verification failed." });
    }
    cred.counter = verification.authenticationInfo.newCounter;
    await user.save();
    res.json({ token: createSession(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
```

#### Step 4 — Frontend (Login.jsx)

```jsx
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

// Register fingerprint (call from Profile Settings page)
async function registerFingerprint() {
  const { data: options } = await api.get("/api/auth/webauthn/register-options");
  const credential = await startRegistration(options);
  await api.post("/api/auth/webauthn/register", credential);
}

// Login with fingerprint
async function fingerprintLogin() {
  const { data: options } = await api.get("/api/auth/webauthn/login-options");
  const assertion = await startAuthentication(options);
  const { data } = await api.post("/api/auth/webauthn/login", { assertion });
  login(data.token, data.user);
}
```

Add a button on the login page:

```jsx
<button type="button" className="btn outline" onClick={fingerprintLogin}>
  Use Fingerprint / Windows Hello
</button>
```

#### Step 5 — Environment variables to add

```env
WEBAUTHN_RP_ID=yourdomain.com     # must match the browser's hostname exactly
```

---

### Which approach should you use?

| Scenario | Approach |
|---|---|
| ZKTeco reader on school network | Option A — `electron/zkteco.cjs` |
| Desktop app, Windows Hello / PIN | Option B — WebAuthn |
| Web app, laptop Touch ID or Android | Option B — WebAuthn |
| Both hardware reader + web login | Implement both — they share the same JWT response |

---

## Caching Strategy

| Layer | Policy | Reason |
|---|---|---|
| All `/api/*` responses | `Cache-Control: no-store` | Auth-protected, user-specific — must never be cached |
| Vite hashed assets (`/assets/*`) | `Cache-Control: public, max-age=31536000, immutable` | Filename changes on rebuild — safe to cache forever |
| `index.html` | `Cache-Control: no-cache` | Must revalidate so browsers pick up new asset hashes |
| Other static files (icons, logo) | `Cache-Control: public, max-age=86400` | Rarely change — 1-day cache is safe |
| Axios requests | `Cache-Control: no-cache`, `Pragma: no-cache` | Defence-in-depth against intermediate proxy caching |

---

*School Manager ERP — built by [Md. Al Amin Hossain](mailto:alaminjava@gmail.com)*
