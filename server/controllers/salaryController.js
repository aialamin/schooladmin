const SalaryPayment = require("../models/SalaryPayment");
const { generateMonthlySalaries, payAllSalaries, payEmployeeDue, recordSalaryPayment } = require("../services/salaryService");
const { canReadAllEmployees, findEmployeeForUser, isFinance } = require("../utils/access");

async function getSalaries(req, res, next) {
  try {
    const query = {};
    if (req.query.employee) query.employee = req.query.employee;
    if (req.query.status) query.status = req.query.status;
    if (req.query.salaryMonth) query.salaryMonth = req.query.salaryMonth;

    if (!canReadAllEmployees(req.user)) {
      const employee = await findEmployeeForUser(req.user);
      query.employee = employee?._id || null;
    }

    const salaries = await SalaryPayment.find(query)
      .populate("employee", "name role salaryType salaryAmount assignedClass subject contactInfo")
      .sort({ salaryMonth: -1, createdAt: -1 });

    return res.json({ salaries });
  } catch (error) {
    return next(error);
  }
}

async function generateSalaries(req, res, next) {
  try {
    if (!isFinance(req.user)) {
      return res.status(403).json({ message: "Only admin or accounts users can generate salary ledgers." });
    }

    const salaries = await generateMonthlySalaries(req.body);
    return res.status(201).json({ created: salaries.length, salaries });
  } catch (error) {
    return next(error);
  }
}

async function paySalary(req, res, next) {
  try {
    if (!isFinance(req.user)) {
      return res.status(403).json({ message: "Only admin or accounts users can pay salaries." });
    }

    const salary = await recordSalaryPayment(req.body);
    return res.status(201).json({ salary });
  } catch (error) {
    return next(error);
  }
}

async function payAll(req, res, next) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can run bulk salary payments." });
    }
    const results = await payAllSalaries({
      month:       req.body.month,
      bonusAmount: req.body.bonusAmount,
      note:        req.body.note,
    });
    return res.status(200).json({ paid: results.length, salaries: results });
  } catch (error) {
    return next(error);
  }
}

async function payEmployeeDueHandler(req, res, next) {
  try {
    if (!isFinance(req.user)) {
      return res.status(403).json({ message: "Only admin or accounts users can pay salaries." });
    }
    const result = await payEmployeeDue({
      employeeId:  req.body.employeeId,
      bonusAmount: req.body.bonusAmount,
      note:        req.body.note,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  generateSalaries,
  getSalaries,
  payAll,
  paySalary,
  payEmployeeDueHandler,
};
