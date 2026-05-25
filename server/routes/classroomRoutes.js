const express = require("express");
const { protect, permitRoles } = require("../middleware/authMiddleware");
const { listClassrooms, createClassroom, updateClassroom, deleteClassroom } = require("../controllers/classroomController");

const router = express.Router();

router.use(protect);
router.get("/", listClassrooms);
router.post("/", permitRoles("admin"), createClassroom);
router.put("/:id", permitRoles("admin"), updateClassroom);
router.delete("/:id", permitRoles("admin"), deleteClassroom);

module.exports = router;
