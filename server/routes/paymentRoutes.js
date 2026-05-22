const express = require("express");
const {
  createExamFees,
  createMonthlyFees,
  createPayment,
  getPayments,
  updatePayment,
} = require("../controllers/paymentController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const paymentWriteAccess = permitRoles("admin", "accounts", "accountant", "teacher");
const financeAccess = permitRoles("admin", "accounts", "accountant");

router.use(protect);
router.get("/", getPayments);
router.post("/", paymentWriteAccess, createPayment);
router.put("/:id", paymentWriteAccess, updatePayment);
router.post("/generate-monthly", financeAccess, createMonthlyFees);
router.post("/generate-exam", financeAccess, createExamFees);

module.exports = router;
