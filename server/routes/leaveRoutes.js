const express = require("express");
const {
  getLeaveApplications,
  createLeaveApplication,
  reviewLeaveApplication,
  deleteLeaveApplication,
} = require("../controllers/leaveController");
const { protect, permitRoles } = require("../middleware/authMiddleware");

const router = express.Router();
const ALL_STAFF = ["admin", "teacher", "staff", "accounts", "accountant"];

router.use(protect);
router.get(  "/",           permitRoles(...ALL_STAFF),  getLeaveApplications);
router.post( "/",           permitRoles(...ALL_STAFF),  createLeaveApplication);
router.put(  "/:id/review", permitRoles("admin"),       reviewLeaveApplication);
router.delete("/:id",       permitRoles(...ALL_STAFF),  deleteLeaveApplication);

module.exports = router;
