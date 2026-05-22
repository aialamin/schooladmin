const Employee = require("../models/Employee");
const SalaryPayment = require("../models/SalaryPayment");
const Student = require("../models/Student");
const StudentPayment = require("../models/StudentPayment");
const { getStudentScopeForUser, isFinance } = require("../utils/access");

async function getDashboardSummary(user) {
  const studentScope = await getStudentScopeForUser(user);
  const scopedStudents = await Student.find(studentScope).select("_id");
  const scopedStudentIds = scopedStudents.map((student) => student._id);
  const paymentScope = isFinance(user) ? {} : { student: { $in: scopedStudentIds } };

  const [
    totalStudents,
    totalEmployees,
    incomeAgg,
    feeDueAgg,
    salaryDueAgg,
    recentPayments,
  ] = await Promise.all([
    Student.countDocuments({ ...studentScope, status: "active" }),
    Employee.countDocuments({ status: "active" }),
    StudentPayment.aggregate([{ $match: paymentScope }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]),
    StudentPayment.aggregate([{ $match: paymentScope }, { $group: { _id: null, total: { $sum: "$dueAmount" } } }]),
    SalaryPayment.aggregate([{ $group: { _id: null, total: { $sum: "$dueAmount" } } }]),
    StudentPayment.find(paymentScope)
      .sort({ date: -1, createdAt: -1 })
      .limit(8)
      .populate("student", "name className rollNumber"),
  ]);

  const monthlyCollection = await StudentPayment.aggregate([
    { $match: paymentScope },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
        total: { $sum: "$paidAmount" },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 12 },
  ]);

  const totalIncome = incomeAgg[0]?.total || 0;
  const totalDue = (feeDueAgg[0]?.total || 0) + (salaryDueAgg[0]?.total || 0);

  return {
    totalStudents,
    totalEmployees,
    totalIncome,
    totalDue,
    monthlyCollection: monthlyCollection.map((item) => ({
      month: item._id,
      total: item.total,
    })),
    recentPayments,
  };
}

module.exports = {
  getDashboardSummary,
};
