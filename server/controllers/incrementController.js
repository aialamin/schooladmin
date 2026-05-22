const SalaryIncrement = require("../models/SalaryIncrement");
const { createIncrement, updateIncrement } = require("../services/incrementService");
const { canReadAllEmployees, findEmployeeForUser, isAdmin, isFinance } = require("../utils/access");

async function getIncrements(req, res, next) {
  try {
    const query = {};
    if (req.query.employee) query.employee = req.query.employee;

    if (!canReadAllEmployees(req.user)) {
      const employee = await findEmployeeForUser(req.user);
      query.employee = employee?._id || null;
    }

    const increments = await SalaryIncrement.find(query)
      .populate("employee", "name role salaryType salaryAmount dueSalary assignedClass subject contactInfo")
      .populate("approvedBy", "name role")
      .sort({ effectiveDate: -1, createdAt: -1 });

    return res.json({ increments });
  } catch (error) {
    return next(error);
  }
}

async function createIncrementRecord(req, res, next) {
  try {
    if (!isFinance(req.user)) {
      return res.status(403).json({ message: "Only admin or accounts users can add salary increments." });
    }

    const increment = await createIncrement(req.body, req.user.id);
    return res.status(201).json({ increment });
  } catch (error) {
    return next(error);
  }
}

async function updateIncrementRecord(req, res, next) {
  try {
    if (!isFinance(req.user)) {
      return res.status(403).json({ message: "Only admin or accounts users can edit salary increments." });
    }

    const increment = await updateIncrement(req.params.id, req.body, req.user.id);
    return res.json({ increment });
  } catch (error) {
    return next(error);
  }
}

async function deleteIncrementRecord(req, res, next) {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: "Only admin can delete salary increments." });
    }

    const increment = await SalaryIncrement.findByIdAndDelete(req.params.id);
    if (!increment) {
      return res.status(404).json({ message: "Salary increment record was not found." });
    }

    return res.json({ message: "Salary increment record deleted.", increment });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createIncrementRecord,
  deleteIncrementRecord,
  getIncrements,
  updateIncrementRecord,
};
