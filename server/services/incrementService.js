const Employee = require("../models/Employee");
const SalaryIncrement = require("../models/SalaryIncrement");

function money(value) {
  return Math.max(Number(value || 0), 0);
}

async function createIncrement(payload, userId) {
  const employee = await Employee.findById(payload.employee);
  if (!employee) {
    throw new Error("Employee was not found.");
  }

  const previousSalary = money(payload.previousSalary || employee.salaryAmount);
  const incrementAmount = money(payload.incrementAmount);
  const newSalary = money(payload.newSalary || previousSalary + incrementAmount);

  if (newSalary < previousSalary) {
    throw new Error("New salary cannot be lower than previous salary for an increment.");
  }

  const increment = await SalaryIncrement.create({
    employee: employee.id,
    previousSalary,
    incrementAmount: newSalary - previousSalary || incrementAmount,
    newSalary,
    effectiveDate: payload.effectiveDate || new Date(),
    reason: String(payload.reason || "").trim(),
    approvedBy: userId,
  });

  employee.salaryAmount = newSalary;
  await employee.save();

  return increment.populate("employee", "name role salaryType salaryAmount dueSalary contactInfo");
}

async function updateIncrement(id, payload, userId) {
  const employee = await Employee.findById(payload.employee);
  if (!employee) {
    throw new Error("Employee was not found.");
  }

  const previousSalary = money(payload.previousSalary);
  const incrementAmount = money(payload.incrementAmount);
  const newSalary = money(payload.newSalary || previousSalary + incrementAmount);

  const increment = await SalaryIncrement.findByIdAndUpdate(
    id,
    {
      employee: employee.id,
      previousSalary,
      incrementAmount: newSalary - previousSalary || incrementAmount,
      newSalary,
      effectiveDate: payload.effectiveDate || new Date(),
      reason: String(payload.reason || "").trim(),
      approvedBy: userId,
    },
    { new: true, runValidators: true },
  ).populate("employee", "name role salaryType salaryAmount dueSalary contactInfo");

  if (!increment) {
    throw new Error("Salary increment record was not found.");
  }

  employee.salaryAmount = newSalary;
  await employee.save();

  return increment;
}

module.exports = {
  createIncrement,
  updateIncrement,
};
