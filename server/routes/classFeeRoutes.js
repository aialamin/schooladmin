const express = require("express");
const {
  createClassFeeRule,
  deleteClassFeeRule,
  getClassFees,
  updateClassFeeRule,
} = require("../controllers/classFeeController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const financeAccess = permitRoles("admin", "accounts", "accountant");

router.use(protect);
router.get("/", getClassFees);
router.post("/", financeAccess, createClassFeeRule);
router.put("/:id", financeAccess, updateClassFeeRule);
router.delete("/:id", financeAccess, deleteClassFeeRule);

module.exports = router;
