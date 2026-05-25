const EmployeeAttendance = require("../models/EmployeeAttendance");
const Employee = require("../models/Employee");

const VALID_STATUSES = ["present", "absent", "late", "leave", "half-day"];
const VALID_METHODS = ["manual", "biometric"];

function cleanString(v) { return String(v || "").trim(); }

function dayUTC(value) {
  if (!value) return dayUTC(new Date());
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Attendance date is not valid.");
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function normalizeStatus(s) {
  const v = cleanString(s);
  if (!VALID_STATUSES.includes(v)) throw new Error(`Status must be one of: ${VALID_STATUSES.join(", ")}.`);
  return v;
}

async function markAttendance(payload, userId) {
  const employee = await Employee.findById(payload.employee);
  if (!employee) throw new Error("Employee was not found.");
  const date = dayUTC(payload.date);
  const status = normalizeStatus(payload.status);
  const method = VALID_METHODS.includes(cleanString(payload.method)) ? cleanString(payload.method) : "manual";

  return EmployeeAttendance.findOneAndUpdate(
    { employee: employee.id, date },
    { employee: employee.id, date, checkIn: cleanString(payload.checkIn), checkOut: cleanString(payload.checkOut), status, method, deviceId: cleanString(payload.deviceId), note: cleanString(payload.note), markedBy: userId },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate("employee", "name role assignedClass subject contactInfo");
}

async function updateAttendance(id, payload, userId) {
  const status = normalizeStatus(payload.status);
  const record = await EmployeeAttendance.findByIdAndUpdate(
    id,
    { checkIn: cleanString(payload.checkIn), checkOut: cleanString(payload.checkOut), status, method: VALID_METHODS.includes(cleanString(payload.method)) ? cleanString(payload.method) : "manual", deviceId: cleanString(payload.deviceId), note: cleanString(payload.note), markedBy: userId },
    { new: true, runValidators: true }
  ).populate("employee", "name role assignedClass subject contactInfo");
  if (!record) throw new Error("Attendance record was not found.");
  return record;
}

async function biometricScan(payload, userId) {
  const employee = await Employee.findById(payload.employee);
  if (!employee) throw new Error("Employee was not found.");
  const date = dayUTC(payload.date || new Date());
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 5);
  const deviceId = cleanString(payload.deviceId) || "TERMINAL-01";
  const existing = await EmployeeAttendance.findOne({ employee: employee.id, date });

  if (!existing) {
    return EmployeeAttendance.create({ employee: employee.id, date, checkIn: timeStr, checkOut: "", status: "present", method: "biometric", deviceId, markedBy: userId });
  }
  if (existing.checkIn && !existing.checkOut) {
    existing.checkOut = timeStr;
    existing.method = "biometric";
    existing.deviceId = deviceId;
    await existing.save();
    return existing.populate("employee", "name role assignedClass subject contactInfo");
  }
  return existing.populate("employee", "name role assignedClass subject contactInfo");
}

async function bulkMark(payload, userId) {
  const date = dayUTC(payload.date);
  const entries = Array.isArray(payload.employees) ? payload.employees : [];
  const created = [];
  for (const entry of entries) {
    const emp = await Employee.findById(entry.employee);
    if (!emp) continue;
    const status = VALID_STATUSES.includes(cleanString(entry.status)) ? cleanString(entry.status) : "present";
    const record = await EmployeeAttendance.findOneAndUpdate(
      { employee: emp.id, date },
      { employee: emp.id, date, checkIn: cleanString(entry.checkIn), checkOut: cleanString(entry.checkOut), status, method: "manual", note: cleanString(entry.note), markedBy: userId },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    created.push(record);
  }
  return created;
}

async function getAttendance(filters = {}) {
  const match = {};
  if (filters.employee) match.employee = filters.employee;
  if (filters.date) { match.date = dayUTC(filters.date); }
  else if (filters.month) {
    const [y, m] = filters.month.split("-").map(Number);
    match.date = { $gte: new Date(Date.UTC(y, m - 1, 1)), $lt: new Date(Date.UTC(y, m, 1)) };
  }
  return EmployeeAttendance.find(match)
    .populate("employee", "name role assignedClass subject contactInfo status")
    .sort({ date: -1, createdAt: -1 });
}

module.exports = { biometricScan, bulkMark, getAttendance, markAttendance, updateAttendance };
