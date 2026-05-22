const express = require("express");
const { generateSalaries, getSalaries, paySalary } = require("../controllers/salaryController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const financeAccess = permitRoles("admin", "accounts", "accountant");

router.use(protect);
router.get("/", permitRoles("admin", "accounts", "accountant", "audit", "teacher", "employee", "staff"), getSalaries);
router.post("/", financeAccess, paySalary);
router.post("/generate-monthly", financeAccess, generateSalaries);

module.exports = router;
