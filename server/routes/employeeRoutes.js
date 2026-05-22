const express = require("express");
const {
  createEmployeeRecord,
  deleteEmployeeRecord,
  getEmployee,
  getEmployees,
  updateEmployeeRecord,
} = require("../controllers/employeeController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const hrAccess = permitRoles("admin", "accounts", "accountant");

router.use(protect);
router.get("/", permitRoles("admin", "accounts", "accountant", "audit", "teacher", "employee", "staff"), getEmployees);
router.get("/:id", permitRoles("admin", "accounts", "accountant", "audit", "teacher", "employee", "staff"), getEmployee);
router.post("/", hrAccess, createEmployeeRecord);
router.put("/:id", hrAccess, updateEmployeeRecord);
router.delete("/:id", permitRoles("admin"), deleteEmployeeRecord);

module.exports = router;
