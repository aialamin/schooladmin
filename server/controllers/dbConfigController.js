const { getPublicConfig, testUri, saveAndReconnect, resetToDefault } = require("../services/dbConfigService");
const { ensureDemoAccounts } = require("../services/demoAccountService");

/**
 * GET /api/db-config
 * Returns the masked URI and connection state (admin only).
 */
async function getConfig(req, res, next) {
  try {
    const config = getPublicConfig();
    return res.json({ config });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/db-config/test
 * Tests a MongoDB URI without saving it.
 * Body: { uri }
 */
async function testConnection(req, res, next) {
  try {
    const { uri } = req.body || {};
    if (!uri) {
      return res.status(400).json({ message: "uri is required." });
    }
    const result = await testUri(uri);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/db-config
 * Tests, saves, and reconnects to the new URI.
 * Body: { uri }
 */
async function saveConfig(req, res, next) {
  try {
    const { uri } = req.body || {};
    if (!uri) {
      return res.status(400).json({ message: "uri is required." });
    }
    const result = await saveAndReconnect(uri);
    if (!result.ok) {
      return res.status(400).json({ message: result.error });
    }
    // Seed default admin/teacher/student accounts into the new database so it is usable immediately.
    try {
      await ensureDemoAccounts();
    } catch (seedErr) {
      console.warn("[DB Config] ensureDemoAccounts after reconnect failed:", seedErr.message);
    }
    return res.json({ message: "Database configuration saved. Reconnected and default accounts created.", dbName: result.dbName });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/db-config
 * Resets to default/env URI.
 */
async function resetConfig(req, res, next) {
  try {
    const result = await resetToDefault();
    if (!result.ok) {
      return res.status(400).json({ message: result.error });
    }
    try {
      await ensureDemoAccounts();
    } catch (seedErr) {
      console.warn("[DB Config] ensureDemoAccounts after reset failed:", seedErr.message);
    }
    return res.json({ message: "Database configuration reset to default.", dbName: result.dbName });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getConfig, testConnection, saveConfig, resetConfig };
