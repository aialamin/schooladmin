const Employee = require("../models/Employee");
const SalaryPayment = require("../models/SalaryPayment");
const SalaryIncrement = require("../models/SalaryIncrement");
const { createEmployee, updateEmployee } = require("../services/salaryService");
const { canReadAllEmployees, findEmployeeForUser, isAdmin, isFinance } = require("../utils/access");

async function buildEmployeeQuery(req, baseQuery = {}) {
  const query = { ...baseQuery };

  if (canReadAllEmployees(req.user)) {
    return query;
  }

  const employee = await findEmployeeForUser(req.user);
  query._id = employee?._id || null;
  return query;
}

async function getEmployees(req, res, next) {
  try {
    const baseQuery = {};
    if (req.query.role) baseQuery.role = req.query.role;
    if (req.query.status) baseQuery.status = req.query.status;

    const query = await buildEmployeeQuery(req, baseQuery);
    const employees = await Employee.find(query).sort({ role: 1, name: 1 });
    return res.json({ employees });
  } catch (error) {
    return next(error);
  }
}

async function getEmployee(req, res, next) {
  try {
    const query = await buildEmployeeQuery(req, { _id: req.params.id });
    const employee = await Employee.findOne(query);
    if (!employee) {
      return res.status(404).json({ message: "Employee was not found or you do not have access." });
    }

    const [salaries, increments] = await Promise.all([
      SalaryPayment.find({ employee: employee.id }).sort({ salaryMonth: -1 }),
      SalaryIncrement.find({ employee: employee.id }).sort({ effectiveDate: -1 }),
    ]);
    return res.json({ employee, salaries, increments });
  } catch (error) {
    return next(error);
  }
}

async function createEmployeeRecord(req, res, next) {
  try {
    if (!isFinance(req.user)) {
      return res.status(403).json({ message: "Only admin or accounts users can add employees." });
    }

    const employee = await createEmployee(req.body);
    return res.status(201).json({ employee });
  } catch (error) {
    return next(error);
  }
}

async function updateEmployeeRecord(req, res, next) {
  try {
    if (!isFinance(req.user)) {
      return res.status(403).json({ message: "Only admin or accounts users can edit employees." });
    }

    const employee = await updateEmployee(req.params.id, req.body);
    return res.json({ employee });
  } catch (error) {
    return next(error);
  }
}

async function deleteEmployeeRecord(req, res, next) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: "Only admin can delete employee records." });
    }

    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee was not found." });
    }

    await Promise.all([
      SalaryPayment.deleteMany({ employee: employee.id }),
      SalaryIncrement.deleteMany({ employee: employee.id }),
    ]);
    return res.json({ message: "Employee deleted.", employee });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createEmployeeRecord,
  deleteEmployeeRecord,
  getEmployee,
  getEmployees,
  updateEmployeeRecord,
};
