const express = require("express");
const {
  createMarkRecord,
  deleteMarkRecord,
  getMarkResults,
  getMarks,
  updateMarkRecord,
} = require("../controllers/markController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const markWriteAccess = permitRoles("admin", "teacher");

router.use(protect);
router.get("/", getMarks);
router.get("/results", getMarkResults);
router.get("/summary", getMarkResults);
router.get("/result-summary", getMarkResults);
router.post("/", markWriteAccess, createMarkRecord);
router.put("/:id", markWriteAccess, updateMarkRecord);
router.delete("/:id", markWriteAccess, deleteMarkRecord);

module.exports = router;
