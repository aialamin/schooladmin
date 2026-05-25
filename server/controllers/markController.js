const ExamMark = require("../models/ExamMark");
const { createMark, getResultSummary, updateMark } = require("../services/markService");
const { canAccessStudentRecord, findStudentForUser, getStudentScopeForUser } = require("../utils/access");

async function buildQuery(queryParams, user) {
  const query = {};
  if (queryParams.student) query.student = queryParams.student;
  if (queryParams.className) query.className = queryParams.className;
  if (queryParams.subject) query.subject = queryParams.subject;
  if (queryParams.examType) query.examType = queryParams.examType;
  if (queryParams.academicYear) query.academicYear = Number(queryParams.academicYear);

  if (user?.role === "student") {
    const student = await findStudentForUser(user);
    query.student = student?._id || null;
  } else if (user?.role === "teacher") {
    const scoped = await getStudentScopeForUser(user);
    query.className = scoped.className || null;
  }

  return query;
}

async function getMarks(req, res, next) {
  try {
    const marks = await ExamMark.find(await buildQuery(req.query, req.user))
      .populate("student", "name className rollNumber dueAmount contactInfo")
      .populate("enteredBy", "name role")
      .sort({ academicYear: -1, className: 1, subject: 1, examType: 1, examNo: 1, month: 1 });

    return res.json({ marks });
  } catch (error) {
    return next(error);
  }
}

async function getMarkResults(req, res, next) {
  try {
    const filters = { ...req.query };
    if (req.user?.role === "student") {
      const student = await findStudentForUser(req.user);
      filters.student = student?._id || null;
    } else if (req.user?.role === "teacher") {
      const scoped = await getStudentScopeForUser(req.user);
      filters.className = scoped.className || null;
    }

    const results = await getResultSummary(filters);
    return res.json({ results });
  } catch (error) {
    return next(error);
  }
}

async function createMarkRecord(req, res, next) {
  try {
    if (!(await canAccessStudentRecord(req.user, req.body.student))) {
      return res.status(403).json({ message: "Class teachers can enter marks only for their assigned class." });
    }

    const mark = await createMark(req.body, req.user.id);
    return res.status(201).json({ mark });
  } catch (error) {
    return next(error);
  }
}

async function updateMarkRecord(req, res, next) {
  try {
    const existing = await ExamMark.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Mark record was not found." });
    }
    if (!(await canAccessStudentRecord(req.user, existing.student)) || !(await canAccessStudentRecord(req.user, req.body.student))) {
      return res.status(403).json({ message: "Class teachers can update marks only for their assigned class." });
    }

    const mark = await updateMark(req.params.id, req.body, req.user.id);
    return res.json({ mark });
  } catch (error) {
    return next(error);
  }
}

async function deleteMarkRecord(req, res, next) {
  try {
    const existing = await ExamMark.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Mark record was not found." });
    }
    if (!(await canAccessStudentRecord(req.user, existing.student))) {
      return res.status(403).json({ message: "Class teachers can delete marks only for their assigned class." });
    }

    await existing.deleteOne();
    return res.json({ message: "Mark record deleted.", mark: existing });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createMarkRecord,
  deleteMarkRecord,
  getMarkResults,
  getMarks,
  updateMarkRecord,
};
