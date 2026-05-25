const Classroom = require("../models/Classroom");
const Student = require("../models/Student");

const POPULATE_SHIFTS = [
  { path: "shifts.section", select: "sectionName className" },
  { path: "shifts.classTeacher", select: "name email" },
];

async function listClassrooms(req, res, next) {
  try {
    const classrooms = await Classroom.find()
      .populate(POPULATE_SHIFTS)
      .sort({ roomNo: 1 })
      .lean();

    // Count active students in all sections assigned to each room
    const result = await Promise.all(
      classrooms.map(async (room) => {
        const sectionIds = room.shifts
          .map((s) => s.section?._id || s.section)
          .filter(Boolean);
        const currentStudents = sectionIds.length
          ? await Student.countDocuments({ section: { $in: sectionIds }, status: "active" })
          : 0;
        return { ...room, currentStudents };
      })
    );

    return res.json({ classrooms: result });
  } catch (err) {
    return next(err);
  }
}

async function createClassroom(req, res, next) {
  try {
    const classroom = await Classroom.create(req.body);
    await classroom.populate(POPULATE_SHIFTS);
    return res.status(201).json({ classroom });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A classroom with this room number already exists." });
    }
    return next(err);
  }
}

async function updateClassroom(req, res, next) {
  try {
    const classroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate(POPULATE_SHIFTS);
    if (!classroom) return res.status(404).json({ message: "Classroom not found." });
    return res.json({ classroom });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A classroom with this room number already exists." });
    }
    return next(err);
  }
}

async function deleteClassroom(req, res, next) {
  try {
    const classroom = await Classroom.findByIdAndDelete(req.params.id);
    if (!classroom) return res.status(404).json({ message: "Classroom not found." });
    return res.json({ message: "Classroom deleted." });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listClassrooms, createClassroom, updateClassroom, deleteClassroom };
