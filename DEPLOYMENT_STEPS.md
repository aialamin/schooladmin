# Deployment Guide

This project supports three deployment modes:

| Mode | Description |
|---|---|
| **Render full-stack** | Render runs Express + serves the built React app from `client/dist` |
| **Render + Vercel split** | Render runs only the API; Vercel hosts the React frontend separately |
| **Electron desktop** | Self-contained Windows app with embedded MongoDB — no server needed |

---

## Before You Deploy

### Files to never commit

Make sure `.gitignore` includes:

```
node_modules/
client/dist/
dist-desktop/
.env
server/config/school-config.json
```

`school-config.json` stores any per-school database URI configured from the Settings page. It contains credentials and must never be committed.

### Files to always commit

```
package.json
package-lock.json
client/src/
server/
electron/
resources/
scripts/
render.yaml
vercel.json
vite.config.js
electron-builder.yml
.env.example
README.md
DEPLOYMENT_STEPS.md
```

---

## Step 1 — Prepare MongoDB Atlas

1. Open [MongoDB Atlas](https://cloud.mongodb.com) and create or open your cluster
2. Go to **Database Access** → create a user with a strong password
3. Go to **Network Access** → add `0.0.0.0/0` (allow from anywhere) for initial setup  
   Tighten this to Render's IP range after deployment if needed
4. Click **Connect** on your cluster → copy the connection string  
   Replace `<password>` with your database user password  
   Set the database name to `EducationManagement`

Example URI:
```
mongodb+srv://schooladmin:yourpassword@cluster0.abc123.mongodb.net/EducationManagement?retryWrites=true&w=majority
```

---

## Step 2 — Push to GitHub

### First push (new repo)

1. Create a new repo on [github.com/new](https://github.com/new) — leave "Initialize this repository" **unchecked**
2. In your project terminal:

```bash
git init
git add .
git commit -m "Initial commit — School Manager ERP v1.3.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Subsequent pushes

```bash
git add .
git commit -m "describe your change"
git push
```

### Using VS Code (no terminal needed)

1. Press `Ctrl + Shift + G` to open **Source Control**
2. Click `+` next to **Changes** to stage all files
3. Type a commit message in the box
4. Press `Ctrl + Enter` to commit
5. Click **Sync Changes** (circular arrows icon) to push

> Use a **Personal Access Token** instead of your GitHub password when prompted.  
> Generate one at: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → New token → select `repo` scope.

---

## Step 3A — Deploy Backend on Render (full-stack)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| Runtime | Node |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Root Directory | *(leave empty)* |

4. Add environment variables:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/EducationManagement
JWT_SECRET=use-a-long-random-secret-here
ENABLE_DEMO_ACCOUNTS=true
ENABLE_DEMO_DATA=true
CORS_ORIGIN=*
```

5. Click **Create Web Service** and wait for the build to finish
6. Test the health endpoint:
   ```
   https://your-service.onrender.com/api/health
   ```

7. Once working, update `CORS_ORIGIN` from `*` to your actual domain and redeploy

---

## Step 3B — Deploy Frontend on Vercel (split mode)

Use this if you want the frontend hosted separately on Vercel's CDN.

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the same GitHub repository
3. Configure:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `client/dist` |
| Install Command | `npm install` |
| Root Directory | *(leave empty)* |

4. Add environment variable:

```env
VITE_API_URL=https://your-render-service.onrender.com
```

> Do **not** add `/api` at the end — the frontend already appends `/api/...` to all requests.

5. Deploy
6. After Vercel gives you a domain (e.g. `https://school-manager.vercel.app`), go back to **Render** and update:
   ```env
   CORS_ORIGIN=https://school-manager.vercel.app
   ```
7. Trigger a redeploy on Render

---

## Step 4 — First Login

Open your deployed URL and log in with the default admin account:

```
Email:    admin@school.test
Password: admin
```

Then immediately:
1. Go to **Settings → User Profile** → change the admin password
2. Go to **Settings → School Settings** → set your school name, logo, and address
3. Add your class fee structures under **Class Fees**
4. Add your staff under **Employees**
5. Enroll students under **Students**

---

## Step 5 — Multi-school Database Setup (optional)

If you are hosting this for multiple schools on one deployment:

1. Each school logs into their own admin account
2. Admin goes to **Settings → Database Configuration**
3. Pastes their own MongoDB Atlas URI
4. Clicks **Test Connection** to verify
5. Clicks **Save & Connect** → server reconnects to their isolated database
6. Default accounts are auto-seeded in the new database
7. Each school's data is completely isolated in their own MongoDB database

---

## Building the Desktop Installer

```bash
npm run electron:build
```

Output: `dist-desktop/School Manager Setup.exe`

- One-click NSIS installer, no UAC prompt
- Per-user install — no admin rights needed
- Creates desktop shortcut automatically
- Embedded MongoDB — works offline

Distribute the `.exe` to schools. Each school installs it, opens it, and optionally connects their own cloud database from Settings if they want their data backed up online.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5001` | Express listen port |
| `MONGODB_URI` | Yes (web) | — | MongoDB connection string |
| `JWT_SECRET` | Yes | — | Token signing secret (min 32 chars recommended) |
| `ENABLE_DEMO_ACCOUNTS` | No | `false` | Seed default login accounts |
| `ENABLE_DEMO_DATA` | No | `false` | Seed sample data (students, employees, classrooms) |
| `CORS_ORIGIN` | No | `*` | Comma-separated allowed origins |
| `VITE_API_URL` | No | `/api` | Frontend API base URL (for split deploy) |

---

## Common Issues

### "Route not found" on all API calls
- The frontend may be sending `/api/api/...` requests. The server has a safety-net middleware that corrects this, but double-check `VITE_API_URL` does not include `/api`.

### Cold start on Render free tier
- Free services sleep after 15 min of inactivity. The login page pre-warms the server with `GET /api/health` before the user logs in.

### Cannot connect to new database from Settings
- Verify the Atlas URI includes the database name: `.../DatabaseName?retryWrites=...`
- Ensure the MongoDB Atlas cluster allows connections from your server IP (or `0.0.0.0/0`)
- Click **Test Connection** before saving — it will show the exact error

### Desktop app not reflecting code changes
- The Electron app caches the built files. Rebuild with `npm run electron:build` after every change.
- To test without a full build, edit files in `dist-desktop/win-unpacked/resources/app/` directly, then right-click the system tray icon → **Quit** and relaunch.
