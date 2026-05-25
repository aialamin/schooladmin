const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const CONFIG_PATH = path.join(__dirname, "..", "config", "school-config.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskUri(uri) {
  if (!uri) return "";
  // Replace :password@ with :***@
  return uri.replace(/:([^@/]+)@/, ":***@");
}

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch (_) {
    // ignore parse errors — fall through to defaults
  }
  return {};
}

function writeConfig(config) {
  // Ensure directory exists
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the configured MongoDB URI.
 * Priority: school-config.json → MONGODB_URI env → local default.
 */
function getUri() {
  const config = readConfig();
  return config.mongoUri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/EducationManagement";
}

/**
 * Returns the masked URI and current connection state for the API.
 */
function getPublicConfig() {
  const uri = getUri();
  const config = readConfig();
  return {
    maskedUri: maskUri(uri),
    hasCustomUri: !!config.mongoUri,
    connectionState: mongoose.connection.readyState, // 0=disconnected,1=connected,2=connecting,3=disconnecting
    connectionStateLabel: ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] || "unknown",
    dbName: mongoose.connection.name || "",
  };
}

/**
 * Tests a URI by opening a temporary mongoose connection.
 * Returns { ok: true } or { ok: false, error: string }.
 */
async function testUri(uri) {
  if (!uri || typeof uri !== "string" || uri.trim().length === 0) {
    return { ok: false, error: "URI is required." };
  }

  let testConn;
  try {
    testConn = await mongoose.createConnection(uri.trim(), {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    }).asPromise();
    return { ok: true, dbName: testConn.name || "" };
  } catch (err) {
    return { ok: false, error: err.message || "Connection failed." };
  } finally {
    if (testConn) {
      try { await testConn.close(); } catch (_) { /* ignore */ }
    }
  }
}

/**
 * Saves the URI to config file and reconnects the main mongoose connection.
 * Returns { ok: true } or { ok: false, error: string }.
 */
async function saveAndReconnect(uri) {
  if (!uri || typeof uri !== "string" || uri.trim().length === 0) {
    return { ok: false, error: "URI is required." };
  }

  const cleanUri = uri.trim();

  // 1) Test first
  const testResult = await testUri(cleanUri);
  if (!testResult.ok) {
    return { ok: false, error: `Connection test failed: ${testResult.error}` };
  }

  // 2) Save to config
  const config = readConfig();
  config.mongoUri = cleanUri;
  writeConfig(config);

  // 3) Reconnect main connection
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[DB] Reconnected to: ${mongoose.connection.name}`);
    return { ok: true, dbName: mongoose.connection.name || "" };
  } catch (err) {
    return { ok: false, error: `Reconnect failed: ${err.message}` };
  }
}

/**
 * Resets to environment / default URI (removes custom config entry).
 */
async function resetToDefault() {
  const config = readConfig();
  delete config.mongoUri;
  writeConfig(config);

  const defaultUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/EducationManagement";

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(defaultUri, { serverSelectionTimeoutMS: 10000 });
    console.log(`[DB] Reset and reconnected to: ${mongoose.connection.name}`);
    return { ok: true, dbName: mongoose.connection.name || "" };
  } catch (err) {
    return { ok: false, error: `Reconnect failed: ${err.message}` };
  }
}

module.exports = { getUri, getPublicConfig, testUri, saveAndReconnect, resetToDefault };
