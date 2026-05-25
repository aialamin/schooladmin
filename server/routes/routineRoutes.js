const express = require("express");
const {
  createRoutineRecord,
  deleteRoutineRecord,
  getRoutines,
  updateRoutineRecord,
} = require("../controllers/routineController");
const { permitRoles, protect } = require("../middleware/authMiddleware");

const router = express.Router();
const routineWriteAccess = permitRoles("admin", "teacher");

router.use(protect);
router.get("/", getRoutines);
router.post("/", routineWriteAccess, createRoutineRecord);
router.put("/:id", routineWriteAccess, updateRoutineRecord);
router.delete("/:id", routineWriteAccess, deleteRoutineRecord);

module.exports = router;
