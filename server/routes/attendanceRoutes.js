const express = require("express");
const { biometricCheckIn, bulkMarkAttendance, createAttendance, editAttendance, listAttendance, removeAttendance } = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(protect);
router.get("/", listAttendance);
router.post("/", createAttendance);
router.post("/bulk", bulkMarkAttendance);
router.post("/biometric", biometricCheckIn);
router.put("/:id", editAttendance);
router.delete("/:id", removeAttendance);

module.exports = router;
