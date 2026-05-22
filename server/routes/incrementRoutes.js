const express = require("express");
const {
  createIncrementRecord,
  deleteIncrementRecord,
  getIncrements,
  updateIncrementRecord,
} = require("../controllers/incrementController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const incrementWriteAccess = permitRoles("admin", "accounts", "accountant");

router.use(protect);
router.get("/", permitRoles("admin", "accounts", "accountant", "audit", "teacher", "employee", "staff"), getIncrements);
router.post("/", incrementWriteAccess, createIncrementRecord);
router.put("/:id", incrementWriteAccess, updateIncrementRecord);
router.delete("/:id", permitRoles("admin"), deleteIncrementRecord);

module.exports = router;
