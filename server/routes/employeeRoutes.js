const express = require("express");
const {
  createEmployeeRecord,
  deleteEmployeeRecord,
  getEmployee,
  getEmployees,
  updateEmployeeRecord,
} = require("../controllers/employeeController");
const {
  getRegisterOptions,
  removeCredential,
  verifyRegister,
} = require("../controllers/employeeBiometricController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const hrAccess = permitRoles("admin", "accounts", "accountant");

router.use(protect);
router.get("/", permitRoles("admin", "accounts", "accountant", "audit", "teacher", "employee", "staff"), getEmployees);

// ── Biometric registration routes (must be before /:id to avoid param conflicts)
router.get("/:id/biometric/register-options", hrAccess, getRegisterOptions);
router.post("/:id/biometric/register", hrAccess, verifyRegister);
router.delete("/:id/biometric/:credentialId", hrAccess, removeCredential);

router.get("/:id", permitRoles("admin", "accounts", "accountant", "audit", "teacher", "employee", "staff"), getEmployee);
router.post("/", hrAccess, createEmployeeRecord);
router.put("/:id", hrAccess, updateEmployeeRecord);
router.delete("/:id", permitRoles("admin"), deleteEmployeeRecord);

module.exports = router;
