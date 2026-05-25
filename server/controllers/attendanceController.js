const EmployeeAttendance = require("../models/EmployeeAttendance");
const { biometricScan, bulkMark, getAttendance, markAttendance, updateAttendance } = require("../services/attendanceService");
const { isAdmin, isFinance } = require("../utils/access");

async function listAttendance(req, res, next) {
  try {
    const attendance = await getAttendance({ employee: req.query.employee, date: req.query.date, month: req.query.month });
    return res.json({ attendance });
  } catch (error) { return next(error); }
}

async function createAttendance(req, res, next) {
  try {
    const record = await markAttendance(req.body, req.user.id);
    return res.status(201).json({ attendance: record });
  } catch (error) { return next(error); }
}

async function editAttendance(req, res, next) {
  try {
    const record = await updateAttendance(req.params.id, req.body, req.user.id);
    return res.json({ attendance: record });
  } catch (error) { return next(error); }
}

async function biometricCheckIn(req, res, next) {
  try {
    const record = await biometricScan(req.body, req.user.id);
    return res.status(201).json({ attendance: record });
  } catch (error) { return next(error); }
}

async function bulkMarkAttendance(req, res, next) {
  try {
    const records = await bulkMark(req.body, req.user.id);
    return res.status(201).json({ created: records.length, attendance: records });
  } catch (error) { return next(error); }
}

async function removeAttendance(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isFinance(req.user)) {
      return res.status(403).json({ message: "Only admin or accounts users can delete attendance records." });
    }
    const record = await EmployeeAttendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Attendance record was not found." });
    return res.json({ message: "Attendance record deleted.", attendance: record });
  } catch (error) { return next(error); }
}

module.exports = { biometricCheckIn, bulkMarkAttendance, createAttendance, editAttendance, listAttendance, removeAttendance };
