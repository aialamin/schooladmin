const Employee = require("../models/Employee");
const SalaryPayment = require("../models/SalaryPayment");

function normalizeMoney(value) {
  return Math.max(Number(value || 0), 0);
}

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeContactInfo(value = {}) {
  return {
    phone: cleanString(value.phone),
    email: cleanString(value.email).toLowerCase(),
    address: cleanString(value.address),
  };
}

function paymentStatus(amount, paidAmount) {
  if (paidAmount <= 0) {
    return "unpaid";
  }

  return paidAmount >= amount ? "paid" : "partial";
}

async function refreshEmployeeDue(employeeId) {
  const payments = await SalaryPayment.find({ employee: employeeId });
  const dueSalary = payments.reduce((total, payment) => total + Number(payment.dueAmount || 0), 0);
  await Employee.findByIdAndUpdate(employeeId, { dueSalary });
  return dueSalary;
}

async function createEmployee(payload) {
  const name = cleanString(payload.name);
  if (!name) {
    throw new Error("Employee name is required.");
  }

  return Employee.create({
    name,
    role: payload.role || "teacher",
    salaryType: payload.salaryType || "monthly",
    salaryAmount: normalizeMoney(payload.salaryAmount),
    assignedClass: cleanString(payload.assignedClass),
    isClassTeacher: Boolean(payload.isClassTeacher) && payload.role === "teacher",
    subject: cleanString(payload.subject),
    joiningDate: payload.joiningDate || new Date(),
    status: payload.status || "active",
    contactInfo: normalizeContactInfo(payload.contactInfo),
  });
}

async function updateEmployee(id, payload) {
  const name = cleanString(payload.name);
  if (!name) {
    throw new Error("Employee name is required.");
  }

  const employee = await Employee.findByIdAndUpdate(
    id,
    {
      name,
      role: payload.role || "teacher",
      salaryType: payload.salaryType || "monthly",
      salaryAmount: normalizeMoney(payload.salaryAmount),
      assignedClass: cleanString(payload.assignedClass),
      isClassTeacher: Boolean(payload.isClassTeacher) && payload.role === "teacher",
      subject: cleanString(payload.subject),
      joiningDate: payload.joiningDate || new Date(),
      status: payload.status || "active",
      contactInfo: normalizeContactInfo(payload.contactInfo),
    },
    { new: true, runValidators: true },
  );

  if (!employee) {
    throw new Error("Employee was not found.");
  }

  return employee;
}

async function generateMonthlySalaries({ month } = {}) {
  const salaryMonth = month || new Date().toISOString().slice(0, 7);
  const employees = await Employee.find({ status: "active" });
  const created = [];

  for (const employee of employees) {
    const exists = await SalaryPayment.findOne({ employee: employee.id, salaryMonth });
    const amount = normalizeMoney(employee.salaryAmount);

    if (!exists && amount > 0) {
      created.push(await SalaryPayment.create({
        employee: employee.id,
        salaryMonth,
        amount,
        paidAmount: 0,
        dueAmount: amount,
        status: "unpaid",
      }));
    }
  }

  await Promise.all(employees.map((employee) => refreshEmployeeDue(employee.id)));
  return created;
}

async function recordSalaryPayment(payload) {
  const employee = await Employee.findById(payload.employee);

  if (!employee) {
    throw new Error("Employee was not found.");
  }

  const amount = normalizeMoney(payload.amount || employee.salaryAmount);
  const paidAmount = normalizeMoney(payload.paidAmount);
  const dueAmount = Math.max(amount - paidAmount, 0);
  const salary = await SalaryPayment.findOneAndUpdate(
    {
      employee: employee.id,
      salaryMonth: String(payload.salaryMonth || new Date().toISOString().slice(0, 7)),
    },
    {
      amount,
      paidAmount,
      dueAmount,
      status: paymentStatus(amount, paidAmount),
      paymentDate: payload.paymentDate || new Date(),
      note: String(payload.note || "").trim(),
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).populate("employee");

  await refreshEmployeeDue(employee.id);
  return salary;
}

module.exports = {
  createEmployee,
  generateMonthlySalaries,
  recordSalaryPayment,
  refreshEmployeeDue,
  updateEmployee,
};
