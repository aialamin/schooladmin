const ClassFee        = require("../models/ClassFee");
const ClassRoutine    = require("../models/ClassRoutine");
const ClassSection    = require("../models/ClassSection");
const Classroom       = require("../models/Classroom");
const Employee        = require("../models/Employee");
const EmployeeAttendance = require("../models/EmployeeAttendance");
const ExamMark        = require("../models/ExamMark");
const SalaryIncrement = require("../models/SalaryIncrement");
const SalaryPayment   = require("../models/SalaryPayment");
const SchoolSetting   = require("../models/SchoolSetting");
const Student         = require("../models/Student");
const StudentPayment  = require("../models/StudentPayment");
const User            = require("../models/User");
const { hashPassword }       = require("../utils/password");
const { refreshStudentDue }  = require("./feeService");
const { refreshEmployeeDue } = require("./salaryService");

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().toISOString().slice(0, 7);
const YEAR_STR     = String(currentYear);

// ── Helpers ───────────────────────────────────────────────────────────────────
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function money(v) { return Math.max(Number(v || 0), 0); }
function paymentStatus(amount, paid) { return paid <= 0 ? "unpaid" : paid >= amount ? "paid" : "partial"; }

const MALE_FIRST   = ["Arif","Rakib","Sakib","Farhan","Imran","Tawhid","Nayeem","Raihan","Sujon","Mehedi","Riyad","Tanvir","Mahfuz","Sabbir","Asif","Jubayer","Rifat","Siam","Jashim","Nazim"];
const FEMALE_FIRST = ["Nusrat","Tania","Mim","Sadia","Runa","Jannati","Anika","Bristy","Tasmia","Puja","Irin","Munni","Sumi","Rupa","Lima","Keya","Laboni","Mitu","Shanta","Riya"];
const LAST_NAMES   = ["Islam","Hossain","Rahman","Akter","Begum","Khatun","Ahmed","Ali","Khan","Mia","Sarker","Das","Roy","Biswas","Mondal","Sheikh"];
const GUARDIAN_NAMES = ["Md. Karim","Md. Rahim","Md. Hasan","Md. Jalal","Md. Faruk","Md. Barek","Md. Salam","Md. Anwar","Md. Jabbar","Md. Alim"];
const AREAS        = ["Mirpur","Mohammadpur","Dhanmondi","Uttara","Gulshan","Banani","Shyamoli","Adabor","Kalabagan","Badda"];

function makeName(gender) {
  return gender === "male"
    ? `${rnd(MALE_FIRST)} ${rnd(LAST_NAMES)}`
    : `${rnd(FEMALE_FIRST)} ${rnd(LAST_NAMES)}`;
}

// ── Class fee structure ───────────────────────────────────────────────────────
const feeRows = [
  { className: "Play",     admissionFee: 2500, sessionFee: 1200, monthlyFee: 900,  examFee: 300 },
  { className: "Nursery",  admissionFee: 2800, sessionFee: 1400, monthlyFee: 1000, examFee: 350 },
  { className: "KG",       admissionFee: 3000, sessionFee: 1500, monthlyFee: 1100, examFee: 400 },
  ...Array.from({ length: 8 }, (_, i) => ({
    className:    `Class ${i + 1}`,
    admissionFee: 3200 + (i + 1) * 350,
    sessionFee:   1600 + (i + 1) * 180,
    monthlyFee:   1100 + (i + 1) * 150,
    examFee:      450  + (i + 1) * 65,
  })),
  ...[9, 10, 11, 12].flatMap((n) => [
    { className: `Class ${n} Science`,  admissionFee: 7000 + n * 300, sessionFee: 4200 + n * 150, monthlyFee: 2600 + n * 120, examFee: 1300 + n * 90 },
    { className: `Class ${n} Arts`,     admissionFee: 6500 + n * 280, sessionFee: 3900 + n * 140, monthlyFee: 2350 + n * 110, examFee: 1150 + n * 80 },
    { className: `Class ${n} Commerce`, admissionFee: 6700 + n * 290, sessionFee: 4000 + n * 145, monthlyFee: 2450 + n * 115, examFee: 1200 + n * 85 },
  ]),
];

// ── Classes that get Boys/Girls sections ──────────────────────────────────────
const SECTION_CLASSES = [
  "Play", "Nursery", "KG",
  "Class 1","Class 2","Class 3","Class 4","Class 5",
  "Class 6","Class 7","Class 8",
  "Class 9 Science","Class 10 Science",
];

// ── Section teachers (2 per class = 26 total) ─────────────────────────────────
const SECTION_TEACHERS = [
  { name: "Md. Ariful Islam",   email: "ariful.islam@school.edu",   subject: "General",           cls: "Play",            sec: "Boys" },
  { name: "Farzana Akter",      email: "farzana.akter@school.edu",  subject: "General",           cls: "Play",            sec: "Girls" },
  { name: "Md. Nazmul Hasan",   email: "nazmul.hasan@school.edu",   subject: "General",           cls: "Nursery",         sec: "Boys" },
  { name: "Shirin Sultana",     email: "shirin.sultana@school.edu", subject: "General",           cls: "Nursery",         sec: "Girls" },
  { name: "Md. Jahirul Islam",  email: "jahirul.islam@school.edu",  subject: "General",           cls: "KG",              sec: "Boys" },
  { name: "Nasrin Jahan",       email: "nasrin.jahan@school.edu",   subject: "General",           cls: "KG",              sec: "Girls" },
  { name: "Md. Rafiqul Islam",  email: "rafiqul.islam@school.edu",  subject: "Bangla",            cls: "Class 1",         sec: "Boys" },
  { name: "Fatema Begum",       email: "fatema.begum@school.edu",   subject: "English",           cls: "Class 1",         sec: "Girls" },
  { name: "Md. Shahidul Alam",  email: "shahidul.alam@school.edu",  subject: "Mathematics",      cls: "Class 2",         sec: "Boys" },
  { name: "Roksana Parvin",     email: "roksana.parvin@school.edu", subject: "General Science",  cls: "Class 2",         sec: "Girls" },
  { name: "Md. Mizanur Rahman", email: "mizanur.rahman@school.edu", subject: "Bangla",            cls: "Class 3",         sec: "Boys" },
  { name: "Halima Khatun",      email: "halima.khatun@school.edu",  subject: "English",           cls: "Class 3",         sec: "Girls" },
  { name: "Md. Belal Hossain",  email: "belal.hossain@school.edu",  subject: "Mathematics",      cls: "Class 4",         sec: "Boys" },
  { name: "Sumaiya Akter",      email: "sumaiya.akter@school.edu",  subject: "General Science",  cls: "Class 4",         sec: "Girls" },
  { name: "Md. Monir Hossain",  email: "monir.hossain@school.edu",  subject: "Bangladesh Studies",cls: "Class 5",         sec: "Boys" },
  { name: "Kamrun Nahar",       email: "kamrun.nahar@school.edu",   subject: "Bangla",            cls: "Class 5",         sec: "Girls" },
  { name: "Md. Kamal Uddin",    email: "kamal.uddin@school.edu",    subject: "Mathematics",      cls: "Class 6",         sec: "Boys" },
  { name: "Nasima Begum",       email: "nasima.begum@school.edu",   subject: "English",           cls: "Class 6",         sec: "Girls" },
  { name: "Md. Shahabuddin",    email: "shahabuddin@school.edu",    subject: "Science",           cls: "Class 7",         sec: "Boys" },
  { name: "Rina Akter",         email: "rina.akter@school.edu",     subject: "Bangla",            cls: "Class 7",         sec: "Girls" },
  { name: "Md. Faruk Hossain",  email: "faruk.hossain@school.edu",  subject: "Mathematics",      cls: "Class 8",         sec: "Boys" },
  { name: "Laily Begum",        email: "laily.begum@school.edu",    subject: "English",           cls: "Class 8",         sec: "Girls" },
  { name: "Md. Aminul Islam",   email: "aminul.islam@school.edu",   subject: "Physics",           cls: "Class 9 Science", sec: "Boys" },
  { name: "Shiuly Akter",       email: "shiuly.akter@school.edu",   subject: "Chemistry",         cls: "Class 9 Science", sec: "Girls" },
  { name: "Md. Rezaul Karim",   email: "rezaul.karim@school.edu",   subject: "Mathematics",      cls: "Class 10 Science",sec: "Boys" },
  { name: "Mahbuba Khatun",     email: "mahbuba.khatun@school.edu", subject: "Biology",           cls: "Class 10 Science",sec: "Girls" },
];

// ── Other staff employees (non-teacher) ──────────────────────────────────────
const OTHER_EMPLOYEES = [
  { name: "Demo Admin",     role: "admin",      salaryAmount: 65000, subject: "Administration", email: "admin@school.test",       phone: "01700000001" },
  { name: "Demo Teacher",   role: "teacher",    salaryAmount: 42000, subject: "Mathematics",    email: "teacher@school.test",     phone: "01700000002", assignedClass: "Class 6", isClassTeacher: true },
  { name: "Nusrat Jahan",   role: "teacher",    salaryAmount: 39000, subject: "English",        email: "nusrat.teacher@school.test", phone: "01700000003", assignedClass: "Class 7", isClassTeacher: true },
  { name: "Reza Khan",      role: "teacher",    salaryAmount: 41000, subject: "Physics",        email: "reza.teacher@school.test",   phone: "01700000012", assignedClass: "Class 9 Science", isClassTeacher: true },
  { name: "Demo Accountant",role: "accountant", salaryAmount: 36000, subject: "Finance",        email: "accountant@school.test",  phone: "01700000004" },
  { name: "Demo Staff",     role: "staff",      salaryAmount: 22000, subject: "Office Support", email: "staff@school.test",       phone: "01700000005" },
  { name: "Salma Khatun",   role: "librarian",  salaryAmount: 28000, subject: "Library",        email: "salma.librarian@school.test", phone: "01700000007" },
  { name: "Karim Mia",      role: "guard",      salaryAmount: 16000, subject: "Security",       email: "karim.guard@school.test", phone: "01700000008" },
  { name: "Nasrin Begum",   role: "nurse",      salaryAmount: 32000, subject: "Health",         email: "nasrin.nurse@school.test",phone: "01700000010" },
];

// ── Subject catalog ───────────────────────────────────────────────────────────
const subjectCatalog = {
  Play:    ["Bangla Reading","English Reading","Numbers","Drawing","Rhymes","General Knowledge"],
  Nursery: ["Bangla Reading","English Reading","Numbers","Drawing","Rhymes","General Knowledge"],
  KG:      ["Bangla Reading","English Reading","Numbers","Drawing","Rhymes","General Knowledge","Moral Education"],
  primary: ["Bangla","English","Mathematics","General Science","Bangladesh and Global Studies","Religious Studies","ICT","Physical Education","Arts and Crafts"],
  junior:  ["Bangla","English","Mathematics","Science","Bangladesh and Global Studies","Religious Studies","ICT","Agriculture Studies","Physical Education"],
  science: ["Bangla","English","Mathematics","Higher Mathematics","Physics","Chemistry","Biology","ICT","Religious Studies"],
  arts:    ["Bangla","English","General Mathematics","Civics","History","Geography","Economics","Logic","ICT"],
  commerce:["Bangla","English","General Mathematics","Accounting","Business Entrepreneurship","Finance and Banking","Economics","ICT"],
};

function subjectsForClass(cls) {
  if (subjectCatalog[cls]) return subjectCatalog[cls];
  const lower = String(cls).toLowerCase();
  if (lower.includes("science"))  return subjectCatalog.science;
  if (lower.includes("arts"))     return subjectCatalog.arts;
  if (lower.includes("commerce")) return subjectCatalog.commerce;
  const num = Number((lower.match(/class\s*(\d+)/) || [])[1] || 0);
  return num >= 6 ? subjectCatalog.junior : subjectCatalog.primary;
}

function markPayload({ student, subject, examType = "semester", examNo = 1, month = "", totalMarks = 100, obtainedMarks, contributionPercent = 0, enteredBy }) {
  const total    = money(totalMarks) || 100;
  const obtained = Math.min(money(obtainedMarks), total);
  const pct      = Number(((obtained / total) * 100).toFixed(2));
  return {
    student: student._id, className: student.className, subject,
    academicYear: currentYear, examType, examNo,
    month: examType === "class_test" ? month || currentMonth : "",
    totalMarks: total, obtainedMarks: obtained,
    contributionPercent: Math.min(money(contributionPercent), 100),
    percentage: pct,
    weightedScore: Number(((obtained / total) * Math.min(money(contributionPercent), 100)).toFixed(2)),
    note: "Demo data", enteredBy,
  };
}

async function upsertPayment(student, payload) {
  const amount = money(payload.amount), paid = money(payload.paidAmount);
  return StudentPayment.findOneAndUpdate(
    { student: student._id, feeType: payload.feeType, billingMonth: payload.billingMonth || "", term: payload.term || "" },
    { student: student._id, feeType: payload.feeType, billingMonth: payload.billingMonth || "", term: payload.term || "", amount, paidAmount: paid, dueAmount: Math.max(amount - paid, 0), status: paymentStatus(amount, paid), note: payload.note || "Demo", date: payload.date || new Date() },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function upsertSalary(employee, payload) {
  const amount = money(payload.amount || employee.salaryAmount), paid = money(payload.paidAmount);
  return SalaryPayment.findOneAndUpdate(
    { employee: employee._id, salaryMonth: payload.salaryMonth || currentMonth },
    { employee: employee._id, salaryMonth: payload.salaryMonth || currentMonth, amount, paidAmount: paid, dueAmount: Math.max(amount - paid, 0), status: paymentStatus(amount, paid), paymentDate: new Date(), note: "Demo salary" },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function upsertMark(payload) {
  return ExamMark.findOneAndUpdate(
    { student: payload.student, subject: payload.subject, academicYear: payload.academicYear, examType: payload.examType, examNo: payload.examNo, month: payload.month || "" },
    payload,
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
async function ensureDemoData() {
  if (String(process.env.ENABLE_DEMO_DATA || "true").toLowerCase() === "false") {
    console.log("Demo ERP data is disabled.");
    return;
  }

  // ── School settings ───────────────────────────────────────────────────────
  await SchoolSetting.findOneAndUpdate({},
    { schoolName: "Bright Future School", shortName: "BFS", subtitle: "Smart School Management Demo", address: "House 12, Road 7, Dhaka", phone: "+880 1700-000000", schoolEmail: "info@brightfuture.school", website: "www.brightfuture.school", academicYear: YEAR_STR, academicSession: "January - December", defaultExamTitle: "Progress Report", defaultPassMark: 33, classStartTime: "09:00", supportEmail: "support@brightfuture.school", admissionNotice: "Next term admission is open. Contact the school office for details.", principalName: "Md. Hasan Ali", resultRemarksDefault: "The student is progressing well and should continue regular practice." },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  // ── Class fees ────────────────────────────────────────────────────────────
  const classFees = {};
  for (const row of feeRows) {
    classFees[row.className] = await ClassFee.findOneAndUpdate(
      { className: row.className }, row,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  // ── Section teacher users + employee records ──────────────────────────────
  const teacherUserMap = {};   // email → User doc
  const teacherEmpMap  = {};   // email → Employee doc
  const pass = hashPassword("teacher123");

  for (const t of SECTION_TEACHERS) {
    const user = await User.findOneAndUpdate(
      { email: t.email },
      { $setOnInsert: { name: t.name, email: t.email, role: "teacher", salt: pass.salt, passwordHash: pass.hash } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    teacherUserMap[t.email] = user;

    const emp = await Employee.findOneAndUpdate(
      { "contactInfo.email": t.email },
      { name: t.name, role: "teacher", salaryType: "monthly", salaryAmount: 18000, assignedClass: t.cls, isClassTeacher: true, subject: t.subject, joiningDate: new Date(`${currentYear}-01-10`), status: "active", contactInfo: { email: t.email, phone: `017${String(Date.now()).slice(-8)}`, address: `${rnd(AREAS)}, Dhaka` } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    teacherEmpMap[t.email] = emp;
  }

  // ── Other staff employees ─────────────────────────────────────────────────
  const otherEmployees = [];
  for (const row of OTHER_EMPLOYEES) {
    const emp = await Employee.findOneAndUpdate(
      { "contactInfo.email": row.email },
      { name: row.name, role: row.role, salaryType: "monthly", salaryAmount: row.salaryAmount, assignedClass: row.assignedClass || "", isClassTeacher: Boolean(row.isClassTeacher), subject: row.subject, joiningDate: new Date(`${currentYear}-01-02`), status: "active", contactInfo: { phone: row.phone, email: row.email, address: "Dhaka" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    otherEmployees.push(emp);
  }

  const allEmployees = [...Object.values(teacherEmpMap), ...otherEmployees];

  // ── Class sections (Boys + Girls for each class) ──────────────────────────
  const sectionMap = {};   // `${cls}|${sec}` → ClassSection doc
  for (const t of SECTION_TEACHERS) {
    const user = teacherUserMap[t.email];
    const key  = `${t.cls}|${t.sec}`;
    const sec  = await ClassSection.findOneAndUpdate(
      { className: t.cls, sectionName: t.sec, academicYear: YEAR_STR },
      { className: t.cls, sectionName: t.sec, classTeacher: user._id, academicYear: YEAR_STR },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    sectionMap[key] = sec;
  }

  // ── Students — 5 boys (Boys section) + 5 girls (Girls section) per class ──
  const allStudents = [];
  const rollCounters = {};

  for (const cls of SECTION_CLASSES) {
    const cf = classFees[cls];
    if (!cf) continue;

    const boysSection  = sectionMap[`${cls}|Boys`];
    const girlsSection = sectionMap[`${cls}|Girls`];
    if (!rollCounters[cls]) rollCounters[cls] = 0;

    const slots = [
      ...Array.from({ length: 5 }, () => ({ gender: "male",   section: boysSection  })),
      ...Array.from({ length: 5 }, () => ({ gender: "female", section: girlsSection })),
    ];

    for (const slot of slots) {
      rollCounters[cls]++;
      const roll = `${YEAR_STR.slice(2)}${String(rollCounters[cls]).padStart(3, "0")}`;
      const name = makeName(slot.gender);

      const student = await Student.findOneAndUpdate(
        { className: cls, rollNumber: roll },
        {
          name, classFee: cf._id, className: cls, rollNumber: roll,
          section: slot.section?._id || null,
          gender: slot.gender,
          status: "active",
          admissionDate: new Date(`${currentYear}-01-15`),
          contactInfo: { guardianName: rnd(GUARDIAN_NAMES), phone: `018${String(Date.now() + rollCounters[cls]).slice(-8)}`, address: `${rnd(AREAS)}, Dhaka` },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );
      allStudents.push(student);
    }
  }

  // ── Student payments ──────────────────────────────────────────────────────
  for (const student of allStudents) {
    const fee = classFees[student.className];
    if (!fee) continue;
    await upsertPayment(student, { feeType: "admission", amount: fee.admissionFee, paidAmount: fee.admissionFee });
    await upsertPayment(student, { feeType: "session",   amount: fee.sessionFee,   paidAmount: Math.round(fee.sessionFee * 0.6) });
    await upsertPayment(student, { feeType: "monthly",   billingMonth: currentMonth, amount: fee.monthlyFee, paidAmount: Math.round(fee.monthlyFee * 0.7) });
    await upsertPayment(student, { feeType: "exam",      term: "Semester 1", amount: fee.examFee, paidAmount: 0 });
  }

  // ── Employee salaries ─────────────────────────────────────────────────────
  for (const emp of allEmployees) {
    const paid = emp.role === "teacher" ? emp.salaryAmount : Math.round(emp.salaryAmount * 0.75);
    await upsertSalary(emp, { amount: emp.salaryAmount, paidAmount: paid });
  }

  // ── Salary increment demo ─────────────────────────────────────────────────
  const adminUser    = await User.findOne({ email: "admin@school.test" });
  const demoTeacher  = otherEmployees.find((e) => e.contactInfo.email === "teacher@school.test");
  if (demoTeacher) {
    await SalaryIncrement.findOneAndUpdate(
      { employee: demoTeacher._id, reason: "Annual performance increment" },
      { employee: demoTeacher._id, previousSalary: 40000, incrementAmount: 2000, newSalary: 42000, effectiveDate: new Date(`${currentYear}-03-01`), reason: "Annual performance increment", approvedBy: adminUser?._id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  // ── Class routines ────────────────────────────────────────────────────────
  const routineRows = [
    { className: "Class 6", day: "Sunday",  startTime: "09:00", endTime: "09:45", subject: "Mathematics", teacherName: "Demo Teacher",  room: "201" },
    { className: "Class 6", day: "Sunday",  startTime: "09:50", endTime: "10:35", subject: "English",     teacherName: "Nusrat Jahan",  room: "201" },
    { className: "Class 6", day: "Monday",  startTime: "09:00", endTime: "09:45", subject: "Science",     teacherName: "Demo Teacher",  room: "202" },
    { className: "Class 7", day: "Sunday",  startTime: "09:00", endTime: "09:45", subject: "English",     teacherName: "Nusrat Jahan",  room: "301" },
    { className: "Class 7", day: "Monday",  startTime: "10:00", endTime: "10:45", subject: "Mathematics", teacherName: "Demo Teacher",  room: "301" },
  ];
  for (const row of routineRows) {
    await ClassRoutine.findOneAndUpdate(
      { className: row.className, day: row.day, startTime: row.startTime, subject: row.subject },
      { ...row, status: "active", note: "Demo routine", createdBy: adminUser?._id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  // ── Exam marks for Class 6 + 7 students ───────────────────────────────────
  const teacherUser = otherEmployees.find((e) => e.contactInfo.email === "teacher@school.test");
  const markedStudents = allStudents.filter((s) => s.className === "Class 6" || s.className === "Class 7");
  for (const student of markedStudents) {
    const subjects = subjectsForClass(student.className).slice(0, 5);
    for (let i = 0; i < subjects.length; i++) {
      const base = 65 + Math.round((student.rollNumber.charCodeAt(student.rollNumber.length - 1) + i * 7) % 30);
      await upsertMark(markPayload({ student, subject: subjects[i], examType: "semester", examNo: 1, totalMarks: 100, obtainedMarks: base, contributionPercent: 100, enteredBy: teacherUser?._id }));
      await upsertMark(markPayload({ student, subject: subjects[i], examType: "monthly",  examNo: 1, totalMarks: 50,  obtainedMarks: Math.max(Math.round(base / 2), 18), contributionPercent: 0, enteredBy: teacherUser?._id }));
    }
  }

  // ── Attendance — last 7 weekdays ──────────────────────────────────────────
  for (let d = 0; d < 7; d++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    const dateUTC = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    if (dateUTC.getUTCDay() === 0 || dateUTC.getUTCDay() === 6) continue;
    for (const emp of allEmployees) {
      const rand = Math.random();
      const status   = rand < 0.80 ? "present" : rand < 0.88 ? "late" : rand < 0.93 ? "leave" : "absent";
      const checkIn  = status === "absent" || status === "leave" ? "" : status === "late" ? "09:35" : "09:02";
      const checkOut = status === "absent" || status === "leave" ? "" : "16:30";
      await EmployeeAttendance.findOneAndUpdate(
        { employee: emp._id, date: dateUTC },
        { employee: emp._id, date: dateUTC, checkIn, checkOut, status, method: d === 0 ? "biometric" : "manual", deviceId: d === 0 ? "TERMINAL-01" : "", note: "Demo", markedBy: adminUser?._id },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );
    }
  }

  await Promise.all([
    ...allStudents.map((s) => refreshStudentDue(s._id)),
    ...allEmployees.map((e) => refreshEmployeeDue(e._id)),
  ]);

  // ── Demo classrooms ────────────────────────────────────────────────────────
  // Build a lookup: className+sectionName → section _id
  const sectionLookup = new Map();
  for (const t of SECTION_TEACHERS) {
    const sec = await ClassSection.findOne({ className: t.cls, sectionName: t.sec, academicYear: YEAR_STR });
    if (sec) sectionLookup.set(`${t.cls}|${t.sec}`, sec._id);
    const teacherUser = await User.findOne({ email: t.email });
    if (teacherUser && sec) {
      sectionLookup.set(`teacher|${t.cls}|${t.sec}`, teacherUser._id);
    }
  }

  const classroomDefs = [
    // Ground floor — early classes
    { roomNo: "G-01", floor: "Ground", benchCount: 30, studentCapacity: 30, notes: "Play & Nursery morning room",
      shifts: [
        { shiftName: "Morning", className: "Play",    sectionKey: "Play|Boys"    },
        { shiftName: "Day",     className: "Nursery", sectionKey: "Nursery|Girls" },
      ],
    },
    { roomNo: "G-02", floor: "Ground", benchCount: 30, studentCapacity: 30, notes: "Nursery Boys & KG Girls",
      shifts: [
        { shiftName: "Morning", className: "Nursery", sectionKey: "Nursery|Boys" },
        { shiftName: "Day",     className: "KG",      sectionKey: "KG|Girls"     },
      ],
    },
    { roomNo: "G-03", floor: "Ground", benchCount: 32, studentCapacity: 32, notes: "KG Boys & Play Girls",
      shifts: [
        { shiftName: "Morning", className: "KG",   sectionKey: "KG|Boys"    },
        { shiftName: "Day",     className: "Play",  sectionKey: "Play|Girls" },
      ],
    },
    // First floor — Class 1–4
    { roomNo: "101",  floor: "1st",    benchCount: 36, studentCapacity: 36, notes: "Class 1 Boys",
      shifts: [{ shiftName: "Morning", className: "Class 1", sectionKey: "Class 1|Boys" }],
    },
    { roomNo: "102",  floor: "1st",    benchCount: 36, studentCapacity: 36, notes: "Class 1 Girls",
      shifts: [{ shiftName: "Morning", className: "Class 1", sectionKey: "Class 1|Girls" }],
    },
    { roomNo: "103",  floor: "1st",    benchCount: 36, studentCapacity: 36, notes: "Class 2",
      shifts: [
        { shiftName: "Morning", className: "Class 2", sectionKey: "Class 2|Boys"  },
        { shiftName: "Day",     className: "Class 2", sectionKey: "Class 2|Girls" },
      ],
    },
    { roomNo: "104",  floor: "1st",    benchCount: 36, studentCapacity: 36, notes: "Class 3",
      shifts: [
        { shiftName: "Morning", className: "Class 3", sectionKey: "Class 3|Boys"  },
        { shiftName: "Day",     className: "Class 3", sectionKey: "Class 3|Girls" },
      ],
    },
    // Second floor — Class 4–7
    { roomNo: "201",  floor: "2nd",    benchCount: 40, studentCapacity: 40, notes: "Class 4 & 5 morning classes",
      shifts: [
        { shiftName: "Morning", className: "Class 4", sectionKey: "Class 4|Boys"  },
        { shiftName: "Day",     className: "Class 5", sectionKey: "Class 5|Boys"  },
      ],
    },
    { roomNo: "202",  floor: "2nd",    benchCount: 40, studentCapacity: 40, notes: "Class 4 & 5 Girls",
      shifts: [
        { shiftName: "Morning", className: "Class 4", sectionKey: "Class 4|Girls" },
        { shiftName: "Day",     className: "Class 5", sectionKey: "Class 5|Girls" },
      ],
    },
    { roomNo: "203",  floor: "2nd",    benchCount: 42, studentCapacity: 42, notes: "Class 6",
      shifts: [
        { shiftName: "Morning", className: "Class 6", sectionKey: "Class 6|Boys"  },
        { shiftName: "Day",     className: "Class 6", sectionKey: "Class 6|Girls" },
      ],
    },
    { roomNo: "204",  floor: "2nd",    benchCount: 42, studentCapacity: 42, notes: "Class 7",
      shifts: [
        { shiftName: "Morning", className: "Class 7", sectionKey: "Class 7|Boys"  },
        { shiftName: "Day",     className: "Class 7", sectionKey: "Class 7|Girls" },
      ],
    },
    // Third floor — Class 8–10
    { roomNo: "301",  floor: "3rd",    benchCount: 44, studentCapacity: 44, notes: "Class 8",
      shifts: [
        { shiftName: "Morning", className: "Class 8", sectionKey: "Class 8|Boys"  },
        { shiftName: "Day",     className: "Class 8", sectionKey: "Class 8|Girls" },
      ],
    },
    { roomNo: "302",  floor: "3rd",    benchCount: 44, studentCapacity: 44, notes: "Class 9 Science",
      shifts: [
        { shiftName: "Morning", className: "Class 9 Science", sectionKey: "Class 9 Science|Boys"  },
        { shiftName: "Day",     className: "Class 9 Science", sectionKey: "Class 9 Science|Girls" },
      ],
    },
    { roomNo: "303",  floor: "3rd",    benchCount: 44, studentCapacity: 44, notes: "Class 10 Science",
      shifts: [
        { shiftName: "Morning", className: "Class 10 Science", sectionKey: "Class 10 Science|Boys"  },
        { shiftName: "Day",     className: "Class 10 Science", sectionKey: "Class 10 Science|Girls" },
      ],
    },
  ];

  for (const def of classroomDefs) {
    const shifts = def.shifts.map((s) => ({
      shiftName: s.shiftName,
      className: s.className,
      section: sectionLookup.get(s.sectionKey) || null,
      classTeacher: sectionLookup.get(`teacher|${s.sectionKey}`) || null,
    }));
    await Classroom.findOneAndUpdate(
      { roomNo: def.roomNo },
      { roomNo: def.roomNo, floor: def.floor, benchCount: def.benchCount, studentCapacity: def.studentCapacity, notes: def.notes, shifts },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  console.log(`Demo ERP data ready: ${allStudents.length} students across ${SECTION_CLASSES.length} classes (Boys+Girls sections), ${allEmployees.length} employees, ${classroomDefs.length} classrooms.`);
}

module.exports = { ensureDemoData };
