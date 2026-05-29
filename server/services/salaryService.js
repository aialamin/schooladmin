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
        bonusAmount: 0,
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

  const bonusAmount = normalizeMoney(payload.bonusAmount);
  const amount = normalizeMoney(payload.amount || (Number(employee.salaryAmount || 0) + bonusAmount));
  const paidAmount = normalizeMoney(payload.paidAmount);
  const dueAmount = Math.max(amount - paidAmount, 0);
  const salary = await SalaryPayment.findOneAndUpdate(
    {
      employee: employee.id,
      salaryMonth: String(payload.salaryMonth || new Date().toISOString().slice(0, 7)),
    },
    {
      amount,
      bonusAmount,
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

// Clear ALL unpaid salary records for a single employee + optional bonus
async function payEmployeeDue({ employeeId, bonusAmount, note } = {}) {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error("Employee not found.");

  const bonus = normalizeMoney(bonusAmount);
  const unpaid = await SalaryPayment.find({
    employee: employeeId,
    status: { $in: ["unpaid", "partial"] },
  }).sort({ salaryMonth: 1 }); // oldest first

  if (!unpaid.length) return { paid: 0, totalPaid: 0, records: [] };

  const results = [];
  for (let i = 0; i < unpaid.length; i++) {
    const record = unpaid[i];
    const isLast = i === unpaid.length - 1;
    // Bonus applied only to the most recent (last) month
    const bonusForThis = isLast ? bonus : 0;
    const baseAmount   = normalizeMoney(record.amount);
    const totalAmount  = baseAmount + bonusForThis;

    const updated = await SalaryPayment.findByIdAndUpdate(
      record._id,
      {
        amount:      totalAmount,
        bonusAmount: bonusForThis,
        paidAmount:  totalAmount,
        dueAmount:   0,
        status:      "paid",
        paymentDate: new Date(),
        note:        String(note || "Due salary cleared").trim(),
      },
      { new: true },
    ).populate("employee");
    results.push(updated);
  }

  await refreshEmployeeDue(employeeId);
  return {
    paid:      results.length,
    totalPaid: results.reduce((s, r) => s + Number(r.paidAmount || 0), 0),
    records:   results,
  };
}

// Pay all active employees for a given month — creates record if missing
async function payAllSalaries({ month, bonusAmount, note } = {}) {
  const salaryMonth = month || new Date().toISOString().slice(0, 7);
  const bonus       = normalizeMoney(bonusAmount);

  // Find employees who still have unpaid/partial salary for this month
  // (also includes employees who have no record yet for the month)
  const employees = await Employee.find({ status: "active" });
  const results   = [];

  for (const employee of employees) {
    const baseAmount = normalizeMoney(employee.salaryAmount);
    if (baseAmount <= 0) continue;

    // Only process if the record is unpaid/partial (or doesn't exist yet)
    const existing = await SalaryPayment.findOne({ employee: employee._id, salaryMonth });
    if (existing && existing.status === "paid") continue;

    const totalAmount = baseAmount + bonus;
    const payment = await SalaryPayment.findOneAndUpdate(
      { employee: employee._id, salaryMonth },
      {
        amount:      totalAmount,
        bonusAmount: bonus,
        paidAmount:  totalAmount,
        dueAmount:   0,
        status:      "paid",
        paymentDate: new Date(),
        note:        String(note || "Bulk salary payment").trim(),
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).populate("employee");

    results.push(payment);
  }

  await Promise.all(employees.map((e) => refreshEmployeeDue(e._id)));
  return results;
}

module.exports = {
  createEmployee,
  generateMonthlySalaries,
  payAllSalaries,
  payEmployeeDue,
  recordSalaryPayment,
  refreshEmployeeDue,
  updateEmployee,
};
