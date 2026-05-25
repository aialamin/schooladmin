'use strict';
/**
 * preload.cjs — contextBridge between Electron main ↔ React renderer.
 *
 * All APIs exposed here are available in the browser as window.electronAPI.
 * Nothing from Node.js leaks into the renderer directly.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── App info ──────────────────────────────────────────────────────────
  getVersion:  ()       => ipcRenderer.invoke('app:version'),
  getUserData: ()       => ipcRenderer.invoke('app:userData'),
  isDesktop:   ()       => true,

  // ── Native dialogs ────────────────────────────────────────────────────
  openFile:  (options)  => ipcRenderer.invoke('dialog:openFile',  options),
  saveFile:  (options)  => ipcRenderer.invoke('dialog:saveFile',  options),
  openPath:  (filePath) => ipcRenderer.invoke('shell:openPath',   filePath),

  // ── Printing ──────────────────────────────────────────────────────────
  printWindow: ()       => ipcRenderer.invoke('print:window'),
  printPage:   (opts)   => ipcRenderer.invoke('print:page', opts),

  // ── ZKTeco biometric device ───────────────────────────────────────────
  zkteco: {
    connect:       (ip, port)  => ipcRenderer.invoke('zkteco:connect',       { ip, port }),
    disconnect:    ()          => ipcRenderer.invoke('zkteco:disconnect'),
    status:        ()          => ipcRenderer.invoke('zkteco:status'),
    getLogs:       ()          => ipcRenderer.invoke('zkteco:getAttendance'),
    startPush:     (port)      => ipcRenderer.invoke('zkteco:startPush',     { port }),
    stopPush:      ()          => ipcRenderer.invoke('zkteco:stopPush'),
    setToken:      (token)     => ipcRenderer.invoke('zkteco:setToken',      { token }),
  },

  // ── Realtime biometric events from main → renderer ────────────────────
  onBiometricEvent: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('biometric:event', handler);
    return () => ipcRenderer.removeListener('biometric:event', handler);
  },

  // ── Database backup / restore ─────────────────────────────────────────
  backupDB:  (destPath) => ipcRenderer.invoke('db:backup',  { destPath }),
  restoreDB: (srcPath)  => ipcRenderer.invoke('db:restore', { srcPath }),

  // ── Network info (for PUSH mode setup) ───────────────────────────────
  getLocalIPs: () => ipcRenderer.invoke('net:localIPs'),
});
