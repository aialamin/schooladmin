const ClassRoutine = require("../models/ClassRoutine");

function cleanString(value) {
  return String(value || "").trim();
}

function minutes(value) {
  const [hour, minute] = cleanString(value).split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
  return hour * 60 + minute;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function buildRoutinePayload(payload, userId) {
  const className = cleanString(payload.className);
  const day = cleanString(payload.day);
  const startTime = cleanString(payload.startTime);
  const endTime = cleanString(payload.endTime);
  const subject = cleanString(payload.subject);
  const teacherName = cleanString(payload.teacherName);
  const startMinutes = minutes(startTime);
  const endMinutes = minutes(endTime);

  if (!className || !day || !startTime || !endTime || !subject || !teacherName) {
    throw new Error("Class, day, start time, end time, subject, and teacher name are required.");
  }

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
    throw new Error("Routine end time must be later than start time.");
  }

  return {
    className,
    day,
    startTime,
    endTime,
    subject,
    teacherName,
    room: cleanString(payload.room),
    note: cleanString(payload.note),
    status: cleanString(payload.status) || "active",
    createdBy: userId,
  };
}

async function ensureNoRoutineConflict(payload, excludeId = null) {
  if (payload.status === "inactive") return;

  const query = {
    day: payload.day,
    status: "active",
    $or: [
      { className: payload.className },
      { teacherName: new RegExp(`^${escapeRegex(payload.teacherName)}$`, "i") },
    ],
  };

  const existingRoutines = await ClassRoutine.find(query);
  const start = minutes(payload.startTime);
  const end = minutes(payload.endTime);

  for (const routine of existingRoutines) {
    if (excludeId && String(routine._id) === String(excludeId)) continue;
    if (!overlaps(start, end, minutes(routine.startTime), minutes(routine.endTime))) continue;

    if (routine.className === payload.className) {
      throw new Error(`Routine conflict: ${payload.className} already has ${routine.subject} on ${payload.day} from ${routine.startTime} to ${routine.endTime}.`);
    }

    if (routine.teacherName.toLowerCase() === payload.teacherName.toLowerCase()) {
      throw new Error(`Routine conflict: ${payload.teacherName} already has another class on ${payload.day} from ${routine.startTime} to ${routine.endTime}.`);
    }
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createRoutine(payload, userId) {
  const routinePayload = buildRoutinePayload(payload, userId);
  await ensureNoRoutineConflict(routinePayload);
  return ClassRoutine.create(routinePayload);
}

async function updateRoutine(id, payload, userId) {
  const routinePayload = buildRoutinePayload(payload, userId);
  await ensureNoRoutineConflict(routinePayload, id);
  const routine = await ClassRoutine.findByIdAndUpdate(id, routinePayload, {
    new: true,
    runValidators: true,
  });

  if (!routine) {
    throw new Error("Routine record was not found.");
  }

  return routine;
}

module.exports = {
  createRoutine,
  updateRoutine,
};
