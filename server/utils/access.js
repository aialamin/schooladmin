const Employee = require("../models/Employee");
const Student = require("../models/Student");

const ADMIN_ROLES = ["admin"];
const FINANCE_ROLES = ["admin", "accounts", "accountant"];
const ACADEMIC_ROLES = ["admin", "teacher"];
const EMPLOYEE_READ_ALL_ROLES = ["admin", "accounts", "accountant", "audit"];
const STUDENT_WRITE_ROLES = ["admin", "teacher"];
const STUDENT_READ_ROLES = ["admin", "staff", "accounts", "accountant", "audit"];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function hasRole(user, roles) {
  return roles.includes(user?.role);
}

function isAdmin(user) {
  return hasRole(user, ADMIN_ROLES);
}

function isFinance(user) {
  return hasRole(user, FINANCE_ROLES);
}

function isAudit(user) {
  return user?.role === "audit";
}

function isAcademic(user) {
  return hasRole(user, ACADEMIC_ROLES);
}

function canReadAllEmployees(user) {
  return hasRole(user, EMPLOYEE_READ_ALL_ROLES);
}

function canReadAllStudents(user) {
  return hasRole(user, STUDENT_READ_ROLES);
}

function canWriteStudents(user) {
  return hasRole(user, STUDENT_WRITE_ROLES);
}

async function findEmployeeForUser(user) {
  if (!user) return null;

  const email = normalize(user.email);
  const name = normalize(user.name);
  const search = [];

  if (email) search.push({ "contactInfo.email": email });
  if (name) search.push({ name: new RegExp(`^${escapeRegex(name)}$`, "i") });

  if (!search.length) return null;
  return Employee.findOne({ $or: search });
}

async function findStudentForUser(user) {
  if (!user) return null;

  const email = normalize(user.email);
  const name = normalize(user.name);
  const search = [];

  if (email) search.push({ "contactInfo.email": email });
  if (name) search.push({ name: new RegExp(`^${escapeRegex(name)}$`, "i") });

  if (!search.length) return null;
  return Student.findOne({ $or: search });
}

async function findClassTeacherForUser(user) {
  if (user?.role !== "teacher") return null;
  const employee = await findEmployeeForUser(user);
  if (!employee?.isClassTeacher || !employee.assignedClass) return null;
  return employee;
}

async function getStudentScopeForUser(user, baseQuery = {}) {
  const query = { ...baseQuery };

  if (canReadAllStudents(user)) {
    return query;
  }

  if (user?.role === "teacher") {
    const classTeacher = await findClassTeacherForUser(user);
    query.className = classTeacher?.assignedClass || null;
    return query;
  }

  if (user?.role === "student") {
    const student = await findStudentForUser(user);
    query._id = student?._id || null;
    return query;
  }

  query._id = null;
  return query;
}

async function canAccessStudentRecord(user, studentOrId) {
  if (isAdmin(user) || isFinance(user)) return true;
  const student = typeof studentOrId === "object" && studentOrId?.className
    ? studentOrId
    : await Student.findById(studentOrId).select("className contactInfo name");
  if (!student) return false;

  if (user?.role === "teacher") {
    const classTeacher = await findClassTeacherForUser(user);
    return Boolean(classTeacher && student.className === classTeacher.assignedClass);
  }

  if (user?.role === "student") {
    const ownStudent = await findStudentForUser(user);
    return String(ownStudent?._id || "") === String(student._id || student.id || "");
  }

  return canReadAllStudents(user);
}

async function getRoutineScopeForUser(user, baseQuery = {}) {
  const query = { ...baseQuery };

  if (isAdmin(user) || isFinance(user) || isAudit(user) || user?.role === "staff") {
    return query;
  }

  if (user?.role === "teacher") {
    const classTeacher = await findClassTeacherForUser(user);
    if (classTeacher) {
      query.className = classTeacher.assignedClass;
      return query;
    }

    const employee = await findEmployeeForUser(user);
    query.teacherName = employee?.name ? new RegExp(`^${escapeRegex(employee.name)}$`, "i") : null;
    return query;
  }

  if (user?.role === "student") {
    const student = await findStudentForUser(user);
    query.className = student?.className || null;
    return query;
  }

  query._id = null;
  return query;
}

async function canManageRoutineRecord(user, routineOrClassName) {
  if (isAdmin(user)) return true;
  if (user?.role !== "teacher") return false;

  const className = typeof routineOrClassName === "string" ? routineOrClassName : routineOrClassName?.className;
  const classTeacher = await findClassTeacherForUser(user);
  return Boolean(classTeacher && className && classTeacher.assignedClass === className);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  ACADEMIC_ROLES,
  ADMIN_ROLES,
  EMPLOYEE_READ_ALL_ROLES,
  FINANCE_ROLES,
  STUDENT_READ_ROLES,
  STUDENT_WRITE_ROLES,
  canManageRoutineRecord,
  canReadAllEmployees,
  canReadAllStudents,
  canAccessStudentRecord,
  canWriteStudents,
  findClassTeacherForUser,
  findEmployeeForUser,
  findStudentForUser,
  getRoutineScopeForUser,
  getStudentScopeForUser,
  hasRole,
  isAcademic,
  isAudit,
  isAdmin,
  isFinance,
};
