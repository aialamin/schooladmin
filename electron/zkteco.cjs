'use strict';
/**
 * zkteco.cjs — ZKTeco biometric device bridge
 *
 * Supports two integration modes:
 *
 * 1. PULL mode  (ZKTeco TCP SDK, port 4370)
 *    Connects to the device, downloads attendance logs, and pushes them to
 *    the local Express API (/api/attendance/biometric).
 *    Supported by: most ZKTeco attendance terminals (K40, ZK100, MB20, etc.)
 *
 * 2. PUSH mode  (ZKTeco PUSH SDK, HTTP)
 *    The device is configured to POST to http://<PC-IP>:<PUSH_PORT>/iclock/cdata
 *    We start a tiny HTTP server on PUSH_PORT that receives those events and
 *    forwards them to the local Express API.
 *
 * Usage from IPC (main.cjs):
 *   const bridge = new ZKTecoBridge(apiPort);
 *   await bridge.connectPull('192.168.1.201', 4370);   // PULL mode
 *   bridge.startPushListener(9876);                     // PUSH mode
 */

const net  = require('net');
const http = require('http');
const axios = require('axios');

// ── ZKTeco binary protocol helpers ─────────────────────────────────────────
const CMDS = {
  CONNECT:        0x03e8,
  DISCONNECT:     0x03e9,
  GET_ATTENDANCE: 0x0dce,
  ACK_OK:         0x07d0,
  REAL_TIME_LOG:  0x000b,
};

function buildPacket(cmd, session, reply, data = Buffer.alloc(0)) {
  const size = 8 + data.length;
  const buf  = Buffer.alloc(size);
  buf.writeUInt16LE(CMDS[cmd] ?? cmd, 0);
  buf.writeUInt16LE(0,              2);  // checksum placeholder
  buf.writeUInt16LE(session,        4);
  buf.writeUInt16LE(reply,          6);
  data.copy(buf, 8);
  // Simple checksum
  let sum = 0;
  for (let i = 0; i < buf.length; i += 2) sum += buf.readUInt16LE(i);
  buf.writeUInt16LE(sum & 0xffff, 2);
  return buf;
}

function parsePacket(buf) {
  if (buf.length < 8) return null;
  return {
    cmd:     buf.readUInt16LE(0),
    chk:     buf.readUInt16LE(2),
    session: buf.readUInt16LE(4),
    reply:   buf.readUInt16LE(6),
    data:    buf.slice(8),
  };
}

// ── ZKTeco record parser (26-byte attendance records) ──────────────────────
function parseAttendanceRecords(buf) {
  const records = [];
  const recSize = 40; // ZKTeco standard record size
  for (let offset = 0; offset + recSize <= buf.length; offset += recSize) {
    const uid    = buf.readUInt16LE(offset + 2);
    const status = buf.readUInt8(offset + 4);
    const punch  = buf.readUInt8(offset + 5);
    // Timestamp: 7-byte BCD YYYY MM DD HH mm ss day
    const year  = buf.readUInt16LE(offset + 6);
    const month = buf.readUInt8(offset + 8);
    const day   = buf.readUInt8(offset + 9);
    const hour  = buf.readUInt8(offset + 10);
    const min   = buf.readUInt8(offset + 11);
    const sec   = buf.readUInt8(offset + 12);
    records.push({
      uid,
      status,
      punch,
      time: new Date(year, month - 1, day, hour, min, sec).toISOString(),
    });
  }
  return records;
}

// ── Main class ─────────────────────────────────────────────────────────────
class ZKTecoBridge {
  constructor(apiPort = 5001) {
    this.apiPort      = apiPort;
    this.apiBase      = `http://localhost:${apiPort}`;
    this.socket       = null;
    this.session      = 0;
    this.replyCounter = 0;
    this._connected   = false;
    this.pushServer   = null;
    this._lastToken   = null; // injected by main so we can call local API
  }

  isConnected() { return this._connected; }

  setToken(token) { this._lastToken = token; }

  // ── PULL mode ─────────────────────────────────────────────────────────
  connectPull(ip, port = 4370) {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.setTimeout(8000);

      this.socket.connect(port, ip, () => {
        // Send CONNECT command
        const pkt = buildPacket(CMDS.CONNECT, 0, ++this.replyCounter);
        this.socket.write(pkt);
      });

      this.socket.once('data', (data) => {
        const pkt = parsePacket(data);
        if (pkt && pkt.cmd === CMDS.ACK_OK) {
          this.session    = pkt.session;
          this._connected = true;
          console.log('[ZKTeco] Connected, session:', this.session);
          // Enable real-time event stream
          this._enableRealTime();
          resolve({ ok: true, session: this.session });
        } else {
          reject(new Error('ZKTeco: CONNECT not acknowledged'));
        }
      });

      this.socket.on('data', (data) => this._handlePushData(data));
      this.socket.on('error', (err) => { this._connected = false; console.error('[ZKTeco]', err.message); });
      this.socket.on('close', () => { this._connected = false; });
      this.socket.on('timeout', () => { this.socket.destroy(); reject(new Error('ZKTeco: connection timeout')); });
    });
  }

  _enableRealTime() {
    // CMD_REG_EVENT — ask device to send realtime punches
    const pkt = buildPacket(0x01f4, this.session, ++this.replyCounter, Buffer.from([0xff, 0xff, 0x00, 0x00]));
    this.socket?.write(pkt);
  }

  _handlePushData(data) {
    const pkt = parsePacket(data);
    if (!pkt) return;

    // Real-time attendance event (cmd 0x000b)
    if (pkt.cmd === CMDS.REAL_TIME_LOG && pkt.data.length >= 8) {
      const uid  = pkt.data.readUInt16LE(0);
      const time = new Date().toISOString();
      console.log('[ZKTeco] Real-time punch — UID:', uid);
      this._forwardToAPI({ biometricId: String(uid), timestamp: time, source: 'zkteco-pull' });
    }
  }

  /** Download stored attendance records from the device */
  async getAttendanceLogs() {
    if (!this._connected || !this.socket) throw new Error('Not connected');
    return new Promise((resolve) => {
      const pkt = buildPacket(CMDS.GET_ATTENDANCE, this.session, ++this.replyCounter);
      this.socket.write(pkt);
      const chunks = [];
      const onData = (data) => {
        chunks.push(data);
        const combined = Buffer.concat(chunks);
        if (combined.length >= 8) {
          const p = parsePacket(combined);
          if (p && p.data.length > 0) {
            this.socket.removeListener('data', onData);
            resolve(parseAttendanceRecords(p.data));
          }
        }
      };
      this.socket.on('data', onData);
      setTimeout(() => { this.socket.removeListener('data', onData); resolve([]); }, 5000);
    });
  }

  disconnect() {
    if (this.socket) {
      const pkt = buildPacket(CMDS.DISCONNECT, this.session, ++this.replyCounter);
      this.socket.write(pkt);
      this.socket.destroy();
      this.socket = null;
    }
    this._connected = false;
  }

  // ── PUSH mode ──────────────────────────────────────────────────────────
  /**
   * Start a tiny HTTP server that receives ZKTeco PUSH SDK events.
   * Configure the device's server URL to: http://<this-PC-IP>:<listenPort>
   */
  startPushListener(listenPort = 9876) {
    if (this.pushServer) return;
    this.pushServer = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/iclock/cdata') {
        // Device handshake
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        return;
      }
      if (req.method === 'POST' && req.url.startsWith('/iclock/cdata')) {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          this._parsePushBody(body);
          res.writeHead(200);
          res.end('OK');
        });
        return;
      }
      res.writeHead(404); res.end();
    });
    this.pushServer.listen(listenPort, '0.0.0.0', () => {
      console.log('[ZKTeco PUSH] listening on port', listenPort);
    });
  }

  _parsePushBody(body) {
    // ZKTeco PUSH format: "ATTLOG\t<uid>\t<time>\t<status>\t<punch>\n..."
    const lines = body.split('\n').filter(Boolean);
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts[0] === 'ATTLOG' && parts.length >= 3) {
        const uid       = parts[1].trim();
        const timestamp = parts[2].trim();
        console.log('[ZKTeco PUSH] attendance — UID:', uid, 'at', timestamp);
        this._forwardToAPI({ biometricId: uid, timestamp, source: 'zkteco-push' });
      }
    }
  }

  /** Forward a biometric event to the local REST API */
  async _forwardToAPI(payload) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this._lastToken) headers['Authorization'] = `Bearer ${this._lastToken}`;
      await axios.post(`${this.apiBase}/api/attendance/biometric`, payload, { headers, timeout: 4000 });
    } catch (err) {
      console.warn('[ZKTeco] API forward failed:', err.message);
    }
  }

  stopPushListener() {
    this.pushServer?.close();
    this.pushServer = null;
  }
}

module.exports = ZKTecoBridge;
