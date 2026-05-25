const express = require("express");
const { getMe, login, register, updateMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  registerOptions,
  registerVerify,
  loginOptions,
  loginVerify,
  removeCredential,
} = require("../controllers/webauthnController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

// ── WebAuthn / biometric routes ───────────────────────────────────────────────
router.get("/webauthn/register-options",             protect, registerOptions);
router.post("/webauthn/register",                    protect, registerVerify);
router.get("/webauthn/login-options",                         loginOptions);
router.post("/webauthn/login",                                loginVerify);
router.delete("/webauthn/credential/:credentialID",  protect, removeCredential);

module.exports = router;
