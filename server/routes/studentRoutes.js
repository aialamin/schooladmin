const express = require("express");
const {
  createStudentRecord,
  deleteStudentRecord,
  getStudent,
  getStudents,
  updateStudentRecord,
} = require("../controllers/studentController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const writeAccess = permitRoles("admin", "teacher");

router.use(protect);
router.get("/", getStudents);
router.get("/:id", getStudent);
router.post("/", writeAccess, createStudentRecord);
router.put("/:id", writeAccess, updateStudentRecord);
router.delete("/:id", permitRoles("admin"), deleteStudentRecord);

module.exports = router;
