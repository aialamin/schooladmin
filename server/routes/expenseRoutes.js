const express = require("express");
const { createExpense, listExpenses, removeExpense, updateExpense } = require("../controllers/expenseController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const writeAccess = permitRoles("admin", "accounts", "accountant");

router.use(protect);
router.get("/", listExpenses);
router.post("/", writeAccess, createExpense);
router.put("/:id", writeAccess, updateExpense);
router.delete("/:id", writeAccess, removeExpense);

module.exports = router;
