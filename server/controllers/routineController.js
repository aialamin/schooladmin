const ClassRoutine = require("../models/ClassRoutine");
const { createRoutine, updateRoutine } = require("../services/routineService");
const { canManageRoutineRecord, getRoutineScopeForUser } = require("../utils/access");

async function getRoutines(req, res, next) {
  try {
    const query = {};
    if (req.query.className) query.className = req.query.className;
    if (req.query.day) query.day = req.query.day;
    if (req.query.status) query.status = req.query.status;

    const scopedQuery = await getRoutineScopeForUser(req.user, query);
    const routines = await ClassRoutine.find(scopedQuery).sort({ className: 1, day: 1, startTime: 1 });
    return res.json({ routines });
  } catch (error) {
    return next(error);
  }
}

async function createRoutineRecord(req, res, next) {
  try {
    if (!(await canManageRoutineRecord(req.user, req.body.className))) {
      return res.status(403).json({ message: "Only admin or the assigned class teacher can create routines for this class." });
    }

    const routine = await createRoutine(req.body, req.user.id);
    return res.status(201).json({ routine });
  } catch (error) {
    return next(error);
  }
}

async function updateRoutineRecord(req, res, next) {
  try {
    const existing = await ClassRoutine.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Routine record was not found." });
    }

    if (!(await canManageRoutineRecord(req.user, existing)) || !(await canManageRoutineRecord(req.user, req.body.className))) {
      return res.status(403).json({ message: "Only admin or the assigned class teacher can update this routine." });
    }

    const routine = await updateRoutine(req.params.id, req.body, req.user.id);
    return res.json({ routine });
  } catch (error) {
    return next(error);
  }
}

async function deleteRoutineRecord(req, res, next) {
  try {
    const existing = await ClassRoutine.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Routine record was not found." });
    }

    if (!(await canManageRoutineRecord(req.user, existing))) {
      return res.status(403).json({ message: "Only admin or the assigned class teacher can delete this routine." });
    }

    const routine = await existing.deleteOne();
    if (!routine) {
      return res.status(404).json({ message: "Routine record was not found." });
    }

    return res.json({ message: "Routine record deleted.", routine });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createRoutineRecord,
  deleteRoutineRecord,
  getRoutines,
  updateRoutineRecord,
};
