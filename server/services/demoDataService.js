const ClassFee = require("../models/ClassFee");
const ClassRoutine = require("../models/ClassRoutine");
const Employee = require("../models/Employee");
const EmployeeAttendance = require("../models/EmployeeAttendance");
const ExamMark = require("../models/ExamMark");
const SalaryIncrement = require("../models/SalaryIncrement");
const SalaryPayment = require("../models/SalaryPayment");
const SchoolSetting = require("../models/SchoolSetting");
const Student = require("../models/Student");
const StudentPayment = require("../models/StudentPayment");
const User = require("../models/User");
const { refreshStudentDue } = require("./feeService");
const { refreshEmployeeDue } = require("./salaryService");

const currentYear = new Date().getFullYear();
const currentMonth = new Date().toISOString().slice(0, 7);

const feeRows = [
  { className: "Play", admissionFee: 2500, sessionFee: 1200, monthlyFee: 900, examFee: 300 },
  { className: "Nursery", admissionFee: 2800, sessionFee: 1400, monthlyFee: 1000, examFee: 350 },
  { className: "KG", admissionFee: 3000, sessionFee: 1500, monthlyFee: 1100, examFee: 400 },
  ...Array.from({ length: 8 }, (_, index) => {
    const classNo = index + 1;
    return {
      className: `Class ${classNo}`,
      admissionFee: 3200 + classNo * 350,
      sessionFee: 1600 + classNo * 180,
      monthlyFee: 1100 + classNo * 150,
      examFee: 450 + classNo * 65,
    };
  }),
  ...[9, 10, 11, 12].flatMap((classNo) => [
    { className: `Class ${classNo} Science`, admissionFee: 7000 + classNo * 300, sessionFee: 4200 + classNo * 150, monthlyFee: 2600 + classNo * 120, examFee: 1300 + classNo * 90 },
    { className: `Class ${classNo} Arts`, admissionFee: 6500 + classNo * 280, sessionFee: 3900 + classNo * 140, monthlyFee: 2350 + classNo * 110, examFee: 1150 + classNo * 80 },
    { className: `Class ${classNo} Commerce`, admissionFee: 6700 + classNo * 290, sessionFee: 4000 + classNo * 145, monthlyFee: 2450 + classNo * 115, examFee: 1200 + classNo * 85 },
  ]),
];

const subjectCatalog = {
  Play: ["Bangla Reading", "English Reading", "Numbers", "Drawing", "Rhymes", "General Knowledge"],
  Nursery: ["Bangla Reading", "English Reading", "Numbers", "Drawing", "Rhymes", "General Knowledge"],
  KG: ["Bangla Reading", "English Reading", "Numbers", "Drawing", "Rhymes", "General Knowledge", "Moral Education"],
  primary: ["Bangla", "English", "Mathematics", "General Science", "Bangladesh and Global Studies", "Religious Studies", "ICT", "Physical Education", "Arts and Crafts"],
  junior: ["Bangla", "English", "Mathematics", "Science", "Bangladesh and Global Studies", "Religious Studies", "ICT", "Agriculture Studies", "Physical Education"],
  science: ["Bangla", "English", "Mathematics", "Higher Mathematics", "Physics", "Chemistry", "Biology", "ICT", "Religious Studies", "Bangladesh and Global Studies"],
  arts: ["Bangla", "English", "General Mathematics", "Civics", "History", "Geography", "Economics", "Logic", "ICT", "Religious Studies"],
  commerce: ["Bangla", "English", "General Mathematics", "Accounting", "Business Entrepreneurship", "Finance and Banking", "Economics", "ICT", "Religious Studies"],
};

function subjectsForClassName(className = "") {
  if (subjectCatalog[className]) return subjectCatalog[className];
  const lower = String(className).toLowerCase();
  if (lower.includes("science")) return subjectCatalog.science;
  if (lower.includes("arts")) return subjectCatalog.arts;
  if (lower.includes("commerce")) return subjectCatalog.commerce;
  const number = Number((lower.match(/class\s*(\d+)/) || [])[1] || 0);
  if (number >= 6) return subjectCatalog.junior;
  return subjectCatalog.primary;
}

function money(value) {
  return Math.max(Number(value || 0), 0);
}

function paymentStatus(amount, paidAmount) {
  if (paidAmount <= 0) return "unpaid";
  return paidAmount >= amount ? "paid" : "partial";
}

function markPayload({ student, subject, examType = "semester", examNo = 1, month = "", totalMarks = 100, obtainedMarks, contributionPercent = 0, enteredBy, note = "" }) {
  const total = money(totalMarks) || 100;
  const obtained = Math.min(money(obtainedMarks), total);
  const contribution = Math.min(money(contributionPercent), 100);
  const percentage = Number(((obtained / total) * 100).toFixed(2));

  return {
    student: student.id,
    className: student.className,
    subject,
    academicYear: currentYear,
    examType,
    examNo,
    month: examType === "class_test" ? month || currentMonth : "",
    totalMarks: total,
    obtainedMarks: obtained,
    contributionPercent: contribution,
    percentage,
    weightedScore: Number(((obtained / total) * contribution).toFixed(2)),
    note,
    enteredBy,
  };
}

async function upsertPayment(student, payload) {
  const amount = money(payload.amount);
  const paidAmount = money(payload.paidAmount);
  const dueAmount = Math.max(amount - paidAmount, 0);

  return StudentPayment.findOneAndUpdate(
    {
      student: student.id,
      feeType: payload.feeType,
      billingMonth: payload.billingMonth || "",
      term: payload.term || "",
    },
    {
      student: student.id,
      feeType: payload.feeType,
      billingMonth: payload.billingMonth || "",
      term: payload.term || "",
      amount,
      paidAmount,
      dueAmount,
      status: paymentStatus(amount, paidAmount),
      note: payload.note || "Demo data",
      date: payload.date || new Date(),
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function upsertSalary(employee, payload) {
  const amount = money(payload.amount || employee.salaryAmount);
  const paidAmount = money(payload.paidAmount);
  const dueAmount = Math.max(amount - paidAmount, 0);

  return SalaryPayment.findOneAndUpdate(
    { employee: employee.id, salaryMonth: payload.salaryMonth || currentMonth },
    {
      employee: employee.id,
      salaryMonth: payload.salaryMonth || currentMonth,
      amount,
      paidAmount,
      dueAmount,
      status: paymentStatus(amount, paidAmount),
      paymentDate: payload.paymentDate || new Date(),
      note: payload.note || "Demo salary",
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function upsertMark(payload) {
  return ExamMark.findOneAndUpdate(
    {
      student: payload.student,
      subject: payload.subject,
      academicYear: payload.academicYear,
      examType: payload.examType,
      examNo: payload.examNo,
      month: payload.month || "",
    },
    payload,
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function ensureDemoData() {
  if (String(process.env.ENABLE_DEMO_DATA || "true").toLowerCase() === "false") {
    console.log("Demo ERP data is disabled. Set ENABLE_DEMO_DATA=true to seed sample school records.");
    return;
  }

  const users = await User.find({ email: { $in: ["admin@school.test", "teacher@school.test", "student@school.test", "accountant@school.test", "staff@school.test"] } });
  const userMap = new Map(users.map((user) => [user.email, user]));
  const adminUser = userMap.get("admin@school.test");
  const teacherUser = userMap.get("teacher@school.test") || adminUser;

  await SchoolSetting.findOneAndUpdate(
    {},
    {
      schoolName: "Bright Future School",
      shortName: "BFS",
      subtitle: "Smart School Management Demo",
      address: "House 12, Road 7, Dhaka",
      phone: "+880 1700-000000",
      schoolEmail: "info@brightfuture.school",
      website: "www.brightfuture.school",
      academicYear: String(currentYear),
      academicSession: "January - December",
      defaultExamTitle: "Progress Report",
      defaultPassMark: 33,
      classStartTime: "09:00",
      supportEmail: "support@brightfuture.school",
      admissionNotice: "Next term admission is open. Contact the school office for details.",
      principalName: "Md. Hasan Ali",
      resultRemarksDefault: "The student is progressing well and should continue regular practice.",
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  const classFees = {};
  for (const row of feeRows) {
    classFees[row.className] = await ClassFee.findOneAndUpdate({ className: row.className }, row, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
  }

  const employeeRows = [
    { name: "Demo Admin", role: "admin", salaryType: "monthly", salaryAmount: 65000, assignedClass: "", subject: "Administration", contactInfo: { phone: "01700000001", email: "admin@school.test", address: "Dhaka" } },
    { name: "Demo Teacher", role: "teacher", salaryType: "monthly", salaryAmount: 42000, assignedClass: "Class 6", isClassTeacher: true, subject: "Mathematics", contactInfo: { phone: "01700000002", email: "teacher@school.test", address: "Dhaka" } },
    { name: "Nusrat Jahan", role: "teacher", salaryType: "monthly", salaryAmount: 39000, assignedClass: "Class 7", isClassTeacher: true, subject: "English", contactInfo: { phone: "01700000003", email: "nusrat.teacher@school.test", address: "Dhaka" } },
    { name: "Rahim Uddin", role: "teacher", salaryType: "monthly", salaryAmount: 37000, assignedClass: "", isClassTeacher: false, subject: "ICT", contactInfo: { phone: "01700000006", email: "rahim.subject@school.test", address: "Dhaka" } },
    { name: "Demo Accountant", role: "accountant", salaryType: "monthly", salaryAmount: 36000, assignedClass: "", subject: "Finance", contactInfo: { phone: "01700000004", email: "accountant@school.test", address: "Dhaka" } },
    { name: "Demo Staff", role: "staff", salaryType: "monthly", salaryAmount: 22000, assignedClass: "", subject: "Office Support", contactInfo: { phone: "01700000005", email: "staff@school.test", address: "Dhaka" } },
    { name: "Salma Khatun", role: "librarian", salaryType: "monthly", salaryAmount: 28000, assignedClass: "", subject: "Library", contactInfo: { phone: "01700000007", email: "salma.librarian@school.test", address: "Dhaka" } },
    { name: "Karim Mia", role: "guard", salaryType: "monthly", salaryAmount: 16000, assignedClass: "", subject: "Security", contactInfo: { phone: "01700000008", email: "karim.guard@school.test", address: "Dhaka" } },
    { name: "Jamal Hossain", role: "peon", salaryType: "monthly", salaryAmount: 14000, assignedClass: "", subject: "Office", contactInfo: { phone: "01700000009", email: "jamal.peon@school.test", address: "Dhaka" } },
    { name: "Nasrin Begum", role: "nurse", salaryType: "monthly", salaryAmount: 32000, assignedClass: "", subject: "Health", contactInfo: { phone: "01700000010", email: "nasrin.nurse@school.test", address: "Dhaka" } },
    { name: "Alam Driver", role: "driver", salaryType: "monthly", salaryAmount: 20000, assignedClass: "", subject: "Transport", contactInfo: { phone: "01700000011", email: "alam.driver@school.test", address: "Dhaka" } },
    { name: "Reza Khan", role: "teacher", salaryType: "monthly", salaryAmount: 41000, assignedClass: "Class 9 Science", isClassTeacher: true, subject: "Physics", contactInfo: { phone: "01700000012", email: "reza.teacher@school.test", address: "Dhaka" } },
    { name: "Farzana Akter", role: "teacher", salaryType: "monthly", salaryAmount: 38000, assignedClass: "", isClassTeacher: false, subject: "Chemistry", contactInfo: { phone: "01700000013", email: "farzana.teacher@school.test", address: "Dhaka" } },
    { name: "Imran Hasan", role: "teacher", salaryType: "monthly", salaryAmount: 36000, assignedClass: "", isClassTeacher: false, subject: "Biology", contactInfo: { phone: "01700000014", email: "imran.teacher@school.test", address: "Dhaka" } },
    { name: "Tania Sultana", role: "staff", salaryType: "monthly", salaryAmount: 24000, assignedClass: "", subject: "Admin Support", contactInfo: { phone: "01700000015", email: "tania.staff@school.test", address: "Dhaka" } },
    { name: "Babul Islam", role: "staff", salaryType: "monthly", salaryAmount: 22000, assignedClass: "", subject: "IT Support", contactInfo: { phone: "01700000016", email: "babul.staff@school.test", address: "Dhaka" } },
  ];

  const employees = [];
  for (const row of employeeRows) {
    employees.push(await Employee.findOneAndUpdate(
      { "contactInfo.email": row.contactInfo.email },
      { ...row, joiningDate: new Date(`${currentYear}-01-02`), status: "active", isClassTeacher: Boolean(row.isClassTeacher) },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ));
  }

  const studentRows = [
    { name: "Demo Student", className: "Class 6", rollNumber: "06-001", contactInfo: { guardianName: "Mr. Rahman", phone: "01800000001", email: "student@school.test", address: "Dhanmondi, Dhaka" } },
    { name: "Ayesha Karim", className: "Class 6", rollNumber: "06-002", contactInfo: { guardianName: "Mrs. Karim", phone: "01800000002", email: "ayesha@school.test", address: "Mirpur, Dhaka" } },
    { name: "Rafi Hossain", className: "Class 6", rollNumber: "06-003", contactInfo: { guardianName: "Mr. Hossain", phone: "01800000003", email: "rafi@school.test", address: "Uttara, Dhaka" } },
    { name: "Maliha Noor", className: "Class 6", rollNumber: "06-004", contactInfo: { guardianName: "Mrs. Noor", phone: "01800000004", email: "maliha@school.test", address: "Badda, Dhaka" } },
    { name: "Sami Ahmed", className: "Class 7", rollNumber: "07-001", contactInfo: { guardianName: "Mr. Ahmed", phone: "01800000005", email: "sami@school.test", address: "Mohammadpur, Dhaka" } },
    { name: "Nabila Islam", className: "Class 7", rollNumber: "07-002", contactInfo: { guardianName: "Mrs. Islam", phone: "01800000006", email: "nabila@school.test", address: "Banani, Dhaka" } },
    { name: "Tasin Faruk", className: "Class 9 Science", rollNumber: "09S-001", contactInfo: { guardianName: "Mr. Faruk", phone: "01800000007", email: "tasin.science@school.test", address: "Uttara, Dhaka" } },
    { name: "Raisa Chowdhury", className: "Class 9 Arts", rollNumber: "09A-001", contactInfo: { guardianName: "Mrs. Chowdhury", phone: "01800000008", email: "raisa.arts@school.test", address: "Bashundhara, Dhaka" } },
    { name: "Mahin Hasan", className: "Class 9 Commerce", rollNumber: "09C-001", contactInfo: { guardianName: "Mr. Hasan", phone: "01800000009", email: "mahin.commerce@school.test", address: "Farmgate, Dhaka" } },
    { name: "Anika Rahman", className: "Class 11 Science", rollNumber: "11S-001", contactInfo: { guardianName: "Mr. Rahman", phone: "01800000010", email: "anika.science@school.test", address: "Gulshan, Dhaka" } },
    { name: "Nafisa Akter", className: "Class 11 Arts", rollNumber: "11A-001", contactInfo: { guardianName: "Mrs. Akter", phone: "01800000011", email: "nafisa.arts@school.test", address: "Lalmatia, Dhaka" } },
    { name: "Fahim Islam", className: "Class 11 Commerce", rollNumber: "11C-001", contactInfo: { guardianName: "Mr. Islam", phone: "01800000012", email: "fahim.commerce@school.test", address: "Mirpur DOHS, Dhaka" } },
  ];

  const students = [];
  for (const row of studentRows) {
    const classFee = classFees[row.className];
    const student = await Student.findOneAndUpdate(
      { className: row.className, rollNumber: row.rollNumber },
      {
        name: row.name,
        classFee: classFee.id,
        className: row.className,
        rollNumber: row.rollNumber,
        contactInfo: row.contactInfo,
        dateOfBirth: new Date(`${currentYear - 12}-02-15`),
        admissionDate: new Date(`${currentYear}-01-05`),
        status: "active",
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    students.push(student);
  }

  for (const student of students) {
    const fee = classFees[student.className];
    await upsertPayment(student, { feeType: "admission", amount: fee.admissionFee, paidAmount: fee.admissionFee, note: "Admission fee paid" });
    await upsertPayment(student, { feeType: "session", amount: fee.sessionFee, paidAmount: Math.round(fee.sessionFee * 0.6), note: "Session fee sample" });
    await upsertPayment(student, { feeType: "monthly", billingMonth: currentMonth, amount: fee.monthlyFee, paidAmount: student.rollNumber.endsWith("001") ? fee.monthlyFee : Math.round(fee.monthlyFee * 0.5), note: "Current month fee" });
    await upsertPayment(student, { feeType: "exam", term: "Semester 1", amount: fee.examFee, paidAmount: student.className === "Class 6" ? fee.examFee : 0, note: "Semester 1 exam fee" });
  }

  for (const employee of employees) {
    await upsertSalary(employee, { amount: employee.salaryAmount, paidAmount: employee.role === "staff" ? Math.round(employee.salaryAmount * 0.75) : employee.salaryAmount, note: "Monthly salary demo" });
  }

  const teacherEmployee = employees.find((employee) => employee.contactInfo.email === "teacher@school.test");
  if (teacherEmployee) {
    await SalaryIncrement.findOneAndUpdate(
      { employee: teacherEmployee.id, reason: "Annual performance increment" },
      { employee: teacherEmployee.id, previousSalary: 40000, incrementAmount: 2000, newSalary: 42000, effectiveDate: new Date(`${currentYear}-03-01`), reason: "Annual performance increment", approvedBy: adminUser?.id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  const routineRows = [
    { className: "Class 6", day: "Sunday", startTime: "09:00", endTime: "09:45", subject: "Mathematics", teacherName: "Demo Teacher", room: "201" },
    { className: "Class 6", day: "Sunday", startTime: "09:50", endTime: "10:35", subject: "English", teacherName: "Nusrat Jahan", room: "201" },
    { className: "Class 6", day: "Monday", startTime: "09:00", endTime: "09:45", subject: "Science", teacherName: "Demo Teacher", room: "202" },
    { className: "Class 7", day: "Sunday", startTime: "09:00", endTime: "09:45", subject: "English", teacherName: "Nusrat Jahan", room: "301" },
    { className: "Class 7", day: "Monday", startTime: "10:00", endTime: "10:45", subject: "Mathematics", teacherName: "Demo Teacher", room: "301" },
  ];

  for (const row of routineRows) {
    await ClassRoutine.findOneAndUpdate(
      { className: row.className, day: row.day, startTime: row.startTime, subject: row.subject },
      { ...row, status: "active", note: "Demo routine", createdBy: teacherUser?.id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  const class6Scores = {
    "06-001": { Bangla: 78, English: 84, Mathematics: 92, Science: 88, ICT: 81 },
    "06-002": { Bangla: 86, English: 91, Mathematics: 89, Science: 90, ICT: 87 },
    "06-003": { Bangla: 72, English: 76, Mathematics: 69, Science: 73, ICT: 79 },
    "06-004": { Bangla: 88, English: 82, Mathematics: 95, Science: 91, ICT: 90 },
  };
  const class7Scores = {
    "07-001": { Bangla: 75, English: 80, Mathematics: 78, Science: 82, ICT: 74 },
    "07-002": { Bangla: 90, English: 88, Mathematics: 84, Science: 86, ICT: 91 },
  };

  for (const student of students) {
    let scoreSet = student.className === "Class 6" ? class6Scores[student.rollNumber] : class7Scores[student.rollNumber];
    if (!scoreSet) {
      const subjects = subjectsForClassName(student.className).slice(0, 6);
      scoreSet = Object.fromEntries(subjects.map((subject, index) => [subject, Math.min(95, 72 + ((index * 4 + student.rollNumber.length) % 19))]));
    }

    for (const [subject, score] of Object.entries(scoreSet)) {
      await upsertMark(markPayload({ student, subject, examType: "semester", examNo: 1, totalMarks: 100, obtainedMarks: score, contributionPercent: 100, enteredBy: teacherUser?.id, note: "Semester 1" }));
    }

    for (const [index, subject] of Object.keys(scoreSet).slice(0, 3).entries()) {
      await upsertMark(markPayload({ student, subject, examType: "monthly", examNo: 1, totalMarks: 50, obtainedMarks: Math.max(Math.round(scoreSet[subject] / 2), 18), contributionPercent: 0, enteredBy: teacherUser?.id, note: "Monthly practice" }));
      await upsertMark(markPayload({ student, subject, examType: "class_test", examNo: 1, month: currentMonth, totalMarks: 20, obtainedMarks: Math.max(Math.round(scoreSet[subject] / 5) + index, 8), contributionPercent: 0, enteredBy: teacherUser?.id, note: "Class test" }));
    }
  }


  await Promise.all([
    ...students.map((student) => refreshStudentDue(student.id)),
    ...employees.map((employee) => refreshEmployeeDue(employee.id)),
  ]);

  // Seed attendance for last 7 days
  const days = 7;
  for (let d = 0; d < days; d++) {
    const attendDate = new Date();
    attendDate.setDate(attendDate.getDate() - d);
    const dateUTC = new Date(Date.UTC(attendDate.getFullYear(), attendDate.getMonth(), attendDate.getDate()));
    const isWeekend = dateUTC.getUTCDay() === 0 || dateUTC.getUTCDay() === 6;
    if (isWeekend) continue;
    for (const employee of employees) {
      const rand = Math.random();
      const status = rand < 0.8 ? "present" : rand < 0.88 ? "late" : rand < 0.93 ? "leave" : "absent";
      const checkIn = status === "absent" ? "" : status === "late" ? "09:35" : "09:02";
      const checkOut = status === "absent" || status === "leave" ? "" : "16:30";
      await EmployeeAttendance.findOneAndUpdate(
        { employee: employee.id, date: dateUTC },
        { employee: employee.id, date: dateUTC, checkIn, checkOut, status, method: d === 0 ? "biometric" : "manual", deviceId: d === 0 ? "TERMINAL-01" : "", note: "Demo", markedBy: adminUser?.id },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
    }
  }

  console.log(`Demo ERP data ready: ${students.length} students, ${employees.length} employees, subject-wise marks and class positions.`);
}

module.exports = {
  ensureDemoData,
};
