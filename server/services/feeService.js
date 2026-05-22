const ClassFee = require("../models/ClassFee");
const Student = require("../models/Student");
const StudentPayment = require("../models/StudentPayment");

function paymentStatus(amount, paidAmount) {
  if (paidAmount <= 0) {
    return "unpaid";
  }

  return paidAmount >= amount ? "paid" : "partial";
}

function normalizeMoney(value) {
  return Math.max(Number(value || 0), 0);
}

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeContactInfo(value = {}) {
  return {
    guardianName: cleanString(value.guardianName),
    phone: cleanString(value.phone),
    email: cleanString(value.email).toLowerCase(),
    address: cleanString(value.address),
  };
}

function normalizeDate(value, fallback = undefined) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

async function refreshStudentDue(studentId) {
  const payments = await StudentPayment.find({ student: studentId });
  const dueAmount = payments.reduce((total, payment) => total + Number(payment.dueAmount || 0), 0);
  await Student.findByIdAndUpdate(studentId, { dueAmount });
  return dueAmount;
}

async function createClassFee(payload) {
  const className = String(payload.className || "").trim();

  if (!className) {
    throw new Error("Class name is required.");
  }

  return ClassFee.create({
    className,
    admissionFee: normalizeMoney(payload.admissionFee),
    sessionFee: normalizeMoney(payload.sessionFee),
    monthlyFee: normalizeMoney(payload.monthlyFee),
    examFee: normalizeMoney(payload.examFee),
  });
}

async function updateClassFee(id, payload) {
  const className = String(payload.className || "").trim();

  if (!className) {
    throw new Error("Class name is required.");
  }

  const classFee = await ClassFee.findByIdAndUpdate(
    id,
    {
      className,
      admissionFee: normalizeMoney(payload.admissionFee),
      sessionFee: normalizeMoney(payload.sessionFee),
      monthlyFee: normalizeMoney(payload.monthlyFee),
      examFee: normalizeMoney(payload.examFee),
    },
    { new: true, runValidators: true },
  );

  if (!classFee) {
    throw new Error("Class fee rule was not found.");
  }

  await Student.updateMany({ classFee: classFee.id }, { className: classFee.className });
  return classFee;
}

async function createStudent(payload) {
  const classFee = await ClassFee.findById(payload.classFee);

  if (!classFee) {
    throw new Error("Please select a valid class fee rule.");
  }

  const name = cleanString(payload.name);
  const rollNumber = cleanString(payload.rollNumber);
  if (!name || !rollNumber) {
    throw new Error("Student name and roll / ID are required.");
  }

  const student = await Student.create({
    name,
    classFee: classFee.id,
    className: classFee.className,
    rollNumber,
    contactInfo: normalizeContactInfo(payload.contactInfo),
    dateOfBirth: normalizeDate(payload.dateOfBirth),
    admissionDate: normalizeDate(payload.admissionDate, new Date()),
    status: payload.status || "active",
  });

  await generateAdmissionFees(student.id);
  return Student.findById(student.id).populate("classFee");
}

async function updateStudent(id, payload) {
  const classFee = await ClassFee.findById(payload.classFee);

  if (!classFee) {
    throw new Error("Please select a valid class fee rule.");
  }

  const name = cleanString(payload.name);
  const rollNumber = cleanString(payload.rollNumber);
  if (!name || !rollNumber) {
    throw new Error("Student name and roll / ID are required.");
  }

  const student = await Student.findByIdAndUpdate(
    id,
    {
      name,
      classFee: classFee.id,
      className: classFee.className,
      rollNumber,
      contactInfo: normalizeContactInfo(payload.contactInfo),
      dateOfBirth: normalizeDate(payload.dateOfBirth),
      admissionDate: normalizeDate(payload.admissionDate, new Date()),
      status: payload.status || "active",
    },
    { new: true, runValidators: true },
  ).populate("classFee");

  if (!student) {
    throw new Error("Student was not found.");
  }

  return student;
}

async function generateAdmissionFees(studentId) {
  const student = await Student.findById(studentId).populate("classFee");

  if (!student) {
    throw new Error("Student was not found.");
  }

  const fees = [
    { feeType: "admission", amount: student.classFee.admissionFee },
    { feeType: "session", amount: student.classFee.sessionFee },
  ];

  for (const fee of fees) {
    const exists = await StudentPayment.findOne({ student: student.id, feeType: fee.feeType });
    if (!exists && fee.amount > 0) {
      await StudentPayment.create({
        student: student.id,
        feeType: fee.feeType,
        amount: fee.amount,
        paidAmount: 0,
        dueAmount: fee.amount,
        status: "unpaid",
      });
    }
  }

  await refreshStudentDue(student.id);
}

async function generateMonthlyFees({ month } = {}) {
  const billingMonth = month || new Date().toISOString().slice(0, 7);
  const students = await Student.find({ status: "active" }).populate("classFee");
  const created = [];

  for (const student of students) {
    const amount = normalizeMoney(student.classFee?.monthlyFee);
    const exists = await StudentPayment.findOne({
      student: student.id,
      feeType: "monthly",
      billingMonth,
    });

    if (!exists && amount > 0) {
      created.push(await StudentPayment.create({
        student: student.id,
        feeType: "monthly",
        billingMonth,
        amount,
        paidAmount: 0,
        dueAmount: amount,
        status: "unpaid",
      }));
    }
  }

  await Promise.all(students.map((student) => refreshStudentDue(student.id)));
  return created;
}

async function generateExamFees({ term } = {}) {
  const cleanTerm = String(term || "").trim();

  if (!cleanTerm) {
    throw new Error("Exam term is required.");
  }

  const students = await Student.find({ status: "active" }).populate("classFee");
  const created = [];

  for (const student of students) {
    const amount = normalizeMoney(student.classFee?.examFee);
    const exists = await StudentPayment.findOne({
      student: student.id,
      feeType: "exam",
      term: cleanTerm,
    });

    if (!exists && amount > 0) {
      created.push(await StudentPayment.create({
        student: student.id,
        feeType: "exam",
        term: cleanTerm,
        amount,
        paidAmount: 0,
        dueAmount: amount,
        status: "unpaid",
      }));
    }
  }

  await Promise.all(students.map((student) => refreshStudentDue(student.id)));
  return created;
}

async function recordStudentPayment(payload) {
  const amount = normalizeMoney(payload.amount);
  const paidAmount = normalizeMoney(payload.paidAmount);
  const dueAmount = Math.max(amount - paidAmount, 0);
  const billingMonth = String(payload.billingMonth || "").trim();
  const term = String(payload.term || "").trim();
  const query = {
    student: payload.student,
    feeType: payload.feeType,
    billingMonth,
    term,
  };

  const payment = await StudentPayment.findOneAndUpdate(
    query,
    {
      ...query,
      amount,
      paidAmount,
      dueAmount,
      status: paymentStatus(amount, paidAmount),
      note: String(payload.note || "").trim(),
      date: payload.date || new Date(),
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).populate("student");

  await refreshStudentDue(payload.student);
  return payment;
}

async function updateStudentPayment(id, payload) {
  const amount = normalizeMoney(payload.amount);
  const paidAmount = normalizeMoney(payload.paidAmount);
  const dueAmount = Math.max(amount - paidAmount, 0);
  const payment = await StudentPayment.findByIdAndUpdate(
    id,
    {
      feeType: payload.feeType,
      billingMonth: String(payload.billingMonth || "").trim(),
      term: String(payload.term || "").trim(),
      amount,
      paidAmount,
      dueAmount,
      status: paymentStatus(amount, paidAmount),
      note: String(payload.note || "").trim(),
      date: payload.date || new Date(),
    },
    { new: true, runValidators: true },
  ).populate("student");

  if (!payment) {
    throw new Error("Payment was not found.");
  }

  await refreshStudentDue(payment.student.id);
  return payment;
}

module.exports = {
  createClassFee,
  createStudent,
  generateExamFees,
  generateMonthlyFees,
  recordStudentPayment,
  refreshStudentDue,
  updateClassFee,
  updateStudent,
  updateStudentPayment,
};
