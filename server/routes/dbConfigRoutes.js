const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { getConfig, testConnection, saveConfig, resetConfig } = require("../controllers/dbConfigController");

const router = express.Router();

// All db-config routes require authentication + admin role
router.use(protect);
router.use(adminOnly);

router.get("/", getConfig);
router.post("/test", testConnection);
router.put("/", saveConfig);
router.delete("/", resetConfig);

module.exports = router;
