'use strict';
/**
 * main.cjs — Electron main process for School Manager Desktop
 *
 * Start sequence:
 *   1. Show splash screen
 *   2. Start embedded MongoDB (persistent, offline after first download)
 *   3. Fork the Express server as a child process
 *   4. Wait for the API to become healthy
 *   5. Open the main browser window
 *   6. Install system-tray so the app persists when the window is closed
 */

const {
  app, BrowserWindow, Tray, Menu, ipcMain, dialog,
  shell, nativeImage, Notification, protocol,
} = require('electron');
const path     = require('path');
const { fork } = require('child_process');
const http     = require('http');
const os       = require('os');
const fs       = require('fs');

const MongoDBManager = require('./mongodb.cjs');
const ZKTecoBridge   = require('./zkteco.cjs');

// ─────────────────────────────────────────────────────────────────────────────
const isDev      = process.env.NODE_ENV === 'development' || !app.isPackaged;
const APP_PORT   = 5001;
const PUSH_PORT  = 9876;

let mainWindow   = null;
let splashWindow = null;
let tray         = null;
let serverProc   = null;
let mongoMgr     = null;
let zkteco       = null;

// ── Prevent second instance ──────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }
app.on('second-instance', () => { mainWindow?.show(); mainWindow?.focus(); });

// ── Splash ───────────────────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 520, height: 300,
    transparent: true, frame: false,
    alwaysOnTop: true, resizable: false,
    skipTaskbar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
}

function splashStatus(msg) {
  try { splashWindow?.webContents.send('splash:status', msg); } catch (_) {}
}

// ── Main window ──────────────────────────────────────────────────────────────
function createMainWindow() {
  const iconPath = resolveResource('icon.png');
  mainWindow = new BrowserWindow({
    width: 1440, height: 900,
    minWidth: 1100, minHeight: 700,
    show: false,
    title: 'School Manager',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.cjs'),
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      true,
    },
  });

  // Dev: load Vite dev server; Production: load Express static build
  mainWindow.loadURL(`http://localhost:${APP_PORT}`);

  mainWindow.once('ready-to-show', () => {
    splashWindow?.destroy();
    splashWindow = null;
    mainWindow.show();
    mainWindow.focus();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Hide to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'School Manager',
          body:  'App is still running in the system tray.',
          silent: true,
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── System tray ──────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = resolveResource('icon.png');
  const img = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(img);
  tray.setToolTip('School Manager ERP');
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open School Manager',
      click: () => { mainWindow?.show(); mainWindow?.focus(); },
    },
    { type: 'separator' },
    {
      label: 'Open Data Folder',
      click: () => shell.openPath(app.getPath('userData')),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { app.isQuitting = true; app.quit(); },
    },
  ]);
  tray.setContextMenu(menu);
}

// ── Health probe ─────────────────────────────────────────────────────────────
function waitForAPI(maxAttempts = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    function probe() {
      attempts++;
      const req = http.get(`http://localhost:${APP_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) return resolve();
        schedule();
      });
      req.on('error', schedule);
      req.setTimeout(2000, () => req.destroy());

      function schedule() {
        if (attempts >= maxAttempts) return reject(new Error('Server did not become ready in time.'));
        setTimeout(probe, 1000);
      }
    }
    setTimeout(probe, 1500);
  });
}

// ── Fork Express server ───────────────────────────────────────────────────────
function startServer(mongoUri) {
  return new Promise((resolve, reject) => {
    // In packaged apps the server lives in app.asar.unpacked/server
    const serverEntry = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'server.js')
      : path.join(__dirname, '..', 'server', 'server.js');

    serverProc = fork(serverEntry, [], {
      env: {
        ...process.env,
        MONGODB_URI:          mongoUri,
        PORT:                 String(APP_PORT),
        NODE_ENV:             'production',
        JWT_SECRET:           process.env.JWT_SECRET || 'school-manager-desktop-jwt-2025',
        ENABLE_DEMO_ACCOUNTS: 'true',
        ENABLE_DEMO_DATA:     'true',
        CORS_ORIGIN:          `http://localhost:${APP_PORT}`,
      },
      stdio: 'pipe',
    });

    serverProc.stdout?.on('data', (d) => console.log('[Server]', d.toString().trim()));
    serverProc.stderr?.on('data', (d) => console.error('[Server]', d.toString().trim()));
    serverProc.on('error', reject);
    serverProc.on('exit', (code) => {
      if (code !== 0 && code !== null) console.error('[Server] exited with code', code);
    });

    waitForAPI().then(resolve).catch(reject);
  });
}

// ── IPC handlers ─────────────────────────────────────────────────────────────
function registerIPC() {
  // App metadata
  ipcMain.handle('app:version',  () => app.getVersion());
  ipcMain.handle('app:userData', () => app.getPath('userData'));

  // Dialogs
  ipcMain.handle('dialog:openFile', (_, opts) =>
    dialog.showOpenDialog(mainWindow, opts));
  ipcMain.handle('dialog:saveFile', (_, opts) =>
    dialog.showSaveDialog(mainWindow, opts));

  // Shell
  ipcMain.handle('shell:openPath', (_, p) => shell.openPath(p));

  // Printing
  ipcMain.handle('print:window', () =>
    mainWindow?.webContents.print({ silent: false, printBackground: true }));
  ipcMain.handle('print:page', (_, opts) =>
    mainWindow?.webContents.print({ silent: false, printBackground: true, ...opts }));

  // ── ZKTeco ────────────────────────────────────────────────────────────
  function ensureZKTeco() {
    if (!zkteco) zkteco = new ZKTecoBridge(APP_PORT);
    return zkteco;
  }

  ipcMain.handle('zkteco:connect', async (_, { ip, port }) => {
    const bridge = ensureZKTeco();
    return bridge.connectPull(ip, port || 4370);
  });

  ipcMain.handle('zkteco:disconnect', () => ensureZKTeco().disconnect());

  ipcMain.handle('zkteco:status', () => ({
    connected: zkteco?.isConnected() || false,
  }));

  ipcMain.handle('zkteco:getAttendance', () =>
    ensureZKTeco().getAttendanceLogs());

  ipcMain.handle('zkteco:startPush', (_, { port }) => {
    ensureZKTeco().startPushListener(port || PUSH_PORT);
    return { ok: true, port: port || PUSH_PORT };
  });

  ipcMain.handle('zkteco:stopPush', () => ensureZKTeco().stopPushListener());

  ipcMain.handle('zkteco:setToken', (_, { token }) => {
    ensureZKTeco().setToken(token);
    return { ok: true };
  });

  // ── Network info ──────────────────────────────────────────────────────
  ipcMain.handle('net:localIPs', () => {
    const ifaces = os.networkInterfaces();
    const ips = [];
    for (const iface of Object.values(ifaces)) {
      for (const addr of (iface || [])) {
        if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
      }
    }
    return ips;
  });

  // ── DB backup / restore ───────────────────────────────────────────────
  ipcMain.handle('db:backup', async (_, { destPath }) => {
    const dataDir = path.join(app.getPath('userData'), 'data');
    const target  = destPath || path.join(app.getPath('documents'), `school-backup-${Date.now()}.json`);
    // Simple: open the data folder — for proper backup, use mongodump
    await shell.openPath(dataDir);
    return { ok: true, path: dataDir };
  });
}

// ── Resource path helper ─────────────────────────────────────────────────────
function resolveResource(name) {
  return app.isPackaged
    ? path.join(process.resourcesPath, name)
    : path.join(__dirname, '..', 'resources', name);
}

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createSplash();
  registerIPC();

  try {
    // 1. Embedded MongoDB
    splashStatus('Starting local database…');
    mongoMgr = new MongoDBManager(app.getPath('userData'));
    const mongoUri = await mongoMgr.start(splashStatus);

    // 2. Express server
    splashStatus('Starting application server…');
    await startServer(mongoUri);
    splashStatus('Loading interface…');

    // 3. Main UI + tray
    createMainWindow();
    createTray();

    // 4. Auto-start ZKTeco PUSH listener (device can push to us)
    zkteco = new ZKTecoBridge(APP_PORT);
    zkteco.startPushListener(PUSH_PORT);
    console.log(`[ZKTeco PUSH] listener on port ${PUSH_PORT}`);

  } catch (err) {
    console.error('[Startup]', err);
    dialog.showErrorBox(
      'School Manager — Startup Error',
      `${err.message}\n\nPlease restart the app. If the problem persists, contact support.`,
    );
    app.quit();
  }
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.on('window-all-closed', () => {
  // Keep running in tray (do not quit) — macOS & Windows
});

app.on('activate', () => {
  if (!mainWindow) createMainWindow();
  else mainWindow.show();
});

app.on('before-quit', async () => {
  app.isQuitting = true;
  console.log('[App] Shutting down…');

  zkteco?.disconnect();
  zkteco?.stopPushListener();

  if (serverProc) {
    serverProc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 1000));
  }

  await mongoMgr?.stop();
  tray?.destroy();
});

// Suppress Chromium GPU crash dialog
app.on('gpu-process-crashed', () => {});
app.on('render-process-gone', () => {});
