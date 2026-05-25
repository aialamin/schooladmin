import { Fragment, memo, useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import AdminLayout from "../layouts/AdminLayout";
import { api, getErrorMessage } from "../api";
import { cacheLoad, cacheSave, erpApi, loadERPData, refreshPartialData } from "../services/erpService";
import { startRegistration } from "@simplewebauthn/browser";

const money = new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 });
const year = new Date().getFullYear();
const currentMonth = new Date().toISOString().slice(0, 7);

const academicClassOptions = [
  { className: "Play", group: "Pre-primary" },
  { className: "Nursery", group: "Pre-primary" },
  { className: "KG", group: "Pre-primary" },
  ...Array.from({ length: 8 }, (_, index) => ({ className: `Class ${index + 1}`, group: "Primary/Junior" })),
  { className: "Class 9 Science", group: "Science" },
  { className: "Class 9 Arts", group: "Arts" },
  { className: "Class 9 Commerce", group: "Commerce" },
  { className: "Class 10 Science", group: "Science" },
  { className: "Class 10 Arts", group: "Arts" },
  { className: "Class 10 Commerce", group: "Commerce" },
  { className: "Class 11 Science", group: "Science" },
  { className: "Class 11 Arts", group: "Arts" },
  { className: "Class 11 Commerce", group: "Commerce" },
  { className: "Class 12 Science", group: "Science" },
  { className: "Class 12 Arts", group: "Arts" },
  { className: "Class 12 Commerce", group: "Commerce" },
];

const subjectCatalog = {
  prePrimary: ["Bangla Reading", "English Reading", "Numbers", "Drawing", "Rhymes", "General Knowledge", "Moral Education"],
  primary: ["Bangla", "English", "Mathematics", "General Science", "Bangladesh and Global Studies", "Religious Studies", "ICT", "Physical Education", "Arts and Crafts"],
  junior: ["Bangla", "English", "Mathematics", "Science", "Bangladesh and Global Studies", "Religious Studies", "ICT", "Agriculture Studies", "Physical Education"],
  science: ["Bangla", "English", "Mathematics", "Higher Mathematics", "Physics", "Chemistry", "Biology", "ICT", "Religious Studies", "Bangladesh and Global Studies"],
  arts: ["Bangla", "English", "General Mathematics", "Civics", "History", "Geography", "Economics", "Logic", "ICT", "Religious Studies"],
  commerce: ["Bangla", "English", "General Mathematics", "Accounting", "Business Entrepreneurship", "Finance and Banking", "Economics", "ICT", "Religious Studies"],
};

function catalogKeyForClass(className = "") {
  const value = String(className).toLowerCase();
  if (value.includes("play") || value.includes("nursery") || value.includes("kg")) return "prePrimary";
  if (value.includes("science")) return "science";
  if (value.includes("arts") || value.includes("humanities")) return "arts";
  if (value.includes("commerce") || value.includes("business")) return "commerce";
  const numberMatch = value.match(/class\s*(\d+)/);
  const classNumber = numberMatch ? Number(numberMatch[1]) : 0;
  if (classNumber >= 6) return "junior";
  return "primary";
}

function subjectsForClass(className = "") {
  return subjectCatalog[catalogKeyForClass(className)] || subjectCatalog.primary;
}

const allSubjectOptions = [...new Set(Object.values(subjectCatalog).flat())].sort();

const emptyForms = {
  classFee: { className: "", admissionFee: 0, sessionFee: 0, monthlyFee: 0, examFee: 0 },
  student: { name: "", classFee: "", rollNumber: "", phone: "", email: "", guardianName: "", address: "", dateOfBirth: "", admissionDate: new Date().toISOString().slice(0, 10), status: "active", section: "", gender: "" },
  payment: { student: "", feeType: "monthly", amount: 0, paidAmount: 0, billingMonth: currentMonth, term: "", note: "" },
  employee: { name: "", role: "teacher", salaryType: "monthly", salaryAmount: 0, phone: "", email: "", address: "", assignedClass: "", isClassTeacher: false, subject: "", joiningDate: new Date().toISOString().slice(0, 10), status: "active" },
  salary: { employee: "", salaryMonth: currentMonth, amount: 0, paidAmount: 0, note: "" },
  monthlyFees: { month: currentMonth },
  examFees: { term: "Term 1" },
  monthlySalaries: { month: currentMonth },
  mark: { student: "", subject: "", academicYear: year, examType: "monthly", examNo: 1, month: currentMonth, totalMarks: 100, obtainedMarks: 0, contributionPercent: 0, note: "" },
  routine: { className: "", day: "Saturday", startTime: "09:00", endTime: "10:00", subject: "", teacherName: "", room: "", status: "active", note: "" },
  increment: { employee: "", previousSalary: 0, incrementAmount: 0, newSalary: 0, effectiveDate: new Date().toISOString().slice(0, 10), reason: "" },
  schoolSettings: { schoolName: "Your School Name", shortName: "School", subtitle: "An English Medium School", leftLogoUrl: "", rightLogoUrl: "", address: "School address here", phone: "", schoolEmail: "", website: "", academicYear: year.toString(), academicSession: "January - December", defaultExamTitle: "Progress Report", defaultPassMark: 33, classStartTime: "09:00", supportEmail: "", admissionNotice: "Admission open. Contact school office for details.", principalName: "Principal", resultRemarksDefault: "She/He has been consistently progressing." },
  userSettings: { name: "", email: "", photoUrl: "", currentPassword: "", newPassword: "", confirmPassword: "" },
  attendance: { employee: "", date: new Date().toISOString().slice(0, 10), checkIn: "", checkOut: "", status: "present", method: "manual", note: "" },
  expense: { title: "", category: "other", amount: 0, date: new Date().toISOString().slice(0, 10), paidTo: "", paymentMethod: "cash", receiptNo: "", note: "" },
  section: { className: "", sectionName: "", classTeacher: "", academicYear: year.toString() },
  classroom: { roomNo: "", floor: "", benchCount: 0, studentCapacity: 0, notes: "", shifts: [] },
};

const marketFeatureRows = [
  { feature: "Student Information System", market: "Central student records, profile history, guardians, documents, attendance, behavior, and transcript-ready data.", yourSystem: "Student profiles, class/roll validation, guardian/contact details, dues, marks, and final result summary.", priority: "Strong base" },
  { feature: "Gradebook & Results", market: "Teacher gradebook, weighted assessments, report cards, transcripts, standards-based progress tracking.", yourSystem: "Monthly, semester, and class test marks with total marks, obtained marks, contribution percentage, grade, and pass/fail status.", priority: "Competitive" },
  { feature: "Fee & Finance", market: "Billing automation, payment gateway, invoices, refunds, discounts, and finance reports.", yourSystem: "Class fee rules, admission/session/monthly/exam fees, payment ledger, due calculation, salary ledger, and increments.", priority: "Add online payment next" },
  { feature: "Timetable", market: "Drag-and-drop scheduling, conflict checks, room/teacher workload, calendar sync.", yourSystem: "Routine creation with teacher/class overlap prevention, room, day, time, subject, and status.", priority: "Good workflow" },
  { feature: "Portals & Communication", market: "Separate admin, teacher, parent, student portals with alerts, notices, SMS/email, mobile access.", yourSystem: "Role-based login is ready; student self-view works when profile matches email/name.", priority: "Parent portal next" },
  { feature: "Analytics & Usability", market: "Executive dashboards, searchable tables, quick actions, trend cards, role-based shortcuts, audit-ready reports.", yourSystem: "This update adds smart dashboard cards, searchable tables, benchmark panel, quick actions, and modern mobile-friendly UI.", priority: "Upgraded now" },
];

const quickImprovements = [
  "Student, fee, and result records in one place",
  "Fast search and class filtering",
  "Role-based access for each user",
  "Clean settings for school details and reports",
];

function toDateInput(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

const ATTENDANCE_STATUS_COLOR = {
  present:  "bg-emerald-100 text-emerald-700",
  late:     "bg-amber-100 text-amber-700",
  absent:   "bg-rose-100 text-rose-700",
  leave:    "bg-blue-100 text-blue-700",
  "half-day": "bg-purple-100 text-purple-700",
};

function Field({ children, label, hint }) {
  return (
    <label className="form-field group grid gap-2 text-[13px] font-bold text-slate-700">
      <span className="tracking-[0.01em]">{label}</span>
      {children}
      {hint && <small className="text-xs leading-5 text-slate-500">{hint}</small>}
    </label>
  );
}

function SectionHeader({ action, eyebrow, title }) {
  return (
    <div className="section-header rounded-[22px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight text-slate-950 md:text-3xl">{title}</h2>
      </div>
      <div className="action-row flex flex-wrap items-center gap-2">{action}</div>
    </div>
  );
}

function DashboardIcon({ name, className = "" }) {
  const props = {
    className: `dashboard-icon ${className}`.trim(),
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  const icons = {
    student: <><path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" /><path d="M6.5 11v4.2c0 1.8 2.5 3.2 5.5 3.2s5.5-1.4 5.5-3.2V11" /></>,
    due: <><path d="M5 5.5h14v13H5z" /><path d="M8 9h8" /><path d="M8 13h5" /><path d="M17 17l2.2 2.2" /><path d="m19.2 17-2.2 2.2" /></>,
    wallet: <><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12.5A1.5 1.5 0 0 1 20 6.5V9" /><path d="M3.5 7.5v9A2.5 2.5 0 0 0 6 19h13.5A1.5 1.5 0 0 0 21 17.5v-7A1.5 1.5 0 0 0 19.5 9H6A2.5 2.5 0 0 1 3.5 7.5Z" /><path d="M17 14h.01" /></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></>,
    marks: <><path d="M6 3.5h9l3 3V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M14 3.5v4h4" /><path d="m8 15 2 2 5-6" /></>,
    calendar: <><path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M3 10h18" /><path d="M15 15h3" /><path d="M15 18h3" /></>,
    employees: <><path d="M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M2.8 21c.6-3.9 2.9-6.2 6.2-6.2s5.6 2.3 6.2 6.2" /><path d="M17.5 10.2a3 3 0 1 0-.8-5.8" /><path d="M17.2 14.6c2.3.5 3.8 2.5 4.2 5.4" /></>,
    addUser: <><path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M2.7 21c.7-4.4 3-6.6 6.8-6.6 2.1 0 3.8.7 5 2" /><path d="M18 14v6" /><path d="M15 17h6" /></>,
    clipboard: <><path d="M9 4h6l1 2h3v15H5V6h3l1-2Z" /><path d="M9 10h6" /><path d="M9 14h6" /><path d="M9 18h4" /></>,
    check: <><path d="M20 6 9 17l-5-5" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-7" /></>,
    profile: <><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 21c.8-4.2 3.5-6.5 8-6.5s7.2 2.3 8 6.5" /><path d="M16 19h4" /></>,
    edit: <><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m13.5 8.5 3 3" /></>,
    delete: <><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 14h10l1-14" /><path d="M9 7V4h6v3" /></>,
    pdf: <><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M14 3.5v4h4" /><path d="M8 15h1.3a1.3 1.3 0 0 0 0-2.6H8V17" /><path d="M12 17v-4.6h1.1a2.3 2.3 0 0 1 0 4.6H12Z" /><path d="M16 17v-4.6h2" /><path d="M16 14.6h1.6" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.37a1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
    sun: <><path d="M12 4V2" /><path d="M12 22v-2" /><path d="M4 12H2" /><path d="M22 12h-2" /><path d="m4.93 4.93-1.41-1.41" /><path d="m20.48 20.48-1.41-1.41" /><path d="m4.93 19.07-1.41 1.41" /><path d="m20.48 3.52-1.41 1.41" /><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /></>,
    moon: <><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z" /></>,
    school: <><path d="M4 10 12 5l8 5" /><path d="M6 11v8h12v-8" /><path d="M10 19v-5h4v5" /><path d="M3 19h18" /></>,
    refresh: <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.2 9A7 7 0 0 0 6.4 6.4L4 8.8" /><path d="M5.8 15A7 7 0 0 0 17.6 17.6L20 15.2" /></>,
    lock: <><path d="M7 10V7a5 5 0 0 1 10 0v3" /><path d="M5 10h14v10H5V10Z" /><path d="M12 14v2" /></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v4c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 9v4c0 1.66 4.03 3 9 3s9-1.34 9-3V9" /><path d="M3 13v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4" /></>,
    plug: <><path d="M12 22v-5" /><path d="M9 7V2" /><path d="M15 7V2" /><path d="M6 13V7h12v6a6 6 0 0 1-6 6 6 6 0 0 1-6-6Z" /></>,
    checkCircle: <><path d="M22 11.07V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3 8-8" /></>,
    alertCircle: <><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></>,
  };

  return <svg {...props}>{icons[name] || icons.chart}</svg>;
}

const StatCard = memo(function StatCard({ helper, icon = "chart", label, tone = "blue", value }) {
  const safeValue = value ?? 0;
  const isLongValue = String(safeValue).length > 10;

  return (
    <article className={`stat-card metric-card tone-${tone}`} data-tone={tone} aria-label={`${label}: ${safeValue}`}>
      <span className="metric-glow" aria-hidden="true" />
      <div className="metric-card-head">
        <span className="metric-badge"><DashboardIcon name={icon} /></span>
      </div>
      <div className="metric-card-body">
        <span className="metric-label">{label}</span>
        <strong className={`${isLongValue ? "stat-value long" : "stat-value"}`}>{safeValue}</strong>
        {helper && <small className="metric-helper">{helper}</small>}
      </div>
    </article>
  );
});

const Status = memo(function Status({ status }) {
  const safeStatus = String(status || "active").toLowerCase();
  const statusClass = safeStatus.replace(/\s+/g, "-");
  const label = safeStatus.replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <span aria-label={label} className={`status dot-status ${statusClass}`} title={label}>
      <span className="sr-only">{label}</span>
    </span>
  );
});

const BooleanDot = memo(function BooleanDot({ value, trueLabel = "Yes", falseLabel = "No" }) {
  const label = value ? trueLabel : falseLabel;

  return (
    <span aria-label={label} className={`status dot-status ${value ? "active" : "inactive"}`} title={label}>
      <span className="sr-only">{label}</span>
    </span>
  );
});

const GradeBadge = memo(function GradeBadge({ grade }) {
  return <span className={`grade-badge grade-${String(grade || "na").toLowerCase().replace("+", "plus")}`}>{grade || "N/A"}</span>;
});

const ResultStatus = memo(function ResultStatus({ status }) {
  const safeStatus = String(status || "Incomplete weight");
  return <span className={`result-status ${safeStatus.toLowerCase().replaceAll(" ", "-")}`}>{safeStatus}</span>;
});

const ActionButton = memo(function ActionButton({ icon, label, tone = "soft", onClick }) {
  return (
    <button aria-label={label} className={`action-icon-btn ${tone}`} title={label} type="button" onClick={onClick}>
      <DashboardIcon name={icon} />
    </button>
  );
});


function gradeFromPercentClient(percent) {
  const value = Number(percent || 0);
  if (value >= 80) return "A+";
  if (value >= 70) return "A";
  if (value >= 60) return "A-";
  if (value >= 50) return "B";
  if (value >= 40) return "C";
  if (value >= 33) return "D";
  return "F";
}

function getStudentId(value) {
  if (!value) return "";
  return value._id || value.id || value;
}

function formatExamName(cardOrMark) {
  const type = String(cardOrMark.examType || "exam").replace("_", " ");
  const label = type.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const number = cardOrMark.examNo ? ` ${cardOrMark.examNo}` : "";
  const month = cardOrMark.month ? ` • ${cardOrMark.month}` : "";
  return `${label}${number}${month}`;
}

function buildResultCards(marks = [], students = []) {
  const studentMap = new Map(students.map((student) => [student._id, student]));
  const groups = new Map();

  marks.forEach((mark) => {
    const studentId = getStudentId(mark.student);
    if (!studentId) return;
    const key = [studentId, mark.academicYear, mark.examType, mark.examNo, mark.month || ""].join("|");
    const student = mark.student && typeof mark.student === "object" ? mark.student : studentMap.get(studentId);

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        studentId,
        student,
        className: student?.className || mark.className || "",
        academicYear: mark.academicYear,
        examType: mark.examType,
        examNo: mark.examNo,
        month: mark.month || "",
        subjects: [],
        totalMarks: 0,
        obtainedMarks: 0,
      });
    }

    const card = groups.get(key);
    const totalMarks = Number(mark.totalMarks || 0);
    const obtainedMarks = Number(mark.obtainedMarks || 0);
    const percentage = totalMarks ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;
    card.subjects.push({
      subject: mark.subject,
      totalMarks,
      obtainedMarks,
      percentage,
      grade: gradeFromPercentClient(percentage),
      note: mark.note || "",
    });
    card.totalMarks += totalMarks;
    card.obtainedMarks += obtainedMarks;
  });

  const cards = [...groups.values()].map((card) => {
    const percentage = card.totalMarks ? Number(((card.obtainedMarks / card.totalMarks) * 100).toFixed(2)) : 0;
    return {
      ...card,
      percentage,
      grade: gradeFromPercentClient(percentage),
      resultStatus: percentage >= 33 ? "Pass" : "Fail",
      examLabel: formatExamName(card),
      highestMarks: 0,
      highestPercent: 0,
      classPosition: null,
      classSize: 0,
    };
  });

  const examGroups = new Map();
  cards.forEach((card) => {
    const classKey = [card.className || card.student?.className || "", card.academicYear, card.examType, card.examNo, card.month || ""].join("|");
    if (!examGroups.has(classKey)) examGroups.set(classKey, []);
    examGroups.get(classKey).push(card);
  });

  examGroups.forEach((group) => {
    group.sort((a, b) => {
      const percentDiff = Number(b.percentage || 0) - Number(a.percentage || 0);
      if (percentDiff) return percentDiff;
      return Number(b.obtainedMarks || 0) - Number(a.obtainedMarks || 0);
    });

    const highestMarks = group[0]?.obtainedMarks || 0;
    const highestPercent = group[0]?.percentage || 0;
    let previousPercent = null;
    let previousMarks = null;
    let previousRank = 0;

    group.forEach((card, index) => {
      const sameAsPrevious = previousPercent === card.percentage && previousMarks === card.obtainedMarks;
      const rank = sameAsPrevious ? previousRank : index + 1;
      card.highestMarks = highestMarks;
      card.highestPercent = highestPercent;
      card.classPosition = rank;
      card.classSize = group.length;
      previousPercent = card.percentage;
      previousMarks = card.obtainedMarks;
      previousRank = rank;
    });
  });

  return cards.sort((a, b) => String(b.academicYear).localeCompare(String(a.academicYear)) || a.examLabel.localeCompare(b.examLabel));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function logoHtml(url, fallback) {
  const safeUrl = String(url || "").trim();
  if (safeUrl) {
    return `<div class="logo"><img src="${escapeHtml(safeUrl)}" alt="logo" /></div>`;
  }
  return `<div class="logo fallback">${escapeHtml(fallback)}</div>`;
}

function resultCardHtml(card, settings = {}) {
  const schoolName = settings.schoolName || "Your School Name";
  const subtitle = settings.subtitle || "An English Medium School";
  const title = settings.defaultExamTitle || "Progress Report";
  const student = card.student || {};
  const rows = card.subjects.map((subject, index) => `
    <tr>
      <td>${index + 1}</td>
      <td class="subject">${escapeHtml(subject.subject)}</td>
      <td>${subject.totalMarks}</td>
      <td>${subject.obtainedMarks}</td>
      <td>${subject.percentage}%</td>
      <td>${escapeHtml(subject.grade)}</td>
      <td>${escapeHtml(subject.note || "-")}</td>
    </tr>`).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(student.name || "Student")} - ${escapeHtml(card.examLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 18px; color: #111827; font-family: Arial, Helvetica, sans-serif; background: #f3f4f6; }
  .sheet { width: 900px; max-width: 100%; margin: 0 auto; background: #fff; border: 2px solid #111827; padding: 10px; }
  .school-header { display: grid; grid-template-columns: 105px 1fr 105px; gap: 10px; align-items: center; border-bottom: 3px solid #991b1b; padding-bottom: 8px; }
  .logo { width: 92px; height: 92px; border: 2px solid #111827; border-radius: 50%; display: grid; place-items: center; overflow: hidden; margin: auto; font-weight: 900; color: #991b1b; text-align: center; }
  .logo img { width: 100%; height: 100%; object-fit: cover; }
  .school-title { text-align: center; }
  .school-title h1 { margin: 0; color: #dc2626; font-size: 44px; letter-spacing: 2px; text-transform: uppercase; }
  .school-title h2 { margin: 4px 0 0; color: #047857; font-size: 20px; }
  .school-title p { margin: 5px 0 0; font-weight: 700; }
  .exam-title { text-align: center; padding: 12px 0 8px; border-bottom: 2px solid #111827; }
  .exam-title h2 { margin: 0; color: #7f1d1d; font-size: 26px; }
  .exam-title h3 { display: inline-block; margin: 8px 0 0; border-bottom: 2px solid #7f1d1d; color: #7f1d1d; text-transform: uppercase; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #111827; margin: 10px 0; }
  .info-grid div { padding: 9px; border-right: 1px solid #111827; font-size: 15px; }
  .info-grid div:last-child { border-right: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { border: 1px solid #111827; padding: 8px; text-align: center; }
  th { background: #f9fafb; font-size: 15px; }
  td.subject { text-align: left; font-weight: 700; }
  tfoot td { font-weight: 900; background: #f9fafb; }
  .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 14px; }
  .box { border: 1px solid #111827; min-height: 120px; }
  .box h3 { margin: 0; padding: 8px; border-bottom: 1px solid #111827; text-align: center; }
  .box p { margin: 0; padding: 8px 10px; border-bottom: 1px solid #d1d5db; }
  .remarks { margin-top: 12px; border: 1px solid #111827; padding: 12px; text-align: center; font-size: 18px; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 44px; text-align: center; }
  .signatures span { display: block; border-top: 1px solid #111827; padding-top: 8px; font-weight: 700; }
  .notice { margin-top: 14px; border: 1px solid #111827; padding: 10px; font-size: 13px; }
  .powered { text-align: center; margin-top: 12px; color: #2563eb; font-weight: 800; }
  @media print { body { padding: 0; background: #fff; } .sheet { width: 100%; border-color: #111827; } @page { size: A4 portrait; margin: 10mm; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="school-header">
      ${logoHtml(settings.leftLogoUrl, "LOGO")}
      <div class="school-title">
        <h1>${escapeHtml(schoolName)}</h1>
        <h2>${escapeHtml(subtitle)}</h2>
        <p>${escapeHtml(settings.address || "")}${settings.phone ? ` • ${escapeHtml(settings.phone)}` : ""}${settings.website ? ` • ${escapeHtml(settings.website)}` : ""}</p>
      </div>
      ${logoHtml(settings.rightLogoUrl, "LOGO")}
    </div>
    <div class="exam-title">
      <h2>${escapeHtml(card.examLabel)} Examination ${escapeHtml(card.academicYear)}</h2>
      <h3>${escapeHtml(title)} - ${escapeHtml(card.student?.className || card.student?.class || "Class")}</h3>
    </div>
    <div class="info-grid">
      <div><strong>Student Name:</strong> ${escapeHtml(student.name || "Student")}</div>
      <div><strong>Guardian:</strong> ${escapeHtml(student.contactInfo?.guardianName || "Not set")}</div>
      <div><strong>Student ID / Roll:</strong> ${escapeHtml(student.rollNumber || card.studentId)}</div>
    </div>
    <table>
      <thead>
        <tr><th>SL</th><th>Subjects</th><th>Max Marks</th><th>Marks Obt.</th><th>Percentage</th><th>Grade</th><th>Note</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="2">TOTAL</td><td>${card.totalMarks}</td><td>${card.obtainedMarks}</td><td>${card.percentage}%</td><td>${escapeHtml(card.grade)}</td><td>${escapeHtml(card.resultStatus)}</td></tr>
      </tfoot>
    </table>
    <div class="bottom-grid">
      <div class="box"><h3>Co-Scholastic Areas</h3><p><strong>Discipline:</strong> Excellent</p><p><strong>Reading Skill:</strong> Fluent</p><p><strong>Writing Skill:</strong> Good</p><p><strong>Interest:</strong> Reading</p></div>
      <div class="box"><h3>Result</h3><p><strong>Status:</strong> ${escapeHtml(card.resultStatus)}</p><p><strong>Percentage:</strong> ${card.percentage}%</p><p><strong>Grade:</strong> ${escapeHtml(card.grade)}</p><p><strong>Highest Marks:</strong> ${card.highestMarks || card.obtainedMarks}/${card.totalMarks}</p><p><strong>Position:</strong> ${card.classPosition ? `${card.classPosition} of ${card.classSize}` : "-"}</p></div>
    </div>
    <div class="notice"><strong>Notice:</strong> ${escapeHtml(settings.admissionNotice || "")}</div>
    <div class="remarks"><strong>Remarks:</strong> <u>${escapeHtml(settings.resultRemarksDefault || "She/He has been consistently progressing.")}</u></div>
    <div class="signatures"><span>Class Teacher</span><span>${escapeHtml(settings.principalName || "Principal")}</span><span>Guardian</span></div>
    <div class="powered">Generated by School Management System</div>
  </div>
</body>
</html>`;
}

function writePrintDocument(printWindow, html) {
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 450);
  return true;
}

function downloadResultCard(card, settings) {
  const printWindow = window.open("", "_blank", "width=980,height=720");
  return writePrintDocument(printWindow, resultCardHtml(card, settings));
}

function feeLabel(payment = {}) {
  const type = String(payment.feeType || "fee").replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return [type, payment.billingMonth, payment.term].filter(Boolean).join(" • ");
}

function receiptBaseStyles() {
  return `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; color: #111827; background: #f3f4f6; font-family: Arial, Helvetica, sans-serif; }
  .receipt { width: 760px; max-width: 100%; margin: 0 auto; background: #fff; border: 1px solid #d1d5db; border-radius: 18px; padding: 28px; }
  .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111827; padding-bottom: 16px; }
  .school h1 { margin: 0; font-size: 28px; color: #0f172a; }
  .school p { margin: 4px 0 0; color: #475569; }
  .stamp { border: 2px solid #16a34a; color: #16a34a; border-radius: 999px; padding: 10px 18px; font-weight: 900; letter-spacing: 2px; transform: rotate(-6deg); }
  .title { margin: 22px 0; display: flex; justify-content: space-between; align-items: end; gap: 16px; }
  .title h2 { margin: 0; font-size: 24px; color: #1d4ed8; }
  .title small { color: #64748b; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 18px; }
  .field { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
  .field span { display: block; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  .field strong { display: block; margin-top: 5px; font-size: 16px; color: #111827; }
  table { width: 100%; border-collapse: collapse; margin: 18px 0; }
  th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
  th { background: #f8fafc; }
  .amount { text-align: right; font-weight: 800; }
  .summary { margin-left: auto; width: 320px; max-width: 100%; border: 1px solid #d1d5db; border-radius: 14px; overflow: hidden; }
  .summary div { display: flex; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #e5e7eb; }
  .summary div:last-child { border-bottom: 0; background: #eff6ff; font-weight: 900; }
  .footer { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 52px; text-align: center; }
  .footer span { border-top: 1px solid #111827; padding-top: 8px; font-weight: 700; }
  .note { margin-top: 18px; color: #64748b; font-size: 13px; }
  @media print { body { background: #fff; padding: 0; } .receipt { border-radius: 0; border: 0; width: 100%; } @page { size: A4 portrait; margin: 12mm; } }
  `;
}

function studentPaymentReceiptHtml(payment = {}, settings = {}) {
  const student = payment.student || {};
  const receiptNo = payment._id ? String(payment._id).slice(-8).toUpperCase() : Date.now();
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Student Fee Receipt</title><style>${receiptBaseStyles()}</style></head>
<body>
  <div class="receipt">
    <div class="header"><div class="school"><h1>${escapeHtml(settings.schoolName || "School")}</h1><p>${escapeHtml(settings.address || "")}</p><p>${escapeHtml(settings.phone || "")}</p></div><div class="stamp">PAID</div></div>
    <div class="title"><div><h2>Student Fee Receipt</h2><small>Receipt #${escapeHtml(receiptNo)}</small></div><small>${new Date(payment.date || payment.updatedAt || Date.now()).toLocaleDateString()}</small></div>
    <div class="grid">
      <div class="field"><span>Student</span><strong>${escapeHtml(student.name || "Student")}</strong></div>
      <div class="field"><span>Class / Roll</span><strong>${escapeHtml(student.className || "-")} / ${escapeHtml(student.rollNumber || "-")}</strong></div>
      <div class="field"><span>Fee</span><strong>${escapeHtml(feeLabel(payment))}</strong></div>
      <div class="field"><span>Status</span><strong>${escapeHtml(payment.status || "paid")}</strong></div>
    </div>
    <table><thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead><tbody><tr><td>${escapeHtml(feeLabel(payment))}</td><td class="amount">${money.format(payment.amount || 0)}</td></tr></tbody></table>
    <div class="summary"><div><span>Total</span><strong>${money.format(payment.amount || 0)}</strong></div><div><span>Paid</span><strong>${money.format(payment.paidAmount || 0)}</strong></div><div><span>Due</span><strong>${money.format(payment.dueAmount || 0)}</strong></div></div>
    <p class="note"><strong>Note:</strong> ${escapeHtml(payment.note || "Payment received.")}</p>
    <div class="footer"><span>Accounts Signature</span><span>Guardian Signature</span></div>
  </div>
</body></html>`;
}

function salaryPaymentReceiptHtml(salary = {}, settings = {}) {
  const employee = salary.employee || {};
  const receiptNo = salary._id ? String(salary._id).slice(-8).toUpperCase() : Date.now();
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Employee Salary Receipt</title><style>${receiptBaseStyles()}</style></head>
<body>
  <div class="receipt">
    <div class="header"><div class="school"><h1>${escapeHtml(settings.schoolName || "School")}</h1><p>${escapeHtml(settings.address || "")}</p><p>${escapeHtml(settings.phone || "")}</p></div><div class="stamp">PAID</div></div>
    <div class="title"><div><h2>Employee Payment Receipt</h2><small>Receipt #${escapeHtml(receiptNo)}</small></div><small>${new Date(salary.paymentDate || salary.updatedAt || Date.now()).toLocaleDateString()}</small></div>
    <div class="grid">
      <div class="field"><span>Employee</span><strong>${escapeHtml(employee.name || "Employee")}</strong></div>
      <div class="field"><span>Role</span><strong>${escapeHtml(employee.role || "-")}</strong></div>
      <div class="field"><span>Salary Month</span><strong>${escapeHtml(salary.salaryMonth || "-")}</strong></div>
      <div class="field"><span>Status</span><strong>${escapeHtml(salary.status || "paid")}</strong></div>
    </div>
    <table><thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead><tbody><tr><td>Salary payment for ${escapeHtml(salary.salaryMonth || "selected month")}</td><td class="amount">${money.format(salary.amount || 0)}</td></tr></tbody></table>
    <div class="summary"><div><span>Total Salary</span><strong>${money.format(salary.amount || 0)}</strong></div><div><span>Paid</span><strong>${money.format(salary.paidAmount || 0)}</strong></div><div><span>Due</span><strong>${money.format(salary.dueAmount || 0)}</strong></div></div>
    <p class="note"><strong>Note:</strong> ${escapeHtml(salary.note || "Salary payment received.")}</p>
    <div class="footer"><span>Accounts Signature</span><span>Employee Signature</span></div>
  </div>
</body></html>`;
}

function downloadStudentPaymentReceipt(payment, settings) {
  const printWindow = window.open("", "_blank", "width=820,height=720");
  return writePrintDocument(printWindow, studentPaymentReceiptHtml(payment, settings));
}

function downloadSalaryPaymentReceipt(salary, settings) {
  const printWindow = window.open("", "_blank", "width=820,height=720");
  return writePrintDocument(printWindow, salaryPaymentReceiptHtml(salary, settings));
}

const tablePageSize = 80;

const DataTable = memo(function DataTable({ columns, rows, title, subtitle, searchable = true, searchPlaceholder = "Search records..." }) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(tablePageSize);
  const filteredRows = useMemo(() => {
    const safeRows = rows || [];
    const keyword = query.trim().toLowerCase();
    if (!keyword) return safeRows;

    return safeRows.filter((row) => {
      const searchableText = columns
        .map((column) => {
          if (column.search) return column.search(row);
          const rawValue = row[column.key];
          if (rawValue && typeof rawValue === "object") return JSON.stringify(rawValue);
          return rawValue ?? "";
        })
        .join(" ")
        .toLowerCase();
      return searchableText.includes(keyword);
    });
  }, [columns, query, rows]);
  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);
  const hiddenRows = Math.max(filteredRows.length - visibleRows.length, 0);

  useEffect(() => {
    setVisibleCount(tablePageSize);
  }, [query, rows]);

  return (
    <div className="table-card smart-table-card">
      {(title || subtitle || searchable) && (
        <div className="table-toolbar">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {searchable && (
            <label className="table-search" aria-label="Search table">
              <span>Search</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
            </label>
          )}
        </div>
      )}
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {filteredRows.length ? visibleRows.map((row, index) => (
            <tr key={row._id || row.id || `${row.feature || row.name || "row"}-${row.className || row.subject || index}`}>
              {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
            </tr>
          )) : (
            <tr><td className="empty-cell" colSpan={columns.length}>{query ? "No matching records found." : "No records found."}</td></tr>
          )}
        </tbody>
      </table>
      {hiddenRows > 0 && (
        <div className="table-load-more">
          <span>Showing {visibleRows.length} of {filteredRows.length}</span>
          <button className="btn soft" type="button" onClick={() => setVisibleCount((count) => count + tablePageSize)}>
            Show more
          </button>
        </div>
      )}
    </div>
  );
});

export default function Dashboard({ token, user, onLogout, onUserUpdate }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [data, setData] = useState({
    dashboard: { totalStudents: 0, totalEmployees: 0, totalIncome: 0, totalDue: 0, monthlyCollection: [], recentPayments: [] },
    classFees: [],
    students: [],
    employees: [],
    payments: [],
    salaries: [],
    marks: [],
    markResults: [],
    routines: [],
    increments: [],
    schoolSettings: emptyForms.schoolSettings,
    attendance: [],
    expenses: [],
    sections: [],
    classrooms: [],
    teacherUsers: [],
  });
  const [modal, setModal] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForms.classFee);
  const [profileStudent, setProfileStudent] = useState(null);
  const [resultCardFilter, setResultCardFilter] = useState({ student: "", exam: "", class: "", teacher: "" });
  const [classFilter, setClassFilter] = useState("");
  const [classwiseClassFilter, setClasswiseClassFilter] = useState("");
  const [marksClassFilter, setMarksClassFilter] = useState("");
  const [marksSectionFilter, setMarksSectionFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(() => !cacheLoad());
  const [theme, setTheme] = useState(() => localStorage.getItem("schoolManagerTheme") || "light");
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceTab, setAttendanceTab] = useState("register"); // "register" | "biometric" | "enroll"
  const [biometricEmployee, setBiometricEmployee] = useState("");
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricResult, setBiometricResult] = useState(null);
  const [enrollLoading, setEnrollLoading] = useState(null); // employeeId being enrolled | null
  const [enrollStatus, setEnrollStatus] = useState(null); // { success, message } | null
  // WebAuthn / fingerprint registration state
  const [webauthnCredentials, setWebauthnCredentials] = useState([]);
  const [webauthnStatus, setWebauthnStatus] = useState("");
  const [webauthnLoading, setWebauthnLoading] = useState(false);
  const [webauthnSupported] = useState(
    () => !!(window.PublicKeyCredential)
  );
  const [bulkAttendanceRows, setBulkAttendanceRows] = useState([]);
  const [attendanceView, setAttendanceView] = useState("monthly"); // "today" | "monthly"
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expenseMonth, setExpenseMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Database configuration state (admin only)
  const [dbConfig, setDbConfig] = useState(null);
  const [dbUriInput, setDbUriInput] = useState("");
  const [dbShowUri, setDbShowUri] = useState(false);
  const [dbTestStatus, setDbTestStatus] = useState(null); // null | { ok, message }
  const [dbTestLoading, setDbTestLoading] = useState(false);
  const [dbSaveLoading, setDbSaveLoading] = useState(false);
  const [dbConfirmPending, setDbConfirmPending] = useState(false);
  const [dbResetPending, setDbResetPending] = useState(false);

  // User account management (admin only)
  const [allUsers, setAllUsers] = useState([]);
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [userPasswordTarget, setUserPasswordTarget] = useState(null); // user whose password is being set
  const [userPasswordForm, setUserPasswordForm] = useState({ password: "", confirmPassword: "" });
  const [userPasswordLoading, setUserPasswordLoading] = useState(false);

  const isAdmin = user.role === "admin";
  const financeAllowed = ["admin", "accounts", "accountant"].includes(user.role);
  const attendanceAllowed = ["admin", "accounts", "accountant", "staff"].includes(user.role);
  const currentEmployee = useMemo(() => {
    const userEmail = String(user.email || "").toLowerCase();
    if (!userEmail) return undefined;
    return data.employees.find((employee) => String(employee.contactInfo?.email || "").toLowerCase() === userEmail);
  }, [data.employees, user.email]);
  const isAssignedClassTeacher = Boolean(currentEmployee?.isClassTeacher && currentEmployee?.assignedClass);
  const paymentWriteAllowed = financeAllowed || (user.role === "teacher" && isAssignedClassTeacher);
  const teacherReadAllowed = ["admin", "teacher", "staff", "accounts", "accountant", "audit"].includes(user.role);
  const studentReadAllowed = teacherReadAllowed || user.role === "student";
  const teacherAllowed = isAdmin || (user.role === "teacher" && isAssignedClassTeacher);
  const studentWriteAllowed = isAdmin || (user.role === "teacher" && isAssignedClassTeacher);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const freshData = await loadERPData(token);
      setData(freshData);
      cacheSave(freshData);
    } catch (err) {
      if (!silent) setError(getErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Serve cached data immediately so the UI is instant on revisit
    const cached = cacheLoad();
    if (cached) {
      setData(cached);
      setLoading(false);
      // Silently refresh in the background to pick up changes
      refresh({ silent: true });
    } else {
      refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load DB config for admin users
  useEffect(() => {
    if (user.role !== "admin") return;
    erpApi.getDbConfig(token)
      .then((res) => {
        setDbConfig(res.data?.config || null);
      })
      .catch(() => { /* non-fatal */ });
  }, [token, user.role]);

  // Load all user accounts when admin opens Settings
  useEffect(() => {
    if (activeView !== "settings" || user.role !== "admin") return;
    setAllUsersLoading(true);
    erpApi.getUsers(token)
      .then((res) => setAllUsers(res.data.users || []))
      .catch(() => {})
      .finally(() => setAllUsersLoading(false));
  }, [activeView, token, user.role]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("schoolManagerTheme", theme);
  }, [theme]);

  const classNames = useMemo(() => {
    const names = new Set(academicClassOptions.map((item) => item.className));
    data.classFees.forEach((item) => names.add(item.className));
    data.students.forEach((item) => names.add(item.className));
    data.routines.forEach((item) => names.add(item.className));
    const indexMap = new Map(academicClassOptions.map((item, i) => [item.className, i]));
    return [...names].filter(Boolean).sort((a, b) => {
      const ia = indexMap.has(a) ? indexMap.get(a) : 999;
      const ib = indexMap.has(b) ? indexMap.get(b) : 999;
      if (ia !== 999 || ib !== 999) return ia - ib;
      return a.localeCompare(b);
    });
  }, [data.classFees, data.students, data.routines]);

  const filteredStudents = useMemo(() => {
    return classFilter ? data.students.filter((student) => student.className === classFilter) : data.students;
  }, [classFilter, data.students]);

  const openModal = useCallback((type, row = null) => {
    setError("");
    setSuccess("");
    setEditingId(row?._id || "");

    if (type === "schoolSettings") {
      setForm({ ...emptyForms.schoolSettings, ...(data.schoolSettings || {}) });
      setModal(type);
      return;
    }

    if (type === "userSettings") {
      setForm({
        ...emptyForms.userSettings,
        name: user?.name || "",
        email: user?.email || "",
        photoUrl: user?.photoUrl || "",
      });
      // Load existing biometric credentials for this user
      api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data: me }) => setWebauthnCredentials(me.user?.webauthnCredentials || []))
        .catch(() => {});
      setWebauthnStatus("");
      setModal(type);
      return;
    }

    if (!row) {
      setForm(emptyForms[type]);
      setModal(type);
      return;
    }

    if (type === "classFee") {
      setForm({ className: row.className, admissionFee: row.admissionFee || 0, sessionFee: row.sessionFee || 0, monthlyFee: row.monthlyFee || 0, examFee: row.examFee || 0 });
    }
    if (type === "student") {
      setForm({
        name: row.name || "",
        classFee: row.classFee?._id || row.classFee || "",
        rollNumber: row.rollNumber || "",
        phone: row.contactInfo?.phone || "",
        email: row.contactInfo?.email || "",
        guardianName: row.contactInfo?.guardianName || "",
        address: row.contactInfo?.address || "",
        dateOfBirth: row.dateOfBirth ? toDateInput(row.dateOfBirth) : "",
        admissionDate: row.admissionDate ? toDateInput(row.admissionDate) : new Date().toISOString().slice(0, 10),
        status: row.status || "active",
        section: row.section?._id || row.section || "",
        gender: row.gender || "",
      });
    }
    if (type === "employee") {
      setForm({
        name: row.name || "",
        role: row.role || "teacher",
        salaryType: row.salaryType || "monthly",
        salaryAmount: row.salaryAmount || 0,
        phone: row.contactInfo?.phone || "",
        email: row.contactInfo?.email || "",
        address: row.contactInfo?.address || "",
        assignedClass: row.assignedClass || "",
        isClassTeacher: Boolean(row.isClassTeacher),
        subject: row.subject || "",
        joiningDate: toDateInput(row.joiningDate),
        status: row.status || "active",
      });
    }
    if (type === "payment") {
      setForm({
        student: row.student?._id || row.student || "",
        feeType: row.feeType || "monthly",
        amount: row.amount || 0,
        paidAmount: row.paidAmount || 0,
        billingMonth: row.billingMonth || currentMonth,
        term: row.term || "",
        note: row.note || "",
      });
    }
    if (type === "mark") {
      setForm({
        student: row.student?._id || row.student || "",
        subject: row.subject || "",
        academicYear: row.academicYear || year,
        examType: row.examType || "monthly",
        examNo: row.examNo || 1,
        month: row.month || currentMonth,
        totalMarks: row.totalMarks || 100,
        obtainedMarks: row.obtainedMarks || 0,
        contributionPercent: row.contributionPercent || 0,
        note: row.note || "",
      });
    }
    if (type === "routine") {
      setForm({
        className: row.className || "",
        day: row.day || "Saturday",
        startTime: row.startTime || "09:00",
        endTime: row.endTime || "10:00",
        subject: row.subject || "",
        teacherName: row.teacherName || "",
        room: row.room || "",
        status: row.status || "active",
        note: row.note || "",
      });
    }
    if (type === "increment") {
      setForm({
        employee: row.employee?._id || row.employee || "",
        previousSalary: row.previousSalary || 0,
        incrementAmount: row.incrementAmount || 0,
        newSalary: row.newSalary || 0,
        effectiveDate: toDateInput(row.effectiveDate),
        reason: row.reason || "",
      });
    }
    if (type === "attendance") {
      setForm({
        ...emptyForms.attendance,
        employee: row.employee?._id || row.employee || "",
        date: row.date || new Date().toISOString().slice(0, 10),
        checkIn: row.checkIn || "",
        checkOut: row.checkOut || "",
        status: row.status || "present",
        method: row.method || "manual",
        note: row.note || "",
      });
    }
    if (type === "expense") {
      setForm({
        ...emptyForms.expense,
        ...(row ? {
          title: row.title || "",
          category: row.category || "other",
          amount: row.amount || 0,
          date: row.date ? toDateInput(row.date) : new Date().toISOString().slice(0, 10),
          paidTo: row.paidTo || "",
          paymentMethod: row.paymentMethod || "cash",
          receiptNo: row.receiptNo || "",
          note: row.note || "",
        } : {}),
      });
    }
    if (type === "section") {
      setForm({
        className: row?.className || "",
        sectionName: row?.sectionName || "",
        classTeacher: row?.classTeacher?._id || row?.classTeacher || "",
        academicYear: row?.academicYear || year.toString(),
      });
    }
    if (type === "classroom") {
      setForm({
        roomNo: row?.roomNo || "",
        floor: row?.floor || "",
        benchCount: row?.benchCount ?? 0,
        studentCapacity: row?.studentCapacity ?? 0,
        notes: row?.notes || "",
        shifts: (row?.shifts || []).map((s) => ({
          shiftName: s.shiftName || "",
          className: s.className || "",
          section: s.section?._id || s.section || "",
          classTeacher: s.classTeacher?._id || s.classTeacher || "",
        })),
      });
    }
    setModal(type);
  }, [data.schoolSettings, user]);

  function showDoneAlert(message) {
    setSuccess(`Done! ${message}`);
    // Auto-dismiss after 4 seconds
    setTimeout(() => setSuccess(""), 4000);
  }

  const handleDelete = useCallback(async (type, id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    setError("");
    setSuccess("");
    try {
      // Operations with local state update (no full refresh needed)
      if (type === "attendance") {
        await erpApi.deleteAttendance(token, id);
        setData(prev => ({ ...prev, attendance: prev.attendance.filter(r => r._id !== id) }));
        showDoneAlert("Attendance record deleted.");
        return;
      }
      if (type === "section") {
        await erpApi.deleteSection(token, id);
        setData(prev => ({ ...prev, sections: prev.sections.filter(s => s._id !== id) }));
        showDoneAlert("Section deleted.");
        return;
      }
      if (type === "classroom") {
        await erpApi.deleteClassroom(token, id);
        setData(prev => ({ ...prev, classrooms: prev.classrooms.filter(c => c._id !== id) }));
        showDoneAlert("Classroom deleted.");
        return;
      }
      if (type === "expense") {
        await erpApi.deleteExpense(token, id);
        setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e._id !== id) }));
        showDoneAlert("Expense deleted.");
        return;
      }
      if (type === "routine") {
        await erpApi.deleteRoutine(token, id);
        setData(prev => ({ ...prev, routines: prev.routines.filter(r => r._id !== id) }));
        showDoneAlert("Class routine deleted.");
        return;
      }
      if (type === "mark") {
        await erpApi.deleteMark(token, id);
        // Marks affect markResults too — do a targeted refresh of just marks data
        const [marksRes, resultsRes] = await Promise.all([
          api.get("/api/marks", { headers: { Authorization: `Bearer ${token}` } }),
          api.get("/api/marks/results", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setData(prev => ({
          ...prev,
          marks: marksRes.data.marks || [],
          markResults: resultsRes.data.results || [],
        }));
        showDoneAlert("Mark deleted.");
        return;
      }
      // Targeted partial refreshes (only fetch what actually changed)
      if (type === "classFee") {
        await erpApi.deleteClassFee(token, id);
        const partial = await refreshPartialData(token, ["classFees"]);
        setData(prev => ({ ...prev, ...partial }));
        showDoneAlert("Class fee rule deleted.");
        return;
      }
      if (type === "student") {
        await erpApi.deleteStudent(token, id);
        const partial = await refreshPartialData(token, ["students", "payments", "dashboard"]);
        setData(prev => ({ ...prev, ...partial }));
        showDoneAlert("Student deleted.");
        return;
      }
      if (type === "employee") {
        await erpApi.deleteEmployee(token, id);
        const partial = await refreshPartialData(token, ["employees", "teacherUsers"]);
        setData(prev => ({ ...prev, ...partial }));
        showDoneAlert("Employee deleted.");
        return;
      }
      if (type === "increment") {
        await erpApi.deleteIncrement(token, id);
        const partial = await refreshPartialData(token, ["increments", "employees"]);
        setData(prev => ({ ...prev, ...partial }));
        showDoneAlert("Increment record deleted.");
        return;
      }
      showDoneAlert("Record deleted successfully.");
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [token, refresh]);

  const handleBiometricScan = useCallback(async () => {
    if (!biometricEmployee) return;
    setBiometricScanning(true);
    setBiometricResult(null);
    try {
      const { data } = await erpApi.biometricScan(token, { employee: biometricEmployee, deviceId: "TERMINAL-01" });
      setBiometricResult(data.attendance);
      const partial = await refreshPartialData(token, ["attendance"]);
      setData(prev => ({ ...prev, ...partial }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBiometricScanning(false);
    }
  }, [biometricEmployee, token, refresh]);

  async function handleEnrollBiometric(employeeId) {
    setEnrollLoading(employeeId);
    setEnrollStatus(null);
    try {
      const { data: options } = await erpApi.getEmployeeBiometricOptions(token, employeeId);
      const credential = await startRegistration({ optionsJSON: options });
      await erpApi.registerEmployeeBiometric(token, employeeId, { credential, deviceName: "Fingerprint Scanner" });
      setEnrollStatus({ success: true, message: "Biometric registered successfully! The employee can now use biometric check-in." });
      const partial = await refreshPartialData(token, ["employees"]);
      setData(prev => ({ ...prev, ...partial }));
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setEnrollStatus({ success: false, message: "Registration was cancelled or the device denied access." });
      } else {
        setEnrollStatus({ success: false, message: getErrorMessage(err) || "Registration failed." });
      }
    } finally {
      setEnrollLoading(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    let receiptWindow = null;
    if (modal === "payment" || modal === "salary") {
      receiptWindow = window.open("", "_blank", "width=820,height=720");
    }

    try {
      if (modal === "classFee") {
        editingId ? await erpApi.updateClassFee(token, editingId, form) : await erpApi.createClassFee(token, form);
        showDoneAlert(editingId ? "Class fee rule updated." : "Class fee rule created.");
      }
      if (modal === "student") {
        const payload = {
          name: form.name,
          classFee: form.classFee,
          rollNumber: form.rollNumber,
          status: form.status,
          section: form.section || null,
          gender: form.gender || "",
          contactInfo: { phone: form.phone, email: form.email, guardianName: form.guardianName, address: form.address },
          dateOfBirth: form.dateOfBirth,
          admissionDate: form.admissionDate,
        };
        editingId ? await erpApi.updateStudent(token, editingId, payload) : await erpApi.createStudent(token, payload);
        showDoneAlert(editingId ? "Student updated." : "Student added with admission and session fees.");
      }
      if (modal === "payment") {
        const { data: response } = editingId ? await erpApi.updatePayment(token, editingId, form) : await erpApi.createPayment(token, form);
        showDoneAlert(editingId ? "Student payment updated. Receipt opened for PDF/print." : "Student payment recorded. Receipt opened for PDF/print.");
        if (response.payment && !writePrintDocument(receiptWindow, studentPaymentReceiptHtml(response.payment, schoolSettings))) {
          setError("Popup was blocked. Use the PDF button in the payment ledger.");
        }
      }
      if (modal === "employee") {
        const payload = {
          name: form.name,
          role: form.role,
          salaryType: form.salaryType,
          salaryAmount: form.salaryAmount,
          assignedClass: form.assignedClass,
          isClassTeacher: form.role === "teacher" && Boolean(form.isClassTeacher),
          subject: form.subject,
          joiningDate: form.joiningDate,
          status: form.status,
          contactInfo: { phone: form.phone, email: form.email, address: form.address },
        };
        editingId ? await erpApi.updateEmployee(token, editingId, payload) : await erpApi.createEmployee(token, payload);
        showDoneAlert(editingId ? "Employee updated." : "Employee added.");
      }
      if (modal === "salary") {
        const { data: response } = await erpApi.createSalary(token, form);
        showDoneAlert("Salary payment recorded. Receipt opened for PDF/print.");
        if (response.salary && !writePrintDocument(receiptWindow, salaryPaymentReceiptHtml(response.salary, schoolSettings))) {
          setError("Popup was blocked. Use the PDF button in the salary ledger.");
        }
      }
      if (modal === "monthlyFees") {
        const { data: response } = await erpApi.generateMonthlyFees(token, form);
        showDoneAlert(`${response.created} monthly fee records generated.`);
      }
      if (modal === "examFees") {
        const { data: response } = await erpApi.generateExamFees(token, form);
        showDoneAlert(`${response.created} exam fee records generated.`);
      }
      if (modal === "monthlySalaries") {
        const { data: response } = await erpApi.generateSalaries(token, form);
        showDoneAlert(`${response.created} salary records generated.`);
      }
      if (modal === "mark") {
        const { data: markResp } = editingId
          ? await erpApi.updateMark(token, editingId, form)
          : await erpApi.createMark(token, form);
        // Re-fetch only marks + results (marks affect the auto-calculated result summary)
        const [marksRes, resultsRes] = await Promise.all([
          api.get("/api/marks", { headers: { Authorization: `Bearer ${token}` } }),
          api.get("/api/marks/results", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setData(prev => ({
          ...prev,
          marks: marksRes.data.marks || [],
          markResults: resultsRes.data.results || [],
        }));
        showDoneAlert(editingId ? "Mark updated." : "Mark entered.");
      }
      if (modal === "routine") {
        const { data: routineResp } = editingId
          ? await erpApi.updateRoutine(token, editingId, form)
          : await erpApi.createRoutine(token, form);
        const routine = routineResp.routine;
        if (routine) {
          setData(prev => ({
            ...prev,
            routines: editingId
              ? prev.routines.map(r => r._id === editingId ? routine : r)
              : [routine, ...prev.routines],
          }));
        }
        showDoneAlert(editingId ? "Class routine updated." : "Class routine created.");
      }
      if (modal === "increment") {
        editingId ? await erpApi.updateIncrement(token, editingId, form) : await erpApi.createIncrement(token, form);
        showDoneAlert(editingId ? "Salary increment updated." : "Salary increment recorded.");
      }
      if (modal === "attendance") {
        const { data: attResp } = editingId
          ? await erpApi.updateAttendance(token, editingId, form)
          : await erpApi.createAttendance(token, form);
        const record = attResp.attendance;
        if (record) {
          setData(prev => ({
            ...prev,
            attendance: editingId
              ? prev.attendance.map(r => r._id === editingId ? record : r)
              : [record, ...prev.attendance],
          }));
        }
        showDoneAlert(editingId ? "Attendance updated." : "Attendance marked.");
      }
      if (modal === "expense") {
        const { data: expResp } = editingId
          ? await erpApi.updateExpense(token, editingId, form)
          : await erpApi.createExpense(token, form);
        const expense = expResp.expense;
        if (expense) {
          setData(prev => ({
            ...prev,
            expenses: editingId
              ? prev.expenses.map(e => e._id === editingId ? expense : e)
              : [expense, ...prev.expenses],
          }));
        }
        showDoneAlert(editingId ? "Expense updated." : "Expense recorded.");
      }
      if (modal === "section") {
        const { data: secResp } = editingId
          ? await erpApi.updateSection(token, editingId, form)
          : await erpApi.createSection(token, form);
        // secResp is the section document directly (controller returns it unwrapped)
        if (secResp?._id) {
          setData(prev => ({
            ...prev,
            sections: editingId
              ? prev.sections.map(s => s._id === editingId ? secResp : s)
              : [...prev.sections, secResp].sort((a, b) =>
                  a.className.localeCompare(b.className) || a.sectionName.localeCompare(b.sectionName)
                ),
          }));
        }
        showDoneAlert(editingId ? "Section updated." : "Section created.");
      }
      if (modal === "classroom") {
        const payload = {
          roomNo: form.roomNo,
          floor: form.floor,
          benchCount: Number(form.benchCount) || 0,
          studentCapacity: Number(form.studentCapacity) || 0,
          notes: form.notes,
          shifts: (form.shifts || [])
            .filter((s) => s.shiftName.trim())
            .map((s) => ({
              shiftName: s.shiftName.trim(),
              className: s.className || "",
              section: s.section || null,
              classTeacher: s.classTeacher || null,
            })),
        };
        const { data: crResp } = editingId
          ? await erpApi.updateClassroom(token, editingId, payload)
          : await erpApi.createClassroom(token, payload);
        const classroom = crResp.classroom;
        if (classroom) {
          setData(prev => ({
            ...prev,
            classrooms: editingId
              ? prev.classrooms.map(c => c._id === editingId ? classroom : c)
              : [...prev.classrooms, classroom].sort((a, b) => String(a.roomNo).localeCompare(String(b.roomNo), undefined, { numeric: true })),
          }));
        }
        showDoneAlert(editingId ? "Classroom updated." : "Classroom created.");
      }
      if (modal === "schoolSettings") {
        await erpApi.updateSchoolSettings(token, form);
        // Update local state immediately — no server round-trip needed
        setData(prev => ({ ...prev, schoolSettings: { ...prev.schoolSettings, ...form } }));
        showDoneAlert("School settings updated.");
      }
      if (modal === "userSettings") {
        if (form.newPassword && form.newPassword !== form.confirmPassword) {
          throw new Error("New passwords do not match.");
        }
        const payload = {
          name: form.name,
          email: form.email,
          photoUrl: form.photoUrl,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        };
        const { data: response } = await erpApi.updateProfile(token, payload);
        onUserUpdate?.(response.user);
        showDoneAlert("Profile updated.");
      }

      setModal(null);
      setEditingId("");

      // Targeted partial refresh — only fetch what actually changed after this mutation.
      // This is much faster than reloading all 16 endpoints at once.
      const partialSlices = {
        classFee:         ["classFees"],
        student:          ["students", "payments", "dashboard"],
        payment:          ["payments", "students", "dashboard"],
        employee:         ["employees", "teacherUsers"],
        salary:           ["salaries", "employees"],
        monthlyFees:      ["payments", "students", "dashboard"],
        examFees:         ["payments", "students", "dashboard"],
        monthlySalaries:  ["salaries", "employees"],
        increment:        ["increments", "employees"],
      };
      // These update local state in-place above — no server re-fetch needed
      const noRefresh = ["attendance", "expense", "section", "classroom", "mark", "routine", "userSettings", "schoolSettings"];
      if (!noRefresh.includes(modal)) {
        const slices = partialSlices[modal];
        if (slices) {
          const partial = await refreshPartialData(token, slices);
          setData(prev => ({ ...prev, ...partial }));
        } else {
          // Unknown modal type — fall back to full refresh
          await refresh();
        }
      }
    } catch (err) {
      if (receiptWindow) receiptWindow.close();
      setError(getErrorMessage(err));
    }
  }

  async function handleSetUserPassword() {
    if (!userPasswordTarget) return;
    if (userPasswordForm.password !== userPasswordForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setUserPasswordLoading(true);
    setError("");
    setSuccess("");
    try {
      await erpApi.updateUser(token, userPasswordTarget._id, {
        name: userPasswordTarget.name,
        email: userPasswordTarget.email,
        role: userPasswordTarget.role,
        password: userPasswordForm.password,
      });
      setSuccess(`Password updated for ${userPasswordTarget.name}.`);
      setUserPasswordTarget(null);
      setUserPasswordForm({ password: "", confirmPassword: "" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUserPasswordLoading(false);
    }
  }

  const dashboardMetrics = useMemo(() => {
    let paidCollection = 0;
    let visibleDue = 0;
    let visibleDueRows = 0;
    for (const row of data.payments) {
      paidCollection += Number(row.paidAmount || 0);
      const due = Number(row.dueAmount || 0);
      visibleDue += due;
      if (due > 0) visibleDueRows += 1;
    }
    const totalBilled = paidCollection + visibleDue;

    let activeEmployees = 0;
    for (const e of data.employees) { if (e.status !== "inactive") activeEmployees += 1; }

    let activeStudents = 0;
    let dueStudents = 0;
    for (const s of data.students) {
      if (s.status !== "inactive") activeStudents += 1;
      if (Number(s.dueAmount || 0) > 0) dueStudents += 1;
    }

    let todayRoutineSlots = 0;
    for (const r of data.routines) { if (r.status !== "inactive") todayRoutineSlots += 1; }

    let totalSalaryDue = 0;
    for (const s of data.salaries) { totalSalaryDue += Number(s.dueAmount || 0); }

    return {
      activeEmployees,
      activeStudents,
      collectionRate: totalBilled ? Math.round((paidCollection / totalBilled) * 100) : 0,
      dueStudents,
      paidCollection,
      todayRoutineSlots,
      totalSalaryDue,
      visibleDue,
      visibleDueRows,
    };
  }, [data.employees, data.payments, data.routines, data.salaries, data.students]);
  const {
    activeEmployees,
    activeStudents,
    collectionRate,
    dueStudents,
    paidCollection,
    todayRoutineSlots,
    totalSalaryDue,
    visibleDue,
    visibleDueRows,
  } = dashboardMetrics;

  const schoolSettings = useMemo(() => data.schoolSettings || emptyForms.schoolSettings, [data.schoolSettings]);
  const resultCards = useMemo(() => {
    if (activeView !== "resultCards") return [];
    return buildResultCards(data.marks, data.students);
  }, [activeView, data.marks, data.students]);
  // Student IDs belonging to sections taught by the selected teacher
  const resultCardTeacherStudentIds = useMemo(() => {
    if (!resultCardFilter.teacher) return null;
    const teacherSections = data.sections.filter((s) => {
      const tid = s.classTeacher?._id || s.classTeacher;
      return String(tid) === String(resultCardFilter.teacher);
    });
    const sectionIds = new Set(teacherSections.map((s) => String(s._id)));
    const studentIds = new Set(
      data.students
        .filter((s) => {
          const sid = s.section?._id || s.section;
          return sid && sectionIds.has(String(sid));
        })
        .map((s) => String(s._id))
    );
    return studentIds;
  }, [resultCardFilter.teacher, data.sections, data.students]);

  const resultCardStudents = useMemo(() => {
    // When class or teacher filter active, restrict the student list
    let source = resultCards;
    if (resultCardFilter.class) source = source.filter((c) => c.student?.className === resultCardFilter.class);
    if (resultCardTeacherStudentIds) source = source.filter((c) => resultCardTeacherStudentIds.has(String(c.studentId)));
    const map = new Map();
    source.forEach((card) => {
      if (card.studentId && !map.has(card.studentId)) {
        map.set(card.studentId, card.student?.name || "Student");
      }
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [resultCards, resultCardFilter.class, resultCardTeacherStudentIds]);

  const resultCardExamOptions = useMemo(() => {
    let source = resultCardFilter.student
      ? resultCards.filter((card) => card.studentId === resultCardFilter.student)
      : resultCards;
    if (resultCardFilter.class && !resultCardFilter.student) source = source.filter((c) => c.student?.className === resultCardFilter.class);
    if (resultCardTeacherStudentIds && !resultCardFilter.student) source = source.filter((c) => resultCardTeacherStudentIds.has(String(c.studentId)));
    return source.map((card) => ({ id: card.id, label: `${card.student?.name || "Student"} - ${card.examLabel} (${card.academicYear})` }));
  }, [resultCards, resultCardFilter.student, resultCardFilter.class, resultCardTeacherStudentIds]);

  const visibleResultCards = useMemo(() => {
    return resultCards.filter((card) => {
      if (resultCardFilter.class && card.student?.className !== resultCardFilter.class) return false;
      if (resultCardTeacherStudentIds && !resultCardTeacherStudentIds.has(String(card.studentId))) return false;
      if (resultCardFilter.student && card.studentId !== resultCardFilter.student) return false;
      if (resultCardFilter.exam && card.id !== resultCardFilter.exam) return false;
      return true;
    });
  }, [resultCards, resultCardFilter, resultCardTeacherStudentIds]);

  function getSalaryAutoValues(employeeId, salaryMonth = currentMonth) {
    const employee = data.employees.find((item) => item._id === employeeId);
    const existing = data.salaries.find((item) => (item.employee?._id || item.employee) === employeeId && item.salaryMonth === salaryMonth);
    return {
      amount: existing?.amount ?? employee?.salaryAmount ?? 0,
      paidAmount: existing?.paidAmount ?? 0,
      dueAmount: existing?.dueAmount ?? (employee?.salaryAmount || 0),
      status: existing?.status || "unpaid",
    };
  }

  function getStudentFeeAutoValues(studentId, feeType, billingMonth = currentMonth, term = "") {
    const existing = data.payments.find((item) => {
      const sameStudent = (item.student?._id || item.student) === studentId;
      const sameType = item.feeType === feeType;
      const sameMonth = !billingMonth || !item.billingMonth || item.billingMonth === billingMonth;
      const sameTerm = !term || !item.term || item.term === term;
      return sameStudent && sameType && sameMonth && sameTerm;
    });
    return {
      amount: existing?.amount ?? 0,
      paidAmount: existing?.paidAmount ?? 0,
      dueAmount: existing?.dueAmount ?? 0,
      status: existing?.status || "unpaid",
    };
  }

  async function registerBiometric() {
    setWebauthnLoading(true);
    setWebauthnStatus("");
    try {
      const { data: options } = await api.get("/api/auth/webauthn/register-options", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const credential = await startRegistration({ optionsJSON: options });
      await api.post("/api/auth/webauthn/register",
        { credential, deviceName: "This Device" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setWebauthnStatus("success");
      // Refresh credentials list
      const { data: me } = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      setWebauthnCredentials(me.user?.webauthnCredentials || []);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setWebauthnStatus("cancelled");
      } else {
        setWebauthnStatus("error:" + (getErrorMessage(err) || "Registration failed."));
      }
    } finally {
      setWebauthnLoading(false);
    }
  }

  async function removeBiometric(credentialID) {
    try {
      await api.delete(`/api/auth/webauthn/credential/${encodeURIComponent(credentialID)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWebauthnCredentials((prev) => prev.filter((c) => c.credentialID !== credentialID));
    } catch (err) {
      setWebauthnStatus("error:" + (getErrorMessage(err) || "Could not remove credential."));
    }
  }

  function handleProfilePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > 1_200_000) {
      setError("Please upload an image smaller than 1.2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, photoUrl: String(reader.result || "") }));
    reader.onerror = () => setError("Could not read the image file.");
    reader.readAsDataURL(file);
  }

  const recentPaymentsColumns = useMemo(() => [
    { key: "student", label: "Student", search: (row) => row.student?.name, render: (row) => row.student?.name || "Student" },
    { key: "type", label: "Type", search: (row) => row.feeType, render: (row) => <span className="capitalize">{row.feeType}</span> },
    { key: "paid", label: "Paid", search: (row) => row.paidAmount, render: (row) => money.format(row.paidAmount || 0) },
    { key: "due", label: "Due", search: (row) => row.dueAmount, render: (row) => money.format(row.dueAmount || 0) },
  ], []);

  const studentsColumns = useMemo(() => [
    { key: "name", label: "Student", search: (row) => `${row.name} ${row.rollNumber} ${row.contactInfo?.email || ""}`, render: (row) => (
      <div>
        <strong>{row.name}</strong>
        <small>Roll {row.rollNumber}{row.gender ? ` · ${row.gender === "male" ? "♂ Boy" : row.gender === "female" ? "♀ Girl" : row.gender}` : ""}</small>
      </div>
    )},
    { key: "class", label: "Class / Section", search: (row) => `${row.className} ${row.section?.sectionName || ""}`, render: (row) => (
      <div>
        <span>{row.className}</span>
        {row.section?.sectionName && <small style={{display:"block",color:"var(--edu-muted)"}}>{row.section.sectionName}</small>}
      </div>
    )},
    { key: "guardian", label: "Guardian", search: (row) => row.contactInfo?.guardianName, render: (row) => row.contactInfo?.guardianName || "Not set" },
    { key: "phone", label: "Phone", search: (row) => row.contactInfo?.phone, render: (row) => row.contactInfo?.phone || "Not set" },
    { key: "due", label: "Due Payment", render: (row) => <strong className="danger-text">{money.format(row.dueAmount || 0)}</strong> },
    { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
    { key: "actions", label: "Actions", render: (row) => (
      <div className="action-row compact">
        <ActionButton icon="profile" label="View profile" onClick={() => setProfileStudent(row)} />
        {studentWriteAllowed && <ActionButton icon="edit" label="Edit student" onClick={() => openModal("student", row)} />}
        {isAdmin && <ActionButton icon="delete" label="Delete student" tone="danger" onClick={() => handleDelete("student", row._id)} />}
      </div>
    )},
  ], [openModal, handleDelete, isAdmin, studentWriteAllowed]);

  const classFeesColumns = useMemo(() => [
    { key: "className", label: "Class", render: (row) => <strong>{row.className}</strong> },
    { key: "admissionFee", label: "Admission", render: (row) => money.format(row.admissionFee || 0) },
    { key: "sessionFee", label: "Session", render: (row) => money.format(row.sessionFee || 0) },
    { key: "monthlyFee", label: "Monthly", render: (row) => money.format(row.monthlyFee || 0) },
    { key: "examFee", label: "Exam", render: (row) => money.format(row.examFee || 0) },
    { key: "actions", label: "Actions", render: (row) => financeAllowed && (
      <div className="action-row compact">
        <ActionButton icon="edit" label="Edit class rule" onClick={() => openModal("classFee", row)} />
        {isAdmin && <ActionButton icon="delete" label="Delete class rule" tone="danger" onClick={() => handleDelete("classFee", row._id)} />}
      </div>
    )},
  ], [openModal, handleDelete, isAdmin, financeAllowed]);

  const paymentsColumns = useMemo(() => [
    { key: "student", label: "Student", search: (row) => `${row.student?.name || ""} ${row.student?.rollNumber || ""} ${row.student?.className || ""} ${row.student?.contactInfo?.phone || ""}`, render: (row) => <div><strong>{row.student?.name || "Student"}</strong><small>ID/Roll {row.student?.rollNumber || "-"}</small></div> },
    { key: "feeType", label: "Type", search: (row) => row.feeType, render: (row) => <span className="capitalize">{row.feeType}</span> },
    { key: "amount", label: "Amount", render: (row) => money.format(row.amount || 0) },
    { key: "paid", label: "Paid", render: (row) => money.format(row.paidAmount || 0) },
    { key: "due", label: "Due", render: (row) => money.format(row.dueAmount || 0) },
    { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
    { key: "actions", label: "Actions", render: (row) => (
      <div className="action-row compact">
        <ActionButton icon="pdf" label="Download receipt PDF" onClick={() => {
          if (!downloadStudentPaymentReceipt(row, schoolSettings)) setError("Popup was blocked. Please allow popups and try again.");
        }} />
        {paymentWriteAllowed && <ActionButton icon="edit" label="Edit payment" onClick={() => openModal("payment", row)} />}
      </div>
    )},
  ], [openModal, paymentWriteAllowed, schoolSettings]);

  const employeesColumns = useMemo(() => [
    { key: "name", label: "Employee", render: (row) => <div><strong>{row.name}</strong><small className="capitalize">{row.role}</small></div> },
    { key: "assignment", label: "Assignment", render: (row) => row.role === "teacher" ? `${row.assignedClass || "No class"} / ${row.subject || "No subject"}` : "-" },
    { key: "classTeacher", label: "Class Teacher", render: (row) => row.isClassTeacher
      ? <span style={{ fontWeight: 600, color: "#4f46e5", fontSize: "13px" }}>{row.assignedClass || "Assigned"}</span>
      : <BooleanDot value={false} />
    },
    { key: "salaryType", label: "Salary Type", render: (row) => <span className="capitalize">{row.salaryType}</span> },
    { key: "salary", label: "Salary", render: (row) => money.format(row.salaryAmount || 0) },
    { key: "due", label: "Due Salary", render: (row) => <strong className="danger-text">{money.format(row.dueSalary || 0)}</strong> },
    { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
    { key: "actions", label: "Actions", render: (row) => financeAllowed && (
      <div className="action-row compact">
        <ActionButton icon="edit" label="Edit employee" onClick={() => openModal("employee", row)} />
        {isAdmin && <ActionButton icon="delete" label="Delete employee" tone="danger" onClick={() => handleDelete("employee", row._id)} />}
      </div>
    )},
  ], [openModal, handleDelete, isAdmin, financeAllowed]);

  const classTeachersColumns = useMemo(() => [
    { key: "name", label: "Teacher", search: (row) => `${row.name} ${row.contactInfo?.email || ""}`, render: (row) => <div><strong>{row.name}</strong><small>{row.contactInfo?.email || "No email"}</small></div> },
    { key: "class", label: "Assigned Class", search: (row) => row.assignedClass, render: (row) => row.assignedClass || "Not assigned" },
    { key: "subject", label: "Subject", search: (row) => row.subject, render: (row) => row.subject || "-" },
    { key: "phone", label: "Phone", search: (row) => row.contactInfo?.phone, render: (row) => row.contactInfo?.phone || "-" },
    { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
    { key: "actions", label: "Actions", render: (row) => financeAllowed && (
      <div className="action-row compact">
        <ActionButton icon="edit" label="Edit teacher assignment" onClick={() => openModal("employee", row)} />
      </div>
    )},
  ], [financeAllowed, openModal]);

  const marksColumns = useMemo(() => [
    { key: "student", label: "Student", render: (row) => row.student?.name || "Student" },
    { key: "class", label: "Class", render: (row) => row.className },
    { key: "subject", label: "Subject", render: (row) => row.subject },
    { key: "type", label: "Exam", render: (row) => <span className="capitalize">{row.examType?.replace("_", " ")} #{row.examNo}</span> },
    { key: "marks", label: "Marks", render: (row) => `${row.obtainedMarks}/${row.totalMarks}` },
    { key: "percentage", label: "Percentage", render: (row) => `${row.percentage || Math.round((row.obtainedMarks / row.totalMarks) * 100)}%` },
    { key: "percent", label: "Contribution", render: (row) => `${row.contributionPercent}%` },
    { key: "score", label: "Final Score", render: (row) => `${row.weightedScore}%` },
    { key: "actions", label: "Actions", render: (row) => teacherAllowed && (
      <div className="action-row compact">
        <ActionButton icon="edit" label="Edit mark" onClick={() => openModal("mark", row)} />
        <ActionButton icon="delete" label="Delete mark" tone="danger" onClick={() => handleDelete("mark", row._id)} />
      </div>
    )},
  ], [teacherAllowed, openModal, handleDelete]);

  const markResultsColumns = useMemo(() => [
    { key: "student", label: "Student", render: (row) => row.student?.name || "Student" },
    { key: "class", label: "Class", render: (row) => row.className },
    { key: "subject", label: "Subject", render: (row) => row.subject },
    { key: "year", label: "Year", render: (row) => row.academicYear },
    { key: "exams", label: "Records", render: (row) => `${row.examsCount} records` },
    { key: "mix", label: "Exam Mix", render: (row) => `M:${row.monthlyCount || 0} S:${row.semesterCount || 0} CT:${row.classTestCount || 0}` },
    { key: "marks", label: "Raw Marks", render: (row) => `${row.totalObtainedMarks}/${row.totalMarks}` },
    { key: "weight", label: "Contribution Used", render: (row) => `${row.totalContributionPercent}%` },
    { key: "final", label: "Final Result", render: (row) => <strong>{row.finalResultPercent}%</strong> },
    { key: "grade", label: "Grade", render: (row) => <GradeBadge grade={row.grade} /> },
    { key: "resultStatus", label: "Status", render: (row) => <ResultStatus status={row.resultStatus} /> },
  ], []);

  const routinesColumns = useMemo(() => [
    { key: "class", label: "Class", render: (row) => row.className },
    { key: "day", label: "Day", render: (row) => row.day },
    { key: "time", label: "Time", render: (row) => `${row.startTime} - ${row.endTime}` },
    { key: "subject", label: "Subject", render: (row) => row.subject },
    { key: "teacher", label: "Teacher", render: (row) => row.teacherName },
    { key: "room", label: "Room", render: (row) => row.room || "-" },
    { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
    { key: "actions", label: "Actions", render: (row) => teacherAllowed && (
      <div className="action-row compact">
        <ActionButton icon="edit" label="Edit routine" onClick={() => openModal("routine", row)} />
        <ActionButton icon="delete" label="Delete routine" tone="danger" onClick={() => handleDelete("routine", row._id)} />
      </div>
    )},
  ], [teacherAllowed, openModal, handleDelete]);

  const salariesColumns = useMemo(() => [
    { key: "employee", label: "Employee", render: (row) => row.employee?.name || "Employee" },
    { key: "month", label: "Month", render: (row) => row.salaryMonth },
    { key: "amount", label: "Amount", render: (row) => money.format(row.amount || 0) },
    { key: "paid", label: "Paid", render: (row) => money.format(row.paidAmount || 0) },
    { key: "due", label: "Due", render: (row) => money.format(row.dueAmount || 0) },
    { key: "status", label: "Status", render: (row) => <Status status={row.status} /> },
    { key: "actions", label: "PDF", render: (row) => (
      <ActionButton icon="pdf" label="Download salary receipt PDF" onClick={() => {
        if (!downloadSalaryPaymentReceipt(row, schoolSettings)) setError("Popup was blocked. Please allow popups and try again.");
      }} />
    )},
  ], [schoolSettings]);

  const incrementsColumns = useMemo(() => [
    { key: "employee", label: "Employee", render: (row) => row.employee?.name || "Employee" },
    { key: "previous", label: "Previous", render: (row) => money.format(row.previousSalary || 0) },
    { key: "increment", label: "Increment", render: (row) => money.format(row.incrementAmount || 0) },
    { key: "new", label: "New Salary", render: (row) => money.format(row.newSalary || 0) },
    { key: "date", label: "Effective", render: (row) => toDateInput(row.effectiveDate) },
    { key: "reason", label: "Reason", render: (row) => row.reason || "-" },
    { key: "actions", label: "Actions", render: (row) => financeAllowed && (
      <div className="action-row compact">
        <ActionButton icon="edit" label="Edit increment" onClick={() => openModal("increment", row)} />
        {isAdmin && <ActionButton icon="delete" label="Delete increment" tone="danger" onClick={() => handleDelete("increment", row._id)} />}
      </div>
    )},
  ], [financeAllowed, openModal, handleDelete, isAdmin]);

  const renderDashboard = () => (
    <div className="stack dashboard-stack">
      <section className="dashboard-hero panel overflow-hidden border border-white/70 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div>
          <p className="eyebrow text-blue-100">Dashboard</p>
          <h1 className="text-white">Welcome back, {user?.name || "User"}.</h1>
          <p className="hero-copy text-blue-100">Manage students, fees, marks, routines, and reports from one place.</p>
          <div className="hero-actions flex flex-wrap gap-3">
            {studentWriteAllowed && (
              <button className="btn primary hero-btn" type="button" onClick={() => openModal("student")}>
                <DashboardIcon name="addUser" className="btn-icon" />
                <span>Add Student</span>
              </button>
            )}
            {teacherAllowed && (
              <button className="btn soft hero-btn" type="button" onClick={() => openModal("mark")}>
                <DashboardIcon name="clipboard" className="btn-icon" />
                <span>Enter Marks</span>
              </button>
            )}
            {paymentWriteAllowed && (
              <button className="btn warn hero-btn" type="button" onClick={() => openModal("payment")}>
                <DashboardIcon name="wallet" className="btn-icon" />
                <span>Record Payment</span>
              </button>
            )}
          </div>
        </div>
        <div className="hero-score-card collection-card border border-white/25 bg-white/15 text-white shadow-2xl backdrop-blur-xl">
          <div className="collection-copy">
            <span>Collection Rate</span>
            <strong>{collectionRate}%</strong>
            <small><b>{money.format(paidCollection)} collected</b><em>•</em>{money.format(visibleDue)} visible due</small>
          </div>
          <div className="collection-ring" style={{ "--rate": `${collectionRate}%` }}>
            <DashboardIcon name="wallet" />
          </div>
        </div>
      </section>

      <div className="stats-grid premium-stats">
        <StatCard icon="student" label="Active Students" tone="blue" value={activeStudents || data.dashboard.totalStudents || 0} helper={`${data.students.length} total records`} />
        <StatCard icon="due" label="Students With Due" tone="orange" value={dueStudents} helper={visibleDue ? `${money.format(visibleDue)} pending` : "No visible due"} />
        {financeAllowed && <StatCard icon="wallet" label="Collected Fees" tone="amber" value={money.format(data.dashboard.totalIncome || paidCollection || 0)} helper={`${collectionRate}% collection rate`} />}
        <StatCard icon="eye" label="Visible Fee Due" tone="green" value={money.format(visibleDue)} helper={`${visibleDueRows} due payment records`} />
        <StatCard icon="marks" label="Marks Entered" tone="violet" value={data.marks.length} helper={`${resultCards.length} result cards ready`} />
        <StatCard icon="calendar" label="Active Routine Slots" tone="pink" value={todayRoutineSlots} helper="Live routine entries" />
        <StatCard icon="employees" label="Employees" tone="cyan" value={activeEmployees || data.dashboard.totalEmployees || 0} helper={`${data.employees.length} staff profiles`} />
      </div>

      <section className="quick-action-grid">
        <article className="quick-card border border-white/70 bg-white/80 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <span className="quick-icon tone-blue"><DashboardIcon name="student" /></span>
          <small className="quick-kicker">01 • Student Hub</small>
          <h3>Student Hub</h3>
          <p>Filter by class, view profiles, dues, marks, and results.</p>
          <button className="btn soft" type="button" onClick={() => setActiveView("students")}>Open Students</button>
        </article>
        <article className="quick-card border border-white/70 bg-white/80 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <span className="quick-icon tone-violet"><DashboardIcon name="marks" /></span>
          <small className="quick-kicker">02 • Academic Flow</small>
          <h3>Academic Flow</h3>
          <p>Enter marks and prepare routine without clutter.</p>
          <button className="btn soft" type="button" onClick={() => setActiveView("marks")}>Open Marks</button>
        </article>
        <article className="quick-card highlight border border-blue-500/20 shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
          <span className="quick-icon tone-amber"><DashboardIcon name="wallet" /></span>
          <small className="quick-kicker">03 • Finance Control</small>
          <h3>Finance Control</h3>
          <p>Generate fees, record payments, and track salary.</p>
          <button className="btn dark" type="button" onClick={() => setActiveView("fees")}>Open Fees</button>
        </article>
      </section>

      <DataTable
        title="Recent Payments"
        subtitle="Latest visible transactions and dues"
        searchPlaceholder="Search by student, type, amount..."
        columns={[
          { key: "student", label: "Student", search: (row) => row.student?.name, render: (row) => row.student?.name || "Student" },
          { key: "type", label: "Type", search: (row) => row.feeType, render: (row) => <span className="capitalize">{row.feeType}</span> },
          { key: "paid", label: "Paid", search: (row) => row.paidAmount, render: (row) => money.format(row.paidAmount || 0) },
          { key: "due", label: "Due", search: (row) => row.dueAmount, render: (row) => money.format(row.dueAmount || 0) },
        ]}
        rows={data.dashboard.recentPayments || []}
      />

      <section className="market-snapshot quick-summary-card panel" aria-label="Dashboard quick summary">
        <div className="quick-summary-copy">
          <p className="eyebrow">Quick Summary</p>
          <h3>Simple school operations</h3>
          <p>Core records are ready for daily school work.</p>
        </div>
        <div className="snapshot-list">
          {quickImprovements.map((item) => <span key={item}><DashboardIcon name="check" className="snapshot-icon" /> <strong>{item}</strong></span>)}
        </div>
      </section>
    </div>
  );


  const renderStudents = () => (
    <>
      <SectionHeader
        eyebrow="Student Management"
        title="Student Profiles and Details"
        action={(
          <>
            <select className="control small" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="">All classes</option>
              {classNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            {studentWriteAllowed && <button className="btn primary" type="button" onClick={() => openModal("student")}>Add Student</button>}
          </>
        )}
      />
      <DataTable
        columns={studentsColumns}
        rows={filteredStudents}
      />
    </>
  );

  const renderFees = () => (
    <div className="stack">
      <SectionHeader
        eyebrow="Fee Management"
        title="Class Fee Rules and Payment Ledger"
        action={(financeAllowed || paymentWriteAllowed) && (
          <>
            {financeAllowed && <button className="btn primary" type="button" onClick={() => openModal("classFee")}>Add Class Rule</button>}
            {financeAllowed && <button className="btn dark" type="button" onClick={() => openModal("monthlyFees")}>Generate Monthly</button>}
            {financeAllowed && <button className="btn warn" type="button" onClick={() => openModal("examFees")}>Generate Exam</button>}
            {paymentWriteAllowed && <button className="btn success" type="button" onClick={() => openModal("payment")}>Record Payment</button>}
          </>
        )}
      />
      <DataTable columns={classFeesColumns} rows={data.classFees} />
      <DataTable columns={paymentsColumns} rows={data.payments} />
    </div>
  );

  const renderEmployees = () => {
    // ── Stats computation ────────────────────────────────────────────────────
    const roleGroups = data.employees.reduce((acc, e) => {
      const role = e.role || "other";
      if (!acc[role]) acc[role] = [];
      acc[role].push(e);
      return acc;
    }, {});

    const teachers       = roleGroups["teacher"]    || [];
    const classTeachers  = teachers.filter((t) => t.isClassTeacher);
    const nonTeachers    = data.employees.filter((e) => e.role !== "teacher");
    const activeAll      = data.employees.filter((e) => e.status !== "inactive");
    const totalSalaryBill = data.employees.reduce((s, e) => s + Number(e.salaryAmount || 0), 0);
    const totalSalaryDueNow = data.employees.reduce((s, e) => s + Number(e.dueSalary || 0), 0);

    // Distinct roles sorted by count desc
    const roleSummary = Object.entries(roleGroups)
      .map(([role, list]) => ({
        role,
        total: list.length,
        active: list.filter((e) => e.status !== "inactive").length,
        totalSalary: list.reduce((s, e) => s + Number(e.salaryAmount || 0), 0),
      }))
      .sort((a, b) => b.total - a.total);

    // Class assignment distribution for teachers
    const classTeacherMap = classTeachers.reduce((acc, t) => {
      const cls = t.assignedClass || "Unassigned";
      if (!acc[cls]) acc[cls] = [];
      acc[cls].push(t);
      return acc;
    }, {});

    return (
      <div className="stack">
        <SectionHeader
          eyebrow="People"
          title="Employees & Teaching Staff"
          action={financeAllowed && <button className="btn primary" type="button" onClick={() => openModal("employee")}>Add Employee</button>}
        />

        {/* ── Top stat cards ── */}
        <div className="stats-grid">
          <StatCard icon="employees" label="Total Staff"    tone="blue"   value={data.employees.length} helper={`${activeAll.length} active`} />
          <StatCard icon="student"   label="Teachers"       tone="violet" value={teachers.length}        helper={`${classTeachers.length} class teachers`} />
          <StatCard icon="clipboard" label="Other Staff"    tone="cyan"   value={nonTeachers.length}     helper={`Admin, accounts, support`} />
          {financeAllowed && <StatCard icon="wallet" label="Monthly Salary Bill" tone="amber" value={money.format(totalSalaryBill)} helper={totalSalaryDueNow > 0 ? `${money.format(totalSalaryDueNow)} salary due` : "No pending salary"} />}
        </div>

        {/* ── Role breakdown grid ── */}
        <div className="table-card smart-table-card">
          <div className="table-toolbar">
            <div>
              <h3 style={{margin:0}}>Staff Breakdown by Role</h3>
              <p style={{margin:"2px 0 0",fontSize:"13px",color:"var(--edu-muted)"}}>
                {roleSummary.length} distinct roles · {data.employees.length} total
              </p>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"10px",padding:"0 0 12px"}}>
            {roleSummary.map(({ role, total, active, totalSalary }) => (
              <div key={role} style={{padding:"12px 16px",background:"var(--edu-bg-alt,#f8fafc)",borderRadius:"10px",border:"1px solid var(--edu-border)"}}>
                <p style={{fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--edu-muted)",margin:"0 0 4px",display:"flex",alignItems:"center",gap:"6px"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background: role === "teacher" ? "#6366f1" : role === "admin" ? "#2563eb" : role === "accountant" || role === "accounts" ? "#f59e0b" : "#10b981",flexShrink:0,display:"inline-block"}} />
                  {role}
                </p>
                <p style={{fontSize:"22px",fontWeight:800,margin:"0 0 2px"}}>{total}</p>
                <p style={{fontSize:"12px",color:"var(--edu-muted)",margin:0}}>
                  {active} active{financeAllowed && totalSalary > 0 ? ` · ${money.format(totalSalary)}/mo` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Class teacher assignments ── */}
        {classTeachers.length > 0 && (
          <div className="table-card smart-table-card">
            <div className="table-toolbar">
              <div>
                <h3 style={{margin:0}}>Class Teacher Assignments</h3>
                <p style={{margin:"2px 0 0",fontSize:"13px",color:"var(--edu-muted)"}}>
                  {classTeachers.length} teachers with class access · {teachers.length - classTeachers.length} subject teachers only
                </p>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"10px",padding:"0 0 12px"}}>
              {Object.entries(classTeacherMap).sort(([a], [b]) => {
                const ia = academicClassOptions.findIndex((c) => c.className === a);
                const ib = academicClassOptions.findIndex((c) => c.className === b);
                return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
              }).map(([cls, list]) => (
                <div key={cls} style={{padding:"10px 14px",background:"var(--edu-bg-alt,#f8fafc)",borderRadius:"10px",border:"1px solid var(--edu-border)"}}>
                  <p style={{fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--edu-primary,#2563eb)",margin:"0 0 6px"}}>{cls}</p>
                  {list.map((t) => (
                    <div key={t._id} style={{fontSize:"13px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2px"}}>
                      <span><strong>{t.name}</strong> <small style={{color:"var(--edu-muted)"}}>{t.subject ? `· ${t.subject}` : ""}</small></span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Full employee table ── */}
        <DataTable columns={employeesColumns} rows={data.employees} />
      </div>
    );
  };

  const renderClassTeachers = () => (
    <div className="stack">
      <SectionHeader
        eyebrow="Class Teacher Control"
        title="Assigned Class Teachers"
        action={financeAllowed && <button className="btn primary" type="button" onClick={() => openModal("employee")}>Assign Teacher</button>}
      />
      <div className="business-rules-grid">
        <article className="info-card"><h3>Scoped Access</h3><p>Class teachers can see and update only students, payments, marks, and result cards from their assigned class.</p></article>
        <article className="info-card"><h3>Subject Teachers</h3><p>Teachers without class-teacher assignment stay out of full class records by default.</p></article>
      </div>
      <DataTable
        columns={classTeachersColumns}
        rows={data.employees.filter((employee) => employee.role === "teacher" && employee.isClassTeacher)}
        searchPlaceholder="Search by teacher, class, subject, email..."
      />
    </div>
  );

  const renderSections = () => {
    const sectionsColumns = [
      { key: "className", label: "Class", render: (row) => <strong>{row.className}</strong> },
      { key: "sectionName", label: "Section", render: (row) => (
        <span style={{ fontWeight: 600, padding: "2px 10px", borderRadius: "999px", background: "var(--edu-bg-alt,#f1f5f9)", border: "1px solid var(--edu-border)", fontSize: "13px" }}>{row.sectionName}</span>
      )},
      { key: "students", label: "Students", render: (row) => {
        const count = data.students.filter((s) => {
          const sid = s.section?._id || s.section;
          return sid && String(sid) === String(row._id);
        }).length;
        const byClass = data.students.filter((s) => s.className === row.className).length;
        return (
          <span title={`${byClass} total in ${row.className}`}>
            <strong style={{fontSize:"15px"}}>{count}</strong>
            <small style={{color:"var(--edu-muted)",marginLeft:"4px"}}>/{byClass} in class</small>
          </span>
        );
      }},
      { key: "classTeacher", label: "Class Teacher", search: (row) => row.classTeacher?.name || "", render: (row) => row.classTeacher ? (
        <span><strong>{row.classTeacher.name}</strong><br /><small style={{color:"var(--edu-muted)"}}>{row.classTeacher.email}</small></span>
      ) : <span style={{color:"var(--edu-muted)"}}>Not assigned</span> },
      { key: "academicYear", label: "Year", render: (row) => row.academicYear },
      { key: "actions", label: "Actions", render: (row) => (
        <div className="action-row compact">
          <ActionButton icon="edit" label="Edit section" onClick={() => openModal("section", row)} />
          <ActionButton icon="delete" label="Delete section" tone="danger" onClick={() => handleDelete("section", row._id)} />
        </div>
      )},
    ];
    return (
      <div className="stack">
        <SectionHeader
          eyebrow="Class Management"
          title="Class Sections & Teacher Assignments"
          action={<button className="btn primary" type="button" onClick={() => openModal("section")}>+ Add Section</button>}
        />
        <div className="business-rules-grid">
          <article className="info-card">
            <h3>What is a Section?</h3>
            <p>A section divides a class into groups (e.g., Class 5 – Section A, Section B). Each section has one class teacher who manages marks and students for that section.</p>
          </article>
          <article className="info-card">
            <h3>Teacher Access</h3>
            <p>When a teacher is assigned to a section, they can log in and see their section in the Marks view. They can input marks for students in their class.</p>
          </article>
        </div>
        <DataTable
          columns={sectionsColumns}
          rows={data.sections}
          searchPlaceholder="Search by class, section, or teacher..."
        />
      </div>
    );
  };

  const renderClassrooms = () => {
    const classroomColumns = [
      { key: "roomNo", label: "Room No", render: (row) => <strong style={{fontSize:"16px"}}>{row.roomNo}</strong> },
      { key: "floor", label: "Floor", render: (row) => row.floor || "—" },
      { key: "benchCount", label: "Benches", render: (row) => (
        <span title="Number of benches in room">{row.benchCount || 0}</span>
      )},
      { key: "studentCapacity", label: "Capacity", render: (row) => (
        <span title="Max students the room can hold">{row.studentCapacity || 0}</span>
      )},
      { key: "currentStudents", label: "Current Students", render: (row) => {
        const count = row.currentStudents ?? 0;
        const cap = row.studentCapacity || 0;
        const pct = cap > 0 ? Math.round((count / cap) * 100) : 0;
        const color = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#10b981";
        return (
          <span title={`${pct}% of capacity`}>
            <strong style={{fontSize:"15px", color}}>{count}</strong>
            {cap > 0 && <small style={{color:"var(--edu-muted)",marginLeft:"4px"}}>/{cap}</small>}
          </span>
        );
      }},
      { key: "shifts", label: "Shifts / Assignments", search: (row) => row.shifts?.map((s) => `${s.shiftName} ${s.className} ${s.classTeacher?.name || ""}`).join(" "), render: (row) => (
        <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
          {(row.shifts || []).length === 0
            ? <span style={{color:"var(--edu-muted)",fontSize:"13px"}}>No shifts assigned</span>
            : (row.shifts || []).map((s, i) => (
              <div key={i} style={{fontSize:"12px",lineHeight:"1.4"}}>
                <strong style={{color:"var(--edu-primary,#2563eb)"}}>{s.shiftName}</strong>
                {s.className && <> · {s.className}</>}
                {s.section?.sectionName && <> ({s.section.sectionName})</>}
                {s.classTeacher?.name && <> · <span style={{color:"var(--edu-muted)"}}>{s.classTeacher.name}</span></>}
              </div>
            ))
          }
        </div>
      )},
      { key: "notes", label: "Notes", render: (row) => <span style={{color:"var(--edu-muted)",fontSize:"13px"}}>{row.notes || "—"}</span> },
      { key: "actions", label: "Actions", render: (row) => (
        <div className="action-row compact">
          <ActionButton icon="edit" label="Edit classroom" onClick={() => openModal("classroom", row)} />
          <ActionButton icon="delete" label="Delete classroom" tone="danger" onClick={() => handleDelete("classroom", row._id)} />
        </div>
      )},
    ];

    return (
      <div className="stack">
        <SectionHeader
          eyebrow="Facility Management"
          title="Classrooms & Room Assignments"
          action={<button className="btn primary" type="button" onClick={() => openModal("classroom")}>+ Add Room</button>}
        />
        <div className="business-rules-grid">
          <article className="info-card">
            <h3>Room Management</h3>
            <p>Track each physical classroom — room number, floor, bench count, and student capacity. One room can hold multiple shifts (Morning, Day, Evening) with different classes and teachers.</p>
          </article>
          <article className="info-card">
            <h3>Shift System</h3>
            <p>Assign class sections to time shifts within each room. Link a class teacher to each shift. Current student count is calculated from students enrolled in the assigned sections.</p>
          </article>
        </div>
        <DataTable
          columns={classroomColumns}
          rows={data.classrooms}
          searchPlaceholder="Search by room, floor, class, or teacher..."
        />
      </div>
    );
  };

  const renderClasswiseResults = () => {
    // Build class→students map
    const studentsByClass = new Map();
    data.students.forEach((s) => {
      const cls = s.className || "Unknown";
      if (!studentsByClass.has(cls)) studentsByClass.set(cls, []);
      studentsByClass.get(cls).push(s);
    });

    // Gather all unique exam labels per class
    const resultsByStudent = new Map();
    data.markResults.forEach((r) => {
      const sid = r.student?._id || r.student;
      if (!resultsByStudent.has(sid)) resultsByStudent.set(sid, []);
      resultsByStudent.get(sid).push(r);
    });

    // Build per-class result cards from marks
    const allResultCards = buildResultCards(data.marks, data.students);

    // Group result cards by class
    const cardsByClass = new Map();
    allResultCards.forEach((card) => {
      const cls = card.student?.className || card.className || "Unknown";
      if (!cardsByClass.has(cls)) cardsByClass.set(cls, []);
      cardsByClass.get(cls).push(card);
    });

    // For teacher role, filter to only their assigned section's class
    const teacherSectionClasses = user.role === "teacher"
      ? new Set(data.sections.filter((s) => {
          const tid = s.classTeacher?._id || s.classTeacher;
          return tid === user.id;
        }).map((s) => s.className))
      : null;

    const classKeys = [...new Set([...studentsByClass.keys(), ...cardsByClass.keys()])]
      .filter((cls) => !teacherSectionClasses || teacherSectionClasses.has(cls))
      .sort((a, b) => {
        const indexMap = new Map(academicClassOptions.map((item, i) => [item.className, i]));
        const ia = indexMap.has(a) ? indexMap.get(a) : 999;
        const ib = indexMap.has(b) ? indexMap.get(b) : 999;
        if (ia !== ib) return ia - ib;
        return a.localeCompare(b);
      });

    if (classKeys.length === 0) {
      return (
        <div className="stack">
          <SectionHeader eyebrow="Class Results" title="Classwise Academic Results" />
          <div className="info-card"><h3>No data yet</h3><p>Add students and enter marks to see classwise results here.</p></div>
        </div>
      );
    }

    const filteredClassKeys = classwiseClassFilter ? classKeys.filter((k) => k === classwiseClassFilter) : classKeys;

    return (
      <div className="stack">
        <SectionHeader
          eyebrow="Class Results"
          title="Classwise Academic Results"
          action={(
            <select className="control small" value={classwiseClassFilter} onChange={(e) => setClasswiseClassFilter(e.target.value)}>
              <option value="">All classes</option>
              {classKeys.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
        />
        {filteredClassKeys.map((cls) => {
          const students = studentsByClass.get(cls) || [];
          const cards = cardsByClass.get(cls) || [];

          // Get unique exams for this class
          const examSet = new Map();
          cards.forEach((c) => {
            if (!examSet.has(c.examLabel)) examSet.set(c.examLabel, c);
          });
          const exams = [...examSet.keys()];

          // Per-exam stats
          const examStats = exams.map((exam) => {
            const examCards = cards.filter((c) => c.examLabel === exam);
            const passCount = examCards.filter((c) => c.resultStatus === "Pass").length;
            const avgPct = examCards.length ? (examCards.reduce((s, c) => s + Number(c.percentage || 0), 0) / examCards.length).toFixed(1) : "0.0";
            const top = examCards[0];
            return { exam, count: examCards.length, passCount, avgPct, top };
          });

          // Sections for this class
          const classSections = data.sections.filter((s) => s.className === cls);

          return (
            <div key={cls} className="table-card smart-table-card">
              <div className="table-toolbar">
                <div>
                  <h3 style={{margin:0}}>{cls}</h3>
                  <p style={{margin:"2px 0 0",fontSize:"13px",color:"var(--edu-muted)"}}>{students.length} student{students.length !== 1 ? "s" : ""}{classSections.length > 0 ? ` • Sections: ${classSections.map((s) => s.sectionName).join(", ")}` : ""}</p>
                </div>
                {teacherAllowed && <button className="btn soft" type="button" onClick={() => { setForm({ ...emptyForms.mark, student: "" }); openModal("mark"); }}>Enter Marks</button>}
              </div>

              {examStats.length > 0 && (
                <div style={{padding:"0 0 12px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"10px",borderBottom:"1px solid var(--edu-border)",margin:"0 0 0"}}>
                  {examStats.map((es) => (
                    <div key={es.exam} style={{padding:"10px 14px",background:"var(--edu-bg-alt,#f8fafc)",borderRadius:"10px",border:"1px solid var(--edu-border)"}}>
                      <p style={{fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--edu-muted)",margin:"0 0 4px"}}>{es.exam}</p>
                      <p style={{fontSize:"20px",fontWeight:800,margin:"0 0 2px"}}>{es.avgPct}%</p>
                      <p style={{fontSize:"12px",color:"var(--edu-muted)",margin:0}}>Avg • {es.passCount}/{es.count} passed{es.top ? ` • Top: ${es.top.student?.name || "—"}` : ""}</p>
                    </div>
                  ))}
                </div>
              )}

              {students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Roll</th>
                        {exams.slice(0, 4).map((ex) => <th key={ex}>{ex}</th>)}
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => {
                        const sCards = cards.filter((c) => (c.studentId === s._id) || (c.student?._id === s._id));
                        return (
                          <tr key={s._id}>
                            <td><strong>{s.name}</strong></td>
                            <td>{s.rollNumber || "—"}</td>
                            {exams.slice(0, 4).map((ex) => {
                              const card = sCards.find((c) => c.examLabel === ex);
                              return (
                                <td key={ex}>
                                  {card ? (
                                    <span title={`${card.obtainedMarks}/${card.totalMarks}`}>
                                      <GradeBadge grade={card.grade} /> {card.percentage}%
                                    </span>
                                  ) : <span style={{color:"var(--edu-muted)"}}>—</span>}
                                </td>
                              );
                            })}
                            <td>
                              {sCards.length > 0 ? (
                                sCards.every((c) => c.resultStatus === "Pass")
                                  ? <span className="status dot-status active">Pass</span>
                                  : <span className="status dot-status inactive">Fail</span>
                              ) : <span style={{color:"var(--edu-muted)"}}>No marks</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{padding:"14px",color:"var(--edu-muted)",fontSize:"14px"}}>No students in this class yet.</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Derived marks filter data — computed at component level so no hook-in-render violation
  const sectionsForMarksClass = marksClassFilter
    ? data.sections.filter((s) => s.className === marksClassFilter)
    : [];
  const marksFilterSection = marksSectionFilter ? data.sections.find((s) => s._id === marksSectionFilter) : null;
  const studentIdsInMarksSection = useMemo(() => {
    if (!marksFilterSection) return null;
    return new Set(
      data.students
        .filter((st) => String(st.section?._id || st.section) === String(marksFilterSection._id))
        .map((st) => String(st._id))
    );
  }, [marksFilterSection, data.students]);

  const renderMarks = () => {
    const studentIdsInSection = studentIdsInMarksSection;

    const filteredMarks = data.marks.filter((m) => {
      if (marksClassFilter && m.className !== marksClassFilter) return false;
      if (studentIdsInSection) {
        const sid = String(m.student?._id || m.student);
        if (!studentIdsInSection.has(sid)) return false;
      }
      return true;
    });

    const filteredMarkResults = data.markResults.filter((r) => {
      if (marksClassFilter) {
        const cls = r.student?.className || r.className;
        if (cls !== marksClassFilter) return false;
      }
      if (studentIdsInSection) {
        const sid = String(r.student?._id || r.student);
        if (!studentIdsInSection.has(sid)) return false;
      }
      return true;
    });

    const hasMarksFilter = !!(marksClassFilter || marksSectionFilter);
    const clearMarksFilter = () => { setMarksClassFilter(""); setMarksSectionFilter(""); };

    // Section label for breadcrumb
    const activeSectionName = marksSectionFilter
      ? (data.sections.find((s) => s._id === marksSectionFilter)?.sectionName || "")
      : "";

    return (
      <div className="stack">
        <SectionHeader
          eyebrow="Academic Marks"
          title="Monthly, Semester, and Class Test Marks"
          action={teacherAllowed && <button className="btn primary" type="button" onClick={() => openModal("mark")}>Enter Marks</button>}
        />

        {/* ── Class / Section filter bar ── */}
        <div style={{background:"var(--edu-card-bg,#fff)",border:"1px solid var(--edu-border)",borderRadius:"16px",padding:"16px 20px",display:"flex",flexWrap:"wrap",alignItems:"flex-end",gap:"14px",boxShadow:"0 2px 10px rgba(15,23,42,0.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",flex:"0 0 auto"}}>
            <span style={{width:30,height:30,borderRadius:"8px",background:"var(--edu-primary-tint,#eff6ff)",display:"grid",placeItems:"center",flexShrink:0}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--edu-primary,#2563eb)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
            </span>
            <div>
              <p style={{margin:0,fontWeight:700,fontSize:"13px"}}>Filter Marks</p>
              <p style={{margin:0,fontSize:"11px",color:"var(--edu-muted)"}}>
                {filteredMarks.length} mark record{filteredMarks.length !== 1 ? "s" : ""}
                {hasMarksFilter && ` · ${filteredMarkResults.length} result rows`}
              </p>
            </div>
          </div>

          <div style={{display:"flex",flexWrap:"wrap",gap:"10px",flex:1,alignItems:"flex-end"}}>
            <div style={{display:"flex",flexDirection:"column",gap:"4px",minWidth:"160px"}}>
              <span style={{fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color: marksClassFilter ? "var(--edu-primary,#2563eb)" : "var(--edu-muted)"}}>Class</span>
              <select className="control" value={marksClassFilter}
                onChange={(e) => { setMarksClassFilter(e.target.value); setMarksSectionFilter(""); }}
                style={{border: marksClassFilter ? "1.5px solid var(--edu-primary,#2563eb)" : undefined}}>
                <option value="">All classes</option>
                {classNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {sectionsForMarksClass.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:"4px",minWidth:"140px"}}>
                <span style={{fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color: marksSectionFilter ? "var(--edu-primary,#2563eb)" : "var(--edu-muted)"}}>Section</span>
                <select className="control" value={marksSectionFilter} onChange={(e) => setMarksSectionFilter(e.target.value)}
                  style={{border: marksSectionFilter ? "1.5px solid var(--edu-primary,#2563eb)" : undefined}}>
                  <option value="">All sections</option>
                  {sectionsForMarksClass.map((s) => <option key={s._id} value={s._id}>{s.sectionName}{s.classTeacher?.name ? ` — ${s.classTeacher.name}` : ""}</option>)}
                </select>
              </div>
            )}

            {hasMarksFilter && (
              <button type="button" onClick={clearMarksFilter}
                style={{display:"flex",alignItems:"center",gap:"5px",padding:"6px 14px",borderRadius:"8px",border:"1px solid var(--edu-border)",background:"var(--edu-bg-alt,#f8fafc)",cursor:"pointer",fontSize:"12px",fontWeight:600,color:"var(--edu-muted)",alignSelf:"flex-end",marginBottom:"1px"}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                Clear
              </button>
            )}
          </div>

          {/* Active filter breadcrumb */}
          {hasMarksFilter && (
            <div style={{width:"100%",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--edu-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              {marksClassFilter && (
                <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 10px",borderRadius:"999px",background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",fontSize:"12px",fontWeight:600}}>
                  {marksClassFilter}
                </span>
              )}
              {activeSectionName && (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--edu-muted)" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
                  <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 10px",borderRadius:"999px",background:"#f5f3ff",border:"1px solid #ddd6fe",color:"#6d28d9",fontSize:"12px",fontWeight:600}}>
                    Section: {activeSectionName}
                  </span>
                </>
              )}
              <span style={{fontSize:"12px",color:"var(--edu-muted)",marginLeft:"4px"}}>{filteredMarks.length} mark record{filteredMarks.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* ── Marks table ── */}
        <div className="table-card smart-table-card">
          <div className="table-toolbar">
            <div>
              <h3 style={{margin:0}}>Mark Records</h3>
              <p style={{margin:"2px 0 0",fontSize:"13px",color:"var(--edu-muted)"}}>
                {hasMarksFilter
                  ? `${filteredMarks.length} records for ${marksClassFilter}${activeSectionName ? ` · ${activeSectionName}` : ""}`
                  : `${data.marks.length} total mark records`}
              </p>
            </div>
            <p style={{margin:0,fontSize:"12px",color:"var(--edu-muted)",maxWidth:"320px",textAlign:"right",lineHeight:"1.5"}}>
              Limits: 12 monthly / 3 semester / 2 class tests per month.
            </p>
          </div>
          <DataTable columns={marksColumns} rows={filteredMarks} searchPlaceholder="Search by student, class, subject, exam..." />
        </div>

        {/* ── Final result summary ── */}
        <div className="table-card smart-table-card">
          <div className="table-toolbar">
            <div>
              <h3 style={{margin:0}}>Final Result Summary</h3>
              <p style={{margin:"2px 0 0",fontSize:"13px",color:"var(--edu-muted)"}}>
                Auto-calculated from entered marks
                {hasMarksFilter && ` · ${filteredMarkResults.length} student-subject rows`}
              </p>
            </div>
          </div>
          <DataTable columns={markResultsColumns} rows={filteredMarkResults} searchPlaceholder="Search student, class, subject..." />
        </div>
      </div>
    );
  };


  const renderResultCards = () => {
    const hasFilters = !!(resultCardFilter.class || resultCardFilter.teacher || resultCardFilter.student || resultCardFilter.exam);
    const clearFilters = () => setResultCardFilter({ student: "", exam: "", class: "", teacher: "" });

    // Build teacher list for filter from sections
    const sectionTeacherOptions = data.sections.filter((s) => s.classTeacher).reduce((acc, s) => {
      const tid = String(s.classTeacher._id || s.classTeacher);
      if (!acc.some((t) => t.id === tid)) {
        acc.push({ id: tid, name: s.classTeacher.name || "Teacher", section: s.sectionName, className: s.className });
      }
      return acc;
    }, []);

    // Label helpers for active chip display
    const activeTeacher = sectionTeacherOptions.find((t) => t.id === resultCardFilter.teacher);
    const activeStudent = resultCardStudents.find((s) => s.id === resultCardFilter.student);
    const activeExam = resultCardExamOptions.find((e) => e.id === resultCardFilter.exam);

    const FilterSelect = ({ label, icon, value, onChange, children }) => (
      <div style={{display:"flex",flexDirection:"column",gap:"5px",minWidth:0}}>
        <span style={{fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color: value ? "var(--edu-primary,#2563eb)" : "var(--edu-muted)",display:"flex",alignItems:"center",gap:"5px"}}>
          {icon && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>}
          {label}
          {value && <span style={{background:"var(--edu-primary,#2563eb)",color:"#fff",borderRadius:"999px",width:"6px",height:"6px",display:"inline-block",flexShrink:0}} />}
        </span>
        <select
          className="control"
          value={value}
          onChange={onChange}
          style={{border: value ? "1.5px solid var(--edu-primary,#2563eb)" : undefined, background: value ? "var(--edu-primary-tint,#eff6ff)" : undefined}}
        >
          {children}
        </select>
      </div>
    );

    return (
      <div className="stack result-card-page">
        <SectionHeader
          eyebrow="Printable PDF Reports"
          title={user.role === "student" ? "My Exam Result Cards" : "Generate Student Result Card PDF"}
          action={(
            <>
              {isAdmin && <button className="btn dark" type="button" onClick={() => openModal("schoolSettings")}>School Settings</button>}
              {teacherAllowed && <button className="btn primary" type="button" onClick={() => openModal("mark")}>Enter Marks</button>}
            </>
          )}
        />

        {/* ── Filter panel ──────────────────────────────────────────── */}
        <div style={{background:"var(--edu-card-bg,#fff)",border:"1px solid var(--edu-border)",borderRadius:"18px",padding:"20px 22px",boxShadow:"0 2px 16px rgba(15,23,42,0.06)"}}>
          {/* Header row */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{width:32,height:32,borderRadius:"8px",background:"var(--edu-primary-tint,#eff6ff)",display:"grid",placeItems:"center",flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--edu-primary,#2563eb)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
              </span>
              <div>
                <p style={{margin:0,fontWeight:700,fontSize:"14px"}}>Filter Result Cards</p>
                <p style={{margin:0,fontSize:"12px",color:"var(--edu-muted)"}}>
                  Showing <strong style={{color:"var(--edu-primary,#2563eb)"}}>{visibleResultCards.length}</strong> of <strong>{resultCards.length}</strong> cards
                </p>
              </div>
            </div>
            {hasFilters && (
              <button type="button" onClick={clearFilters}
                style={{display:"flex",alignItems:"center",gap:"5px",padding:"5px 12px",borderRadius:"8px",border:"1px solid var(--edu-border)",background:"var(--edu-bg-alt,#f8fafc)",cursor:"pointer",fontSize:"12px",fontWeight:600,color:"var(--edu-muted)"}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                Clear all filters
              </button>
            )}
          </div>

          {/* Four filter dropdowns */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"14px"}}>
            <FilterSelect label="Class" icon={<><path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z"/><path d="M6.5 11v4.2c0 1.7 2.5 3.1 5.5 3.1s5.5-1.4 5.5-3.1V11"/></>}
              value={resultCardFilter.class}
              onChange={(e) => setResultCardFilter({ student: "", exam: "", teacher: resultCardFilter.teacher, class: e.target.value })}>
              <option value="">All classes</option>
              {classNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </FilterSelect>

            <FilterSelect label="Teacher / Section" icon={<><path d="M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M2.8 21c.6-3.9 2.9-6.2 6.2-6.2s5.6 2.3 6.2 6.2"/><path d="M17.5 10.2a3 3 0 1 0-.8-5.8"/><path d="M17.2 14.6c2.3.5 3.8 2.5 4.2 5.4"/></>}
              value={resultCardFilter.teacher}
              onChange={(e) => setResultCardFilter({ student: "", exam: "", class: resultCardFilter.class, teacher: e.target.value })}>
              <option value="">All teachers</option>
              {sectionTeacherOptions.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.className} ({t.section})</option>)}
            </FilterSelect>

            <FilterSelect label="Student" icon={<><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 21c.8-4.2 3.5-6.5 8-6.5s7.2 2.3 8 6.5"/></>}
              value={resultCardFilter.student}
              onChange={(e) => setResultCardFilter({ ...resultCardFilter, student: e.target.value, exam: "" })}>
              <option value="">All students</option>
              {resultCardStudents.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </FilterSelect>

            <FilterSelect label="Exam" icon={<><path d="M6 3.5h9l3 3V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/><path d="m8 15 2 2 5-6"/></>}
              value={resultCardFilter.exam}
              onChange={(e) => setResultCardFilter({ ...resultCardFilter, exam: e.target.value })}>
              <option value="">All exams</option>
              {resultCardExamOptions.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </FilterSelect>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--edu-border)"}}>
              {resultCardFilter.class && (
                <span style={{display:"inline-flex",alignItems:"center",gap:"5px",padding:"3px 10px 3px 10px",borderRadius:"999px",background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",fontSize:"12px",fontWeight:600}}>
                  Class: {resultCardFilter.class}
                  <button type="button" onClick={() => setResultCardFilter({...resultCardFilter,class:"",student:"",exam:""})} style={{background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:1,color:"#1d4ed8",display:"flex"}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                </span>
              )}
              {activeTeacher && (
                <span style={{display:"inline-flex",alignItems:"center",gap:"5px",padding:"3px 10px 3px 10px",borderRadius:"999px",background:"#f5f3ff",border:"1px solid #ddd6fe",color:"#6d28d9",fontSize:"12px",fontWeight:600}}>
                  {activeTeacher.name} — {activeTeacher.className} ({activeTeacher.section})
                  <button type="button" onClick={() => setResultCardFilter({...resultCardFilter,teacher:"",student:"",exam:""})} style={{background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:1,color:"#6d28d9",display:"flex"}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                </span>
              )}
              {activeStudent && (
                <span style={{display:"inline-flex",alignItems:"center",gap:"5px",padding:"3px 10px 3px 10px",borderRadius:"999px",background:"#f0fdf4",border:"1px solid #bbf7d0",color:"#15803d",fontSize:"12px",fontWeight:600}}>
                  {activeStudent.name}
                  <button type="button" onClick={() => setResultCardFilter({...resultCardFilter,student:"",exam:""})} style={{background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:1,color:"#15803d",display:"flex"}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                </span>
              )}
              {activeExam && (
                <span style={{display:"inline-flex",alignItems:"center",gap:"5px",padding:"3px 10px 3px 10px",borderRadius:"999px",background:"#fff7ed",border:"1px solid #fed7aa",color:"#c2410c",fontSize:"12px",fontWeight:600}}>
                  {activeExam.label.length > 40 ? activeExam.label.slice(0,40)+"…" : activeExam.label}
                  <button type="button" onClick={() => setResultCardFilter({...resultCardFilter,exam:""})} style={{background:"none",border:"none",cursor:"pointer",padding:0,lineHeight:1,color:"#c2410c",display:"flex"}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Cards ────────────────────────────────────────────────── */}
        {visibleResultCards.length ? (
          <div className="result-card-list">
            {visibleResultCards.map((card) => (
              <article className="report-preview-card panel" key={card.id}>
                <div className="report-preview-header">
                  <div className="report-logo-row">
                    <span className="report-logo-preview">{schoolSettings.leftLogoUrl ? <img alt="Left school logo" src={schoolSettings.leftLogoUrl} /> : "Logo"}</span>
                    <div>
                      <h3>{schoolSettings.schoolName || "Your School Name"}</h3>
                      <p>{schoolSettings.subtitle || "An English Medium School"}</p>
                      <small>{schoolSettings.address || "School address here"}</small>
                    </div>
                    <span className="report-logo-preview">{schoolSettings.rightLogoUrl ? <img alt="Right school logo" src={schoolSettings.rightLogoUrl} /> : "Logo"}</span>
                  </div>
                  <h4>{card.examLabel} Examination {card.academicYear}</h4>
                  <strong>{schoolSettings.defaultExamTitle || "Progress Report"} — {card.student?.className || "Class"}</strong>
                </div>

                <div className="report-student-strip">
                  <span><strong>Student:</strong> {card.student?.name || "Student"}</span>
                  <span><strong>Guardian:</strong> {card.student?.contactInfo?.guardianName || "Not set"}</span>
                  <span><strong>Roll/ID:</strong> {card.student?.rollNumber || card.studentId}</span>
                </div>

                <div className="report-preview-table-wrap">
                  <table className="report-preview-table">
                    <thead><tr><th>Subject</th><th>Max</th><th>Obtained</th><th>%</th><th>Grade</th></tr></thead>
                    <tbody>
                      {card.subjects.map((subject) => (
                        <tr key={`${card.id}-${subject.subject}`}>
                          <td>{subject.subject}</td>
                          <td>{subject.totalMarks}</td>
                          <td>{subject.obtainedMarks}</td>
                          <td>{subject.percentage}%</td>
                          <td><GradeBadge grade={subject.grade} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr><td>Total</td><td>{card.totalMarks}</td><td>{card.obtainedMarks}</td><td>{card.percentage}%</td><td><GradeBadge grade={card.grade} /></td></tr></tfoot>
                  </table>
                </div>

                <div className="report-result-strip">
                  <span><strong>Result:</strong> <span style={{color: card.resultStatus === "Pass" ? "#16a34a" : "#dc2626", fontWeight:700}}>{card.resultStatus}</span></span>
                  <span><strong>Percentage:</strong> {card.percentage}%</span>
                  <span><strong>Grade:</strong> <GradeBadge grade={card.grade} /></span>
                  <span><strong>Position:</strong> {card.classPosition ? `${card.classPosition} of ${card.classSize}` : "—"}</span>
                </div>

                <div className="report-actions">
                  <button className="btn primary icon-text-btn" type="button" onClick={() => {
                    const opened = downloadResultCard(card, schoolSettings);
                    if (!opened) setError("Popup was blocked. Please allow popups and click Download PDF again.");
                  }}><DashboardIcon name="pdf" />Download PDF</button>
                  {teacherAllowed && <button className="btn soft icon-text-btn" type="button" onClick={() => setActiveView("marks")}><DashboardIcon name="edit" />Edit Marks</button>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="info-card" style={{textAlign:"center",padding:"40px 24px"}}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--edu-muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:"12px"}}><path d="M6 3.5h9l3 3V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5v4h4"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>
            <h3 style={{margin:"0 0 6px"}}>{hasFilters ? "No cards match your filters" : "No result cards yet"}</h3>
            <p style={{margin:0,color:"var(--edu-muted)",fontSize:"14px"}}>
              {hasFilters ? "Try adjusting the filters above to see more results." : "Enter marks for a student first. Each exam group automatically becomes a downloadable card."}
            </p>
            {hasFilters && <button type="button" className="btn soft" style={{marginTop:"14px"}} onClick={clearFilters}>Clear filters</button>}
          </div>
        )}
      </div>
    );
  };

  const renderRoutines = () => (
    <>
      <SectionHeader
        eyebrow="Class Routine"
        title="Teacher Routine Planner"
        action={teacherAllowed && <button className="btn primary" type="button" onClick={() => openModal("routine")}>Add Routine</button>}
      />
      <DataTable columns={routinesColumns} rows={data.routines} />
    </>
  );

  const renderSalaries = () => (
    <div className="stack">
      <SectionHeader
        eyebrow="Salary Management"
        title="Salary Ledger and Increment"
        action={financeAllowed && (
          <>
            <button className="btn dark" type="button" onClick={() => openModal("monthlySalaries")}>Generate Monthly</button>
            <button className="btn success" type="button" onClick={() => openModal("salary")}>Pay Salary</button>
            <button className="btn primary" type="button" onClick={() => openModal("increment")}>Add Increment</button>
          </>
        )}
      />
      <DataTable columns={salariesColumns} rows={data.salaries} />
      <SectionHeader eyebrow="Teacher/Employee Increment" title="Salary Increment History" />
      <DataTable columns={incrementsColumns} rows={data.increments} />
    </div>
  );

  const renderReports = () => (
    <div className="stack">
      <SectionHeader eyebrow="Reports" title="School Snapshot" />
      <div className="stats-grid">
        {financeAllowed && <StatCard icon="wallet" label="Collected Fees" tone="amber" value={money.format(data.dashboard.totalIncome || paidCollection || 0)} />}
        <StatCard icon="eye" label="Student Due" tone="green" value={money.format(visibleDue)} />
        <StatCard icon="due" label="Salary Due" tone="orange" value={money.format(totalSalaryDue)} />
        <StatCard icon="marks" label="Result Records" tone="violet" value={data.markResults.length} />
        <StatCard icon="chart" label="Collection" tone="blue" value={`${collectionRate}%`} />
      </div>
      <div className="business-rules-grid">
        <article className="info-card"><h3>Access</h3><p>Admin, teacher, accounts, staff, and student roles are separated.</p></article>
        <article className="info-card"><h3>Results</h3><p>Marks use total marks, obtained marks, and contribution percentage.</p></article>
        <article className="info-card"><h3>Routine</h3><p>Class and teacher time conflicts are checked.</p></article>
      </div>
    </div>
  );

  const handleDbTest = async () => {
    if (!dbUriInput.trim()) { setDbTestStatus({ ok: false, message: "Enter a MongoDB URI first." }); return; }
    setDbTestLoading(true);
    setDbTestStatus(null);
    setDbConfirmPending(false);
    try {
      const res = await erpApi.testDbConnection(token, { uri: dbUriInput.trim() });
      if (res.data?.ok) {
        setDbTestStatus({ ok: true, message: `Connected — database: ${res.data.dbName || "unknown"}` });
      } else {
        setDbTestStatus({ ok: false, message: res.data?.error || "Connection failed." });
      }
    } catch (err) {
      setDbTestStatus({ ok: false, message: getErrorMessage(err) });
    } finally {
      setDbTestLoading(false);
    }
  };

  // Step 1: show the inline confirmation strip
  const handleDbSaveRequest = () => {
    if (!dbUriInput.trim()) { setDbTestStatus({ ok: false, message: "Enter a MongoDB URI first." }); return; }
    setDbConfirmPending(true);
    setDbTestStatus(null);
  };

  // Step 2: confirmed — actually save
  const handleDbSaveConfirmed = async () => {
    setDbConfirmPending(false);
    setDbSaveLoading(true);
    setDbTestStatus(null);
    try {
      const res = await erpApi.saveDbConfig(token, { uri: dbUriInput.trim() });
      setDbTestStatus({ ok: true, message: res.data?.message || "Saved and reconnected." });
      setDbConfig((prev) => ({ ...prev, maskedUri: dbUriInput.replace(/:([^@/]+)@/, ":***@"), hasCustomUri: true, connectionStateLabel: "connected", dbName: res.data?.dbName || "" }));
      setDbUriInput("");
    } catch (err) {
      setDbTestStatus({ ok: false, message: getErrorMessage(err) });
    } finally {
      setDbSaveLoading(false);
      setTimeout(() => refresh(), 800);
    }
  };

  const handleDbResetConfirmed = async () => {
    setDbResetPending(false);
    setDbSaveLoading(true);
    setDbTestStatus(null);
    setDbConfirmPending(false);
    try {
      const res = await erpApi.resetDbConfig(token);
      setDbTestStatus({ ok: true, message: res.data?.message || "Reset to default." });
      const cfg = await erpApi.getDbConfig(token);
      setDbConfig(cfg.data?.config || null);
      setDbUriInput("");
    } catch (err) {
      setDbTestStatus({ ok: false, message: getErrorMessage(err) });
    } finally {
      setDbSaveLoading(false);
      setTimeout(() => refresh(), 800);
    }
  };

  const renderSettings = () => (
    <div className="stack settings-page">
      <SectionHeader
        eyebrow="Settings"
        title="App Settings"
        action={<button className="btn primary" type="button" onClick={() => openModal("userSettings")}>Profile Settings</button>}
      />
      <section className="settings-grid">
        <article className="settings-card panel">
          <span className="settings-icon"><DashboardIcon name="profile" /></span>
          <h3>User Profile</h3>
          <p>Change your name, email, photo, and password.</p>
          <button className="btn soft" type="button" onClick={() => openModal("userSettings")}>Edit Profile</button>
        </article>
        <article className="settings-card panel">
          <span className="settings-icon"><DashboardIcon name={theme === "dark" ? "moon" : "sun"} /></span>
          <h3>Appearance</h3>
          <p>Switch between light and dark mode.</p>
          <button className="btn dark" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Use Light Mode" : "Use Dark Mode"}</button>
        </article>
        <article className="settings-card panel">
          <span className="settings-icon"><DashboardIcon name="school" /></span>
          <h3>School Settings</h3>
          <p>Set school name, logos, contact details, academic year, and report text.</p>
          {isAdmin ? <button className="btn warn" type="button" onClick={() => openModal("schoolSettings")}>Edit School</button> : <small>Admin only</small>}
        </article>
        <article className="settings-card panel">
          <span className="settings-icon"><DashboardIcon name="pdf" /></span>
          <h3>Report Cards</h3>
          <p>Control report title, principal name, pass mark, and default remarks.</p>
          {isAdmin ? <button className="btn soft" type="button" onClick={() => openModal("schoolSettings")}>Report Settings</button> : <small>Admin only</small>}
        </article>
        <article className="settings-card panel">
          <span className="settings-icon"><DashboardIcon name="lock" /></span>
          <h3>Security</h3>
          <p>Update password from your profile settings.</p>
          <button className="btn soft" type="button" onClick={() => openModal("userSettings")}>Change Password</button>
        </article>
        <article className="settings-card panel">
          <span className="settings-icon"><DashboardIcon name="refresh" /></span>
          <h3>Data Refresh</h3>
          <p>Reload dashboard data after changing records.</p>
          <button className="btn success" type="button" onClick={refresh}>Refresh Data</button>
        </article>
      </section>

      {/* User Accounts — admin only */}
      {isAdmin && (
        <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", padding: "20px 24px", borderBottom: "1px solid var(--ui-line,#e2e8f0)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span className="settings-icon" style={{ borderRadius: "12px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}>
                <DashboardIcon name="addUser" />
              </span>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ui-text,#1e293b)" }}>User Accounts</h3>
                <p style={{ margin: "2px 0 0", fontSize: "13px" }}>View all login accounts. Set or reset passwords for any user.</p>
              </div>
            </div>
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {allUsersLoading ? (
              <div style={{ padding: "20px 24px", color: "var(--ui-muted,#64748b)", fontSize: "13px" }}>Loading users…</div>
            ) : allUsers.length === 0 ? (
              <div style={{ padding: "20px 24px", color: "var(--ui-muted,#64748b)", fontSize: "13px" }}>No user accounts found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "480px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ui-line,#e2e8f0)" }}>
                    {["Name", "Email", "Role", "Action"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--ui-muted,#64748b)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <Fragment key={u._id}>
                      <tr style={{ borderBottom: "1px solid var(--ui-line,#e2e8f0)" }}>
                        <td style={{ padding: "11px 16px", fontWeight: 600, color: "var(--ui-text,#1e293b)", whiteSpace: "nowrap" }}>{u.name}</td>
                        <td style={{ padding: "11px 16px", color: "var(--ui-muted,#64748b)" }}>{u.email}</td>
                        <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                          <span style={{ padding: "2px 10px", borderRadius: "999px", fontSize: "11.5px", fontWeight: 700, background: "rgba(99,102,241,0.08)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.2)" }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="btn soft"
                            style={{ fontSize: "12px", minHeight: "30px", padding: "3px 12px" }}
                            onClick={() => {
                              setUserPasswordTarget(userPasswordTarget?._id === u._id ? null : u);
                              setUserPasswordForm({ password: "", confirmPassword: "" });
                              setError("");
                            }}
                          >
                            {userPasswordTarget?._id === u._id ? "Cancel" : "Set Password"}
                          </button>
                        </td>
                      </tr>
                      {userPasswordTarget?._id === u._id && (
                        <tr key={`${u._id}-pw`} style={{ background: "rgba(99,102,241,0.03)", borderBottom: "1px solid var(--ui-line,#e2e8f0)" }}>
                          <td colSpan={4} style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
                              <label style={{ flex: 1, minWidth: "140px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 700, color: "var(--ui-text,#1e293b)" }}>
                                New Password
                                <input
                                  type="password"
                                  className="control"
                                  placeholder="Min 6 characters"
                                  value={userPasswordForm.password}
                                  minLength={6}
                                  autoComplete="new-password"
                                  onChange={(e) => setUserPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                                />
                              </label>
                              <label style={{ flex: 1, minWidth: "140px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 700, color: "var(--ui-text,#1e293b)" }}>
                                Confirm Password
                                <input
                                  type="password"
                                  className="control"
                                  placeholder="Repeat password"
                                  value={userPasswordForm.confirmPassword}
                                  minLength={6}
                                  autoComplete="new-password"
                                  onChange={(e) => setUserPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                />
                              </label>
                              <button
                                type="button"
                                className="btn primary"
                                style={{ fontSize: "12px", minHeight: "38px", padding: "4px 18px", alignSelf: "flex-end" }}
                                disabled={userPasswordLoading || userPasswordForm.password.length < 6 || userPasswordForm.password !== userPasswordForm.confirmPassword}
                                onClick={handleSetUserPassword}
                              >
                                {userPasswordLoading ? "Saving…" : "Save Password"}
                              </button>
                            </div>
                            {userPasswordForm.password && userPasswordForm.confirmPassword && userPasswordForm.password !== userPasswordForm.confirmPassword && (
                              <p style={{ margin: "6px 0 0", fontSize: "11.5px", color: "#dc2626", fontWeight: 600 }}>Passwords do not match.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* Database Configuration — admin only */}
      {isAdmin && (
        <section className="panel" style={{ padding: 0, overflow: "hidden" }}>

          {/* ── Panel header ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", padding: "20px 24px", borderBottom: "1px solid var(--ui-line, #e2e8f0)" }}>
            <div className="db-config-header-inner" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span className="settings-icon" style={{ borderRadius: "12px", background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff" }}>
                <DashboardIcon name="database" />
              </span>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ui-text,#1e293b)" }}>Database Configuration</h3>
                <p style={{ margin: "2px 0 0", fontSize: "13px" }}>Configure each school's own MongoDB database. Changes take effect immediately.</p>
              </div>
            </div>
            {dbConfig && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "7px",
                padding: "5px 14px", borderRadius: "999px", fontSize: "12.5px", fontWeight: 700,
                background: dbConfig.connectionStateLabel === "connected" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${dbConfig.connectionStateLabel === "connected" ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.3)"}`,
                color: dbConfig.connectionStateLabel === "connected" ? "#059669" : "#dc2626",
              }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "currentColor", flexShrink: 0, display: "inline-block" }} />
                {dbConfig.connectionStateLabel === "connected"
                  ? <>Connected &mdash; <span style={{ fontFamily: "monospace", fontWeight: 500 }}>{dbConfig.dbName || "db"}</span></>
                  : dbConfig.connectionStateLabel}
              </span>
            )}
          </div>

          {/* ── Two-column body ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>

            {/* LEFT — active connection info */}
            <div style={{ padding: "24px", borderRight: "1px solid var(--ui-line,#e2e8f0)", display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2563eb", margin: 0 }}>Active Connection</p>

              {dbConfig ? (
                <>
                  {/* DB name */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(99,102,241,0.1)", color: "#4f46e5", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ width: "17px", height: "17px" }}>
                        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v4c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 9v4c0 1.66 4.03 3 9 3s9-1.34 9-3V9" /><path d="M3 13v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4" />
                      </svg>
                    </span>
                    <div>
                      <strong style={{ fontSize: "15px", display: "block", color: "var(--ui-text,#1e293b)" }}>{dbConfig.dbName || "Unknown"}</strong>
                      <small style={{ fontSize: "12px" }}>{dbConfig.hasCustomUri ? "Custom database" : "Default database"}</small>
                    </div>
                  </div>

                  {/* Masked URI */}
                  <div style={{ background: "var(--ui-bg-alt,#f8fafc)", border: "1px solid var(--ui-line,#e2e8f0)", borderRadius: "10px", padding: "12px 14px" }}>
                    <p style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px", color: "var(--ui-muted,#64748b)" }}>Connection String</p>
                    <code style={{ fontSize: "12px", wordBreak: "break-all", color: "var(--ui-text,#1e293b)", display: "block", lineHeight: 1.6 }}>
                      {dbConfig.maskedUri || "Not set"}
                    </code>
                  </div>

                  {/* Type badge + reset */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 12px", borderRadius: "999px", fontSize: "11.5px", fontWeight: 700,
                      background: dbConfig.hasCustomUri ? "rgba(99,102,241,0.08)" : "rgba(16,185,129,0.08)",
                      color: dbConfig.hasCustomUri ? "#4f46e5" : "#059669",
                      border: `1px solid ${dbConfig.hasCustomUri ? "rgba(99,102,241,0.2)" : "rgba(16,185,129,0.2)"}`,
                    }}>
                      {dbConfig.hasCustomUri ? "Custom URI" : "Environment / Default"}
                    </span>
                    {dbConfig.hasCustomUri && !dbResetPending && (
                      <button className="btn soft" type="button" style={{ fontSize: "12px", minHeight: "32px", padding: "4px 12px" }} onClick={() => setDbResetPending(true)} disabled={dbSaveLoading}>
                        Reset to Default
                      </button>
                    )}
                  </div>

                  {/* Reset inline confirm */}
                  {dbResetPending && (
                    <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", fontSize: "12.5px" }}>
                      <p style={{ margin: "0 0 10px", fontWeight: 600, color: "var(--ui-text,#1e293b)" }}>Reset to default database?</p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button type="button" className="btn soft" style={{ fontSize: "12px", minHeight: "32px", padding: "4px 14px", borderColor: "rgba(239,68,68,0.4)", color: "#dc2626" }} onClick={handleDbResetConfirmed} disabled={dbSaveLoading}>
                          Yes, reset
                        </button>
                        <button type="button" className="btn soft" style={{ fontSize: "12px", minHeight: "32px", padding: "4px 14px" }} onClick={() => setDbResetPending(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 0", color: "var(--ui-muted,#94a3b8)", fontSize: "13px" }}>
                  Loading connection info…
                </div>
              )}
            </div>

            {/* RIGHT — new connection form */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2563eb", margin: 0 }}>Connect New Database</p>

              {/* URI input with show/hide toggle */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ui-text,#1e293b)" }}>MongoDB URI</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={dbShowUri ? "text" : "password"}
                    className="control"
                    style={{ width: "100%", fontFamily: "monospace", fontSize: "12.5px", paddingRight: "70px", boxSizing: "border-box" }}
                    placeholder="mongodb+srv://user:pass@cluster.net/SchoolDB"
                    value={dbUriInput}
                    onChange={(e) => { setDbUriInput(e.target.value); setDbTestStatus(null); setDbConfirmPending(false); }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setDbShowUri((v) => !v)}
                    style={{
                      position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
                      fontSize: "11px", fontWeight: 700, color: "var(--ui-muted,#64748b)",
                      borderRadius: "6px",
                    }}
                    title={dbShowUri ? "Hide URI" : "Show URI"}
                  >
                    {dbShowUri ? "Hide" : "Show"}
                  </button>
                </div>
                <small style={{ fontSize: "11.5px", color: "var(--ui-muted,#64748b)", lineHeight: 1.55 }}>
                  Supports Atlas (<code>mongodb+srv://</code>) and local (<code>mongodb://</code>).
                </small>
              </div>

              {/* Status feedback */}
              {dbTestStatus && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "10px",
                  background: dbTestStatus.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${dbTestStatus.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                  fontSize: "12.5px", lineHeight: 1.5,
                  color: dbTestStatus.ok ? "#065f46" : "#991b1b",
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "15px", height: "15px", flexShrink: 0, marginTop: "1px" }}>
                    {dbTestStatus.ok
                      ? <><path d="M22 11.07V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3 8-8" /></>
                      : <><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></>}
                  </svg>
                  <span>{dbTestStatus.message}</span>
                </div>
              )}

              {/* Inline confirm strip — shown when user clicks Save & Connect */}
              {dbConfirmPending && (
                <div style={{
                  padding: "12px 14px", borderRadius: "10px",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)",
                  fontSize: "12.5px", color: "#92400e",
                }}>
                  <p style={{ margin: "0 0 10px", fontWeight: 600, color: "var(--ui-text,#1e293b)" }}>
                    Switch to this database?
                  </p>
                  <p style={{ margin: "0 0 12px", lineHeight: 1.55 }}>
                    The server will reconnect immediately. Default accounts will be created if the database is new.
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" className="btn warn" style={{ minHeight: "34px", padding: "4px 14px", fontSize: "12.5px" }} onClick={handleDbSaveConfirmed}>
                      Yes, switch database
                    </button>
                    <button type="button" className="btn soft" style={{ minHeight: "34px", padding: "4px 14px", fontSize: "12.5px" }} onClick={() => setDbConfirmPending(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!dbConfirmPending && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "auto" }}>
                  <button
                    type="button"
                    className="btn soft"
                    onClick={handleDbTest}
                    disabled={dbTestLoading || dbSaveLoading || !dbUriInput.trim()}
                    style={{ flex: 1, minWidth: "120px" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                      <path d="M12 22v-5" /><path d="M9 7V2" /><path d="M15 7V2" /><path d="M6 13V7h12v6a6 6 0 0 1-6 6 6 6 0 0 1-6-6Z" />
                    </svg>
                    {dbTestLoading ? "Testing…" : "Test Connection"}
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleDbSaveRequest}
                    disabled={dbTestLoading || dbSaveLoading || !dbUriInput.trim()}
                    style={{ flex: 1, minWidth: "120px" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v4c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 9v4c0 1.66 4.03 3 9 3s9-1.34 9-3V9" /><path d="M3 13v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4" />
                    </svg>
                    {dbSaveLoading ? "Saving…" : "Save & Connect"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer info strip ── */}
          <div style={{ padding: "13px 24px", borderTop: "1px solid var(--ui-line,#e2e8f0)", background: "rgba(99,102,241,0.03)", fontSize: "12px", color: "var(--ui-muted,#64748b)", lineHeight: 1.65 }}>
            <strong style={{ color: "var(--ui-text,#1e293b)" }}>How it works: </strong>
            Paste any MongoDB URI and click <em>Test Connection</em> first to verify. Then <em>Save &amp; Connect</em> to switch — the server reconnects instantly and seeds default admin accounts into the new database so you can log in right away. The old database is untouched.
          </div>
        </section>
      )}

      <section className="panel catalog-panel">
        <div className="section-header inline-header">
          <div>
            <p>Academic Setup</p>
            <h2>Classes and Subjects</h2>
          </div>
        </div>
        <div className="catalog-grid">
          <article><strong>Play to Class 8</strong><small>{[...new Set([...subjectCatalog.prePrimary, ...subjectCatalog.primary, ...subjectCatalog.junior])].join(", ")}</small></article>
          <article><strong>Science</strong><small>{subjectCatalog.science.join(", ")}</small></article>
          <article><strong>Arts</strong><small>{subjectCatalog.arts.join(", ")}</small></article>
          <article><strong>Commerce</strong><small>{subjectCatalog.commerce.join(", ")}</small></article>
        </div>
      </section>

      <section className="panel settings-summary">
        <div>
          <p className="eyebrow">Current School</p>
          <h3>{schoolSettings.schoolName || "Your School Name"}</h3>
          <p>{schoolSettings.address || "No address set"}</p>
        </div>
        <div className="settings-meta-grid">
          <span><strong>Academic Year</strong><small>{schoolSettings.academicYear || year}</small></span>
          <span><strong>Session</strong><small>{schoolSettings.academicSession || "January - December"}</small></span>
          <span><strong>Pass Mark</strong><small>{schoolSettings.defaultPassMark || 33}%</small></span>
          <span><strong>Start Time</strong><small>{schoolSettings.classStartTime || "09:00"}</small></span>
        </div>
      </section>
    </div>
  );

  const modalTitle = {
    classFee: editingId ? "Edit Class Fee Rule" : "Add Class Fee Rule",
    student: editingId ? "Edit Student" : "Add Student",
    payment: editingId ? "Edit Student Payment" : "Record Student Payment",
    employee: editingId ? "Edit Employee" : "Add Employee",
    salary: "Pay Salary",
    monthlyFees: "Generate Monthly Fees",
    examFees: "Generate Exam Fees",
    monthlySalaries: "Generate Monthly Salaries",
    mark: editingId ? "Edit Mark" : "Enter Mark",
    routine: editingId ? "Edit Class Routine" : "Add Class Routine",
    increment: editingId ? "Edit Salary Increment" : "Add Salary Increment",
    schoolSettings: "School Settings",
    userSettings: "User Settings",
    expense: editingId ? "Edit Expense" : "Add Expense",
    section: editingId ? "Edit Class Section" : "Add Class Section",
    classroom: editingId ? "Edit Classroom" : "Add Classroom",
  }[modal];

  const selectedProfilePayments = useMemo(() => profileStudent ? data.payments.filter((payment) => (payment.student?._id || payment.student) === profileStudent._id) : [], [profileStudent, data.payments]);
  const selectedProfileMarks = useMemo(() => profileStudent ? data.marks.filter((mark) => (mark.student?._id || mark.student) === profileStudent._id) : [], [profileStudent, data.marks]);
  const selectedProfileResults = useMemo(() => profileStudent ? data.markResults.filter((result) => (result.student?._id || result.student) === profileStudent._id) : [], [profileStudent, data.markResults]);
  const selectedMarkStudent = data.students.find((student) => student._id === form.student);
  const subjectOptionsForForm = modal === "mark" && selectedMarkStudent ? subjectsForClass(selectedMarkStudent.className) : allSubjectOptions;

  // For teacher role, filter mark-entry students to only their section's class
  const markEntryStudents = useMemo(() => {
    if (user.role !== "teacher") return data.students;
    const mySectionClasses = new Set(
      data.sections
        .filter((s) => (s.classTeacher?._id || s.classTeacher) === user.id)
        .map((s) => s.className)
    );
    if (mySectionClasses.size === 0) {
      // Fall back to legacy assignedClass from employee record
      const myEmployee = data.employees.find((e) => String(e.contactInfo?.email || "").toLowerCase() === String(user.email || "").toLowerCase());
      const assignedClass = myEmployee?.assignedClass;
      if (assignedClass) return data.students.filter((s) => s.className === assignedClass);
    }
    return data.students.filter((s) => mySectionClasses.has(s.className));
  }, [user, data.sections, data.students, data.employees]);
  const salaryAutoPreview = modal === "salary" ? getSalaryAutoValues(form.employee, form.salaryMonth) : null;
  const salaryDuePreview = modal === "salary" ? Math.max(Number(form.amount || salaryAutoPreview?.amount || 0) - Number(form.paidAmount || 0), 0) : 0;
  const studentFeeAutoPreview = modal === "payment" ? getStudentFeeAutoValues(form.student, form.feeType, form.billingMonth, form.term) : null;
  const studentFeeDuePreview = modal === "payment" ? Math.max(Number(form.amount || studentFeeAutoPreview?.amount || 0) - Number(form.paidAmount || 0), 0) : 0;

  const EXPENSE_CATS = {
    asset: "Asset Purchase",
    tour: "Tour / Field Trip",
    food: "Food & Refreshments",
    gift: "Gifts & Awards",
    event: "Event Costs",
    stationery: "Stationery & Supplies",
    utility: "Utility Bills",
    maintenance: "Maintenance & Repair",
    other: "Other",
  };

  const renderExpenses = () => {
    const monthFiltered = expenseMonth
      ? data.expenses.filter((e) => {
          const d = new Date(e.date);
          const mon = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
          return mon === expenseMonth;
        })
      : data.expenses;

    const visible = expenseCategoryFilter === "all"
      ? monthFiltered
      : monthFiltered.filter((e) => e.category === expenseCategoryFilter);

    const totalExpense = visible.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const grandTotal = data.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const catTotals = Object.keys(EXPENSE_CATS).map((cat) => ({
      cat,
      label: EXPENSE_CATS[cat],
      total: monthFiltered.filter((e) => e.category === cat).reduce((sum, e) => sum + Number(e.amount || 0), 0),
      count: monthFiltered.filter((e) => e.category === cat).length,
    })).filter((c) => c.count > 0);

    const expensesColumns = [
      { key: "date", label: "Date", search: (row) => toDateInput(row.date), render: (row) => toDateInput(row.date) },
      { key: "title", label: "Title / Purpose", search: (row) => row.title, render: (row) => <strong>{row.title}</strong> },
      { key: "category", label: "Category", search: (row) => EXPENSE_CATS[row.category] || row.category, render: (row) => <span className="status dot-status active">{EXPENSE_CATS[row.category] || row.category}</span> },
      { key: "amount", label: "Amount", render: (row) => <strong>{money.format(row.amount || 0)}</strong> },
      { key: "paidTo", label: "Paid To", search: (row) => row.paidTo, render: (row) => row.paidTo || <span className="text-slate-400">—</span> },
      { key: "method", label: "Method", render: (row) => <span className="capitalize">{row.paymentMethod || "cash"}</span> },
      { key: "receipt", label: "Receipt #", render: (row) => row.receiptNo || <span className="text-slate-400">—</span> },
      { key: "note", label: "Note", render: (row) => row.note || <span className="text-slate-400">—</span> },
      { key: "actions", label: "Actions", render: (row) => financeAllowed && (
        <div className="action-row compact">
          <ActionButton icon="edit" label="Edit expense" onClick={() => openModal("expense", row)} />
          {isAdmin && <ActionButton icon="delete" label="Delete expense" tone="danger" onClick={() => handleDelete("expense", row._id)} />}
        </div>
      )},
    ];

    return (
      <div className="stack">
        <SectionHeader
          eyebrow="Expense Tracker"
          title="School Expenses and Purchases"
          action={financeAllowed && (
            <button className="btn primary" type="button" onClick={() => openModal("expense")}>
              <DashboardIcon name="addUser" className="btn-icon" />
              Add Expense
            </button>
          )}
        />

        <div className="stats-grid premium-stats">
          <StatCard icon="wallet" label="Total Expenses (All Time)" tone="orange" value={money.format(grandTotal)} helper={`${data.expenses.length} records total`} />
          <StatCard icon="chart" label={`Expenses — ${expenseMonth || "all months"}`} tone="blue" value={money.format(monthFiltered.reduce((s, e) => s + Number(e.amount || 0), 0))} helper={`${monthFiltered.length} records this period`} />
          {expenseCategoryFilter !== "all" && (
            <StatCard icon="marks" label={EXPENSE_CATS[expenseCategoryFilter] || expenseCategoryFilter} tone="violet" value={money.format(totalExpense)} helper={`${visible.length} records in filter`} />
          )}
        </div>

        {catTotals.length > 0 && (
          <div className="expense-chips-row">
            <button
              type="button"
              className={`expense-chip${expenseCategoryFilter === "all" ? " active" : ""}`}
              onClick={() => setExpenseCategoryFilter("all")}
            >
              <span className="chip-label">All Categories</span>
              <span className="chip-amount">{money.format(monthFiltered.reduce((s, e) => s + Number(e.amount || 0), 0))}</span>
              <span className="chip-count">{monthFiltered.length} records</span>
            </button>
            {catTotals.map(({ cat, label, total, count }) => (
              <button
                key={cat}
                type="button"
                className={`expense-chip${expenseCategoryFilter === cat ? " active" : ""}`}
                onClick={() => setExpenseCategoryFilter(expenseCategoryFilter === cat ? "all" : cat)}
              >
                <span className="chip-label">{label}</span>
                <span className="chip-amount">{money.format(total)}</span>
                <span className="chip-count">{count} record{count !== 1 ? "s" : ""}</span>
              </button>
            ))}
          </div>
        )}

        <div className="expense-filter-bar">
          <label className="expense-filter-label">
            Month
            <input
              className="control small"
              type="month"
              value={expenseMonth}
              onChange={(e) => setExpenseMonth(e.target.value)}
            />
          </label>
          <select
            className="control small"
            value={expenseCategoryFilter}
            onChange={(e) => setExpenseCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {Object.entries(EXPENSE_CATS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {(expenseCategoryFilter !== "all") && (
            <button
              className="btn soft small"
              type="button"
              onClick={() => setExpenseCategoryFilter("all")}
            >
              Clear category
            </button>
          )}
          <span className="expense-total-badge">
            Showing: <strong>{money.format(totalExpense)}</strong>
            <small>({visible.length} of {data.expenses.length} records)</small>
          </span>
        </div>

        <DataTable
          columns={expensesColumns}
          rows={visible}
          searchPlaceholder="Search by title, category, paid to, note..."
        />
      </div>
    );
  };

  function renderAttendance() {
    const methodIcon = {
      biometric: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 3"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 17h2"/><path d="M20 17a5 5 0 0 1-5 5"/><path d="M6 10a6 6 0 0 1 11.56-2"/><path d="M9 15a3.5 3.5 0 0 1-.5-1.8"/></svg>,
      manual: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    };

    const filtered = attendanceView === "today"
      ? data.attendance.filter(r => {
          const d = new Date(r.date);
          const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
          return iso === attendanceDate;
        })
      : data.attendance.filter(r => {
          const d = new Date(r.date);
          const mon = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
          return mon === attendanceMonth;
        });

    const presentCount = filtered.filter(r => r.status === "present" || r.status === "late").length;
    const absentCount = filtered.filter(r => r.status === "absent").length;
    const leaveCount = filtered.filter(r => r.status === "leave").length;
    const biometricCount = filtered.filter(r => r.method === "biometric").length;
    const totalEmployees = data.employees.filter(e => e.status === "active").length;

    const todayAttMap = {};
    if (attendanceView === "today") {
      filtered.forEach(r => { if (r.employee?._id) todayAttMap[r.employee._id] = r; });
    }

    return (
      <div className="stack">
        {/* Header */}
        <SectionHeader
          eyebrow="Staff Attendance"
          title="Employee Attendance Register"
          action={
            <div className="flex flex-wrap gap-2">
              <button
                className={`btn ${attendanceTab === "register" ? "primary" : "soft"}`}
                onClick={() => setAttendanceTab("register")}
              ><svg style={{display:"inline",verticalAlign:"-2px",marginRight:"5px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>Register</button>
              <button
                className={`btn ${attendanceTab === "biometric" ? "primary" : "soft"}`}
                onClick={() => setAttendanceTab("biometric")}
              ><svg style={{display:"inline",verticalAlign:"-2px",marginRight:"5px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 3"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 17h2"/><path d="M20 17a5 5 0 0 1-5 5"/><path d="M6 10a6 6 0 0 1 11.56-2"/><path d="M9 15a3.5 3.5 0 0 1-.5-1.8"/></svg>Biometric</button>
              {isAdmin && (
                <button
                  className={`btn ${attendanceTab === "enroll" ? "primary" : "soft"}`}
                  onClick={() => { setAttendanceTab("enroll"); setEnrollStatus(null); }}
                ><svg style={{display:"inline",verticalAlign:"-2px",marginRight:"5px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04.054-.09A13.916 13.916 0 0 0 8 11a4 4 0 1 1 8 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0 0 15.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 0 0 8 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/></svg>Enroll</button>
              )}
            </div>
          }
        />

        {attendanceTab === "register" && (
          <>
            {/* Stats row */}
            <div className="stats-grid premium-stats">
              <StatCard icon="check" label="Present / Late" tone="green" value={presentCount} helper={`of ${totalEmployees} active staff`} />
              <StatCard icon="due" label="Absent" tone="red" value={absentCount} helper={`of ${totalEmployees} active staff`} />
              <StatCard icon="marks" label="On Leave" tone="blue" value={leaveCount} helper="approved leaves" />
              <StatCard icon="eye" label="Biometric" tone="violet" value={biometricCount} helper="scanned in today" />
            </div>

            {/* Filters + Add button */}
            <div className="table-card smart-table-card">
              <div className="table-toolbar">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                    <button className={`px-3 py-1.5 ${attendanceView==="today"?"bg-violet-600 text-white":"bg-white text-slate-600 hover:bg-slate-50"}`} onClick={()=>setAttendanceView("today")}>Daily</button>
                    <button className={`px-3 py-1.5 ${attendanceView==="monthly"?"bg-violet-600 text-white":"bg-white text-slate-600 hover:bg-slate-50"}`} onClick={()=>setAttendanceView("monthly")}>Monthly</button>
                  </div>
                  {attendanceView === "today"
                    ? <input type="date" value={attendanceDate} onChange={e=>setAttendanceDate(e.target.value)} className="control" style={{width:"160px"}} />
                    : <input type="month" value={attendanceMonth} onChange={e=>setAttendanceMonth(e.target.value)} className="control" style={{width:"160px"}} />
                  }
                </div>
                <button onClick={() => openModal("attendance")} className="btn primary">+ Mark Attendance</button>
              </div>

            {/* Attendance table */}
            <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Date</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Status</th>
                      <th>Method</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={8} className="empty-cell">No attendance records for this period.</td></tr>
                    ) : filtered.map(r => {
                      const d = new Date(r.date);
                      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
                      return (
                        <tr key={r._id}>
                          <td><strong>{r.employee?.name || "—"}</strong></td>
                          <td className="capitalize">{r.employee?.role || "—"}</td>
                          <td>{dateStr}</td>
                          <td>{r.checkIn || "—"}</td>
                          <td>{r.checkOut || "—"}</td>
                          <td>
                            <span className={`status dot-status ${r.status?.replace(/\s+/g,"-") || "active"}`}>{r.status}</span>
                          </td>
                          <td>
                            <span className="flex items-center gap-1 text-xs">
                              {methodIcon[r.method] || null} {r.method}
                            </span>
                          </td>
                          <td>
                            <div className="action-row compact">
                              <ActionButton icon="edit" label="Edit attendance" onClick={() => openModal("attendance", { _id: r._id, employee: r.employee?._id, date: dateStr, checkIn: r.checkIn, checkOut: r.checkOut, status: r.status, method: r.method, note: r.note })} />
                              <ActionButton icon="delete" label="Delete attendance" tone="danger" onClick={() => handleDelete("attendance", r._id)} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick bulk mark panel */}
            {attendanceView === "today" && (() => {
              const unmarked = data.employees.filter(e => e.status === "active" && !todayAttMap[e._id]);
              if (unmarked.length === 0) return null;
              return (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-3"><svg style={{display:"inline",verticalAlign:"-2px",marginRight:"6px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>{unmarked.length} employee{unmarked.length > 1 ? "s" : ""} not yet marked for {attendanceDate}</p>
                  <div className="flex flex-wrap gap-2">
                    {unmarked.slice(0, 10).map(e => (
                      <span key={e._id} className="rounded-full bg-white border border-amber-300 px-3 py-1 text-xs text-amber-700">{e.name}</span>
                    ))}
                    {unmarked.length > 10 && <span className="rounded-full bg-white border border-amber-300 px-3 py-1 text-xs text-amber-700">+{unmarked.length - 10} more</span>}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {attendanceTab === "biometric" && (
          <div className="biometric-tab-container flex flex-col items-center gap-6">
            {/* Biometric Terminal Card */}
            <div className="biometric-terminal-card w-full max-w-sm rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 p-6 shadow-2xl text-white">
              {/* Terminal header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Biometric Terminal</p>
                  <p className="text-xs text-slate-500 mt-0.5">DEVICE: TERMINAL-01</p>
                </div>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)] animate-pulse" />
              </div>

              {/* Clock */}
              <div className="text-center mb-5">
                <p className="text-3xl font-bold font-mono tracking-wider">
                  {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>

              {/* Employee selector */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5">Select Employee</label>
                <select
                  value={biometricEmployee}
                  onChange={e => { setBiometricEmployee(e.target.value); setBiometricResult(null); }}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">— Choose employee —</option>
                  {data.employees.filter(e => e.status === "active").map(e => (
                    <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              {/* Fingerprint scan button */}
              <button
                onClick={handleBiometricScan}
                disabled={!biometricEmployee || biometricScanning}
                className={`w-full rounded-xl py-4 flex flex-col items-center gap-2 transition-all font-medium
                  ${biometricScanning ? "bg-violet-700 opacity-80 cursor-wait" : !biometricEmployee ? "bg-slate-700 cursor-not-allowed opacity-50" : "bg-violet-600 hover:bg-violet-500 active:scale-95 shadow-lg shadow-violet-900/40"}`}
              >
                <span className={biometricScanning ? "animate-pulse" : ""}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 3"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 17h2"/><path d="M20 17a5 5 0 0 1-5 5"/><path d="M6 10a6 6 0 0 1 11.56-2"/><path d="M9 15a3.5 3.5 0 0 1-.5-1.8"/></svg></span>
                <span className="text-sm">{biometricScanning ? "Scanning…" : "Tap to Scan Fingerprint"}</span>
              </button>

              {/* Scan result */}
              {biometricResult && (
                <div className="mt-4 rounded-lg bg-slate-700 p-3 text-sm">
                  <p className="font-semibold text-emerald-400">✓ {biometricResult.employee?.name || "Employee"}</p>
                  {biometricResult.checkIn && <p className="text-slate-300 text-xs mt-1">Check-In: <span className="text-white">{biometricResult.checkIn}</span></p>}
                  {biometricResult.checkOut && <p className="text-slate-300 text-xs">Check-Out: <span className="text-white">{biometricResult.checkOut}</span></p>}
                  <span className={`inline-block mt-1.5 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${ATTENDANCE_STATUS_COLOR[biometricResult.status] || "bg-slate-600 text-white"}`}>{biometricResult.status}</span>
                </div>
              )}
            </div>

            {/* Today's biometric log */}
            <div className="w-full max-w-2xl">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Today's Biometric Log</h3>
              <div className="biometric-log-wrap bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Employee</th>
                      <th className="px-4 py-3 text-left">Check-In</th>
                      <th className="px-4 py-3 text-left">Check-Out</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const todayRecords = data.attendance.filter(r => {
                        const d = new Date(r.date);
                        return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}` === todayStr && r.method === "biometric";
                      });
                      if (!todayRecords.length) return <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No biometric records for today yet.</td></tr>;
                      return todayRecords.map(r => (
                        <tr key={r._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{r.employee?.name || "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{r.checkIn || "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{r.checkOut || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ATTENDANCE_STATUS_COLOR[r.status] || "bg-slate-100 text-slate-600"}`}>{r.status}</span></td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Biometric Enrollment Tab ─────────────────────────────────────────── */}
        {attendanceTab === "enroll" && (
          <div className="stack">
            {/* Info banner */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800 flex gap-2.5 items-start">
              <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <span>Register employee fingerprints or biometric credentials (Windows Hello, USB fingerprint reader). Each employee can have multiple devices registered. Click <strong>Register</strong> next to an employee to enroll their biometric.</span>
            </div>

            {/* Browser support warning */}
            {!webauthnSupported && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex gap-2.5 items-start">
                <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                <span>This browser does not support WebAuthn/biometric registration. Use a modern browser (Chrome, Edge, Firefox) with Windows Hello or a USB fingerprint scanner.</span>
              </div>
            )}

            {/* Status feedback */}
            {enrollStatus && (
              <div className={`rounded-xl px-4 py-3 text-sm flex gap-2.5 items-start ${enrollStatus.success ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-rose-50 border border-rose-200 text-rose-800"}`}>
                <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {enrollStatus.success
                    ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></>
                    : <><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></>}
                </svg>
                <span>{enrollStatus.message}</span>
              </div>
            )}

            {/* Employee enrollment table */}
            <div className="table-card smart-table-card enroll-table-wrap">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Biometrics Registered</th>
                    <th className="px-4 py-3 text-left">Enroll</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.employees.filter(e => e.status === "active").length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No active employees found.</td></tr>
                  )}
                  {data.employees.filter(e => e.status === "active").map(emp => {
                    const credCount = emp.biometricCredentials?.length || 0;
                    const isRegistering = enrollLoading === emp._id;
                    return (
                      <tr key={emp._id} className={`hover:bg-slate-50 transition-colors ${isRegistering ? "bg-violet-50" : ""}`}>
                        <td className="px-4 py-3 font-medium text-slate-800">{emp.name}</td>
                        <td className="px-4 py-3 text-slate-500 capitalize">{emp.role}</td>
                        <td className="px-4 py-3">
                          {credCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 3"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M6 10a6 6 0 0 1 11.56-2"/></svg>
                              {credCount} registered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold px-2.5 py-1">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleEnrollBiometric(emp._id)}
                            disabled={isRegistering || !webauthnSupported || enrollLoading !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {isRegistering ? (
                              <>
                                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                Waiting…
                              </>
                            ) : credCount > 0 ? (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                                Add More
                              </>
                            ) : (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 3"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M6 10a6 6 0 0 1 11.56-2"/></svg>
                                Register
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Enrolled device names per employee (collapsed view) */}
            {data.employees.some(e => e.status === "active" && (e.biometricCredentials?.length || 0) > 0) && (
              <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-700">Registered Devices</p>
                  <p className="text-xs text-slate-400 mt-0.5">All enrolled biometric credentials per employee</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {data.employees
                    .filter(e => e.status === "active" && (e.biometricCredentials?.length || 0) > 0)
                    .map(emp => (
                      <div key={emp._id} className="px-4 py-3 flex items-start gap-3">
                        <div className="shrink-0 w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                          <span className="text-violet-700 text-xs font-bold">{emp.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(emp.biometricCredentials || []).map((cred, idx) => (
                              <span key={cred.credentialID || idx} className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-600 text-xs px-2 py-0.5">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 12h10"/></svg>
                                {cred.deviceName || `Device ${idx + 1}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attendance modal form */}
        {modal === "attendance" && (
          <Modal title={editingId ? "Edit Attendance" : "Mark Attendance"} onClose={() => setModal(null)}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
                <select name="employee" value={form.employee || ""} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required>
                  <option value="">— Select employee —</option>
                  {data.employees.filter(e => e.status === "active").map(e => (
                    <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input type="date" name="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                  <select name="status" value={form.status || "present"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required>
                    {["present", "absent", "late", "leave", "half-day"].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Check-In</label>
                  <input type="time" name="checkIn" value={form.checkIn || ""} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Check-Out</label>
                  <input type="time" name="checkOut" value={form.checkOut || ""} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Method</label>
                <select name="method" value={form.method || "manual"} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="manual">Manual</option>
                  <option value="biometric">Biometric</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                <input type="text" value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Optional note" />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700">
                  {editingId ? "Update" : "Mark"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <AdminLayout activeView={activeView} onLogout={onLogout} onOpenUserSettings={() => openModal("userSettings")} onThemeChange={setTheme} onViewChange={setActiveView} theme={theme} user={user}>
      {error && <p className="alert error">{error}</p>}
      {success && (
        <div className="done-alert" role="status" aria-live="polite">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
          <span>{success.replace(/^Done!\s*/, "")}</span>
          <button aria-label="Dismiss" type="button" onClick={() => setSuccess("")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      )}
      {loading && <div className="erp-loading-bar" aria-hidden="true" />}
      {activeView === "dashboard" && renderDashboard()}
      {activeView === "students" && studentReadAllowed && renderStudents()}
      {activeView === "fees" && renderFees()}
      {activeView === "expenses" && financeAllowed && renderExpenses()}
      {activeView === "employees" && renderEmployees()}
      {activeView === "attendance" && attendanceAllowed && renderAttendance()}
      {activeView === "classTeachers" && isAdmin && renderClassTeachers()}
      {activeView === "sections" && isAdmin && renderSections()}
      {activeView === "classrooms" && isAdmin && renderClassrooms()}
      {activeView === "marks" && renderMarks()}
      {activeView === "resultCards" && renderResultCards()}
      {activeView === "classwiseResults" && renderClasswiseResults()}
      {activeView === "routines" && renderRoutines()}
      {activeView === "salaries" && renderSalaries()}
      {activeView === "reports" && renderReports()}
      {activeView === "settings" && renderSettings()}

      {profileStudent && (
        <Modal title="Student Full Profile" onClose={() => setProfileStudent(null)}>
          <div className="profile-grid">
            <div className="info-card">
              <h3>{profileStudent.name}</h3>
              <p><strong>Class:</strong> {profileStudent.className}</p>
              <p><strong>Roll:</strong> {profileStudent.rollNumber}</p>
              <p><strong>Guardian:</strong> {profileStudent.contactInfo?.guardianName || "Not set"}</p>
              <p><strong>Phone:</strong> {profileStudent.contactInfo?.phone || "Not set"}</p>
              <p><strong>Email:</strong> {profileStudent.contactInfo?.email || "Not set"}</p>
              <p><strong>Date of Birth:</strong> {profileStudent.dateOfBirth ? toDateInput(profileStudent.dateOfBirth) : "Not set"}</p>
              <p><strong>Admission Date:</strong> {profileStudent.admissionDate ? toDateInput(profileStudent.admissionDate) : "Not set"}</p>
              <p><strong>Address:</strong> {profileStudent.contactInfo?.address || "Not set"}</p>
              <p><strong>Total Due:</strong> {money.format(profileStudent.dueAmount || 0)}</p>
            </div>
            <div className="info-card">
              <h3>Due Payments</h3>
              {selectedProfilePayments.length ? selectedProfilePayments.map((payment) => (
                <p key={payment._id}>{payment.feeType} {payment.billingMonth || payment.term}: due {money.format(payment.dueAmount || 0)}</p>
              )) : <p>No payment records.</p>}
            </div>
            <div className="info-card full-span">
              <h3>Marks</h3>
              {selectedProfileMarks.length ? selectedProfileMarks.map((mark) => (
                <p key={mark._id}>{mark.subject} - {mark.examType.replace("_", " ")} #{mark.examNo}: {mark.obtainedMarks}/{mark.totalMarks}, weighted contribution {mark.weightedScore}%</p>
              )) : <p>No mark records.</p>}
            </div>
            <div className="info-card full-span">
              <h3>Final Results</h3>
              {selectedProfileResults.length ? selectedProfileResults.map((result) => (
                <p key={result.id}>{result.subject} {result.academicYear}: <strong>{result.finalResultPercent}%</strong> <GradeBadge grade={result.grade} /> <ResultStatus status={result.resultStatus} /></p>
              )) : <p>No final result summary yet.</p>}
            </div>
          </div>
        </Modal>
      )}

      {modal && modal !== "attendance" && (
        <Modal title={modalTitle} onClose={() => { setModal(null); setEditingId(""); }}>
          <form className="modal-form" onSubmit={handleSubmit}>
            <datalist id="classes">{classNames.map((name) => <option key={name} value={name} />)}</datalist>
            <datalist id="subjects">{subjectOptionsForForm.map((subject) => <option key={subject} value={subject} />)}</datalist>
            {modal === "classFee" && (
              <div className="form-grid">
                <Field label="Class Name"><input className="control" list="classes" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} required /></Field>
                {[
                  ["admissionFee", "Admission Fee"],
                  ["sessionFee", "Session Fee"],
                  ["monthlyFee", "Monthly Fee"],
                  ["examFee", "Exam Fee"],
                ].map(([field, label]) => (
                  <Field label={label} key={field}><input className="control" min="0" type="number" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></Field>
                ))}
              </div>
            )}

            {modal === "student" && (
              <div className="form-grid">
                <Field label="Name"><input className="control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Class">
                  <select className="control" value={form.classFee} onChange={(e) => setForm({ ...form, classFee: e.target.value, section: "" })} required>
                    <option value="">Select class</option>
                    {data.classFees.map((item) => <option key={item._id} value={item._id}>{item.className}</option>)}
                  </select>
                </Field>
                <Field label="Section">
                  <select className="control" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
                    <option value="">No section</option>
                    {data.sections
                      .filter((s) => {
                        const cf = data.classFees.find((f) => f._id === form.classFee);
                        return cf && s.className === cf.className;
                      })
                      .map((s) => <option key={s._id} value={s._id}>{s.sectionName}</option>)}
                  </select>
                </Field>
                <Field label="Gender">
                  <select className="control" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="">Not specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Roll / ID"><input className="control" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} required /></Field>
                <Field label="Guardian"><input className="control" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></Field>
                <Field label="Phone"><input className="control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Email"><input className="control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Date of Birth"><input className="control" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></Field>
                <Field label="Admission Date"><input className="control" type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} /></Field>
                <Field label="Status"><select className="control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
                <Field label="Address"><textarea className="control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
              </div>
            )}

            {modal === "payment" && (
              <div className="form-grid">
                <Field label="Student"><select className="control" value={form.student} onChange={(e) => {
                  const auto = getStudentFeeAutoValues(e.target.value, form.feeType, form.billingMonth, form.term);
                  setForm({ ...form, student: e.target.value, amount: auto.amount || form.amount, paidAmount: auto.paidAmount || 0 });
                }} required><option value="">Select student</option>{data.students.map((item) => <option key={item._id} value={item._id}>{item.name} - {item.className}</option>)}</select></Field>
                <Field label="Fee Type"><select className="control" value={form.feeType} onChange={(e) => {
                  const auto = getStudentFeeAutoValues(form.student, e.target.value, form.billingMonth, form.term);
                  setForm({ ...form, feeType: e.target.value, amount: auto.amount || form.amount, paidAmount: auto.paidAmount || 0 });
                }}><option value="admission">Admission</option><option value="session">Session</option><option value="monthly">Monthly</option><option value="exam">Exam</option></select></Field>
                <Field label="Amount"><input className="control" min="0" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
                <Field label="Paid Amount"><input className="control" min="0" type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} /></Field>
                <Field label="Billing Month"><input className="control" type="month" value={form.billingMonth} onChange={(e) => setForm({ ...form, billingMonth: e.target.value })} /></Field>
                <Field label="Exam Term"><input className="control" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} /></Field>
                <div className="info-card compact-info"><strong>Due After Paid:</strong> {money.format(studentFeeDuePreview)} <small>Previous due: {money.format(studentFeeAutoPreview?.dueAmount || 0)}</small></div>
                <Field label="Note"><input className="control" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
              </div>
            )}

            {modal === "employee" && (
              <div className="form-grid">
                <Field label="Name"><input className="control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Role"><select className="control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, isClassTeacher: e.target.value === "teacher" ? form.isClassTeacher : false })}><option value="teacher">Teacher</option><option value="staff">Staff</option><option value="admin">Admin</option><option value="accountant">Accountant</option><option value="accounts">Accounts</option></select></Field>
                <Field label="Salary Type"><select className="control" value={form.salaryType} onChange={(e) => setForm({ ...form, salaryType: e.target.value })}><option value="monthly">Monthly</option><option value="fixed">Fixed</option><option value="hourly">Hourly</option></select></Field>
                <Field label="Salary Amount"><input className="control" min="0" type="number" value={form.salaryAmount} onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })} /></Field>
                <Field label="Assigned Class"><input className="control" value={form.assignedClass} onChange={(e) => setForm({ ...form, assignedClass: e.target.value })} list="classes" /></Field>
                {form.role === "teacher" && (
                  <label className="form-field checkbox-field">
                    <span>Class Teacher</span>
                    <label className="inline-check">
                      <input checked={Boolean(form.isClassTeacher)} type="checkbox" onChange={(e) => setForm({ ...form, isClassTeacher: e.target.checked })} />
                      Assign scoped class access
                    </label>
                    <small>Only class teachers can access the assigned class records as a teacher.</small>
                  </label>
                )}
                <Field label="Subject"><input className="control" list="subjects" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
                <Field label="Phone"><input className="control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Email"><input className="control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Joining Date"><input className="control" type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></Field>
                <Field label="Address"><textarea className="control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
                <Field label="Status"><select className="control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
              </div>
            )}

            {modal === "salary" && (
              <div className="form-grid">
                <Field label="Employee"><select className="control" value={form.employee} onChange={(e) => {
                  const auto = getSalaryAutoValues(e.target.value, form.salaryMonth);
                  setForm({ ...form, employee: e.target.value, amount: auto.amount, paidAmount: auto.paidAmount });
                }} required><option value="">Select employee</option>{data.employees.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></Field>
                <Field label="Salary Month"><input className="control" type="month" value={form.salaryMonth} onChange={(e) => {
                  const auto = getSalaryAutoValues(form.employee, e.target.value);
                  setForm({ ...form, salaryMonth: e.target.value, amount: auto.amount, paidAmount: auto.paidAmount });
                }} /></Field>
                <Field label="Amount"><input className="control" min="0" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
                <Field label="Paid Amount"><input className="control" min="0" type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} /></Field>
                <div className="info-card compact-info"><strong>Due Payment:</strong> {money.format(salaryDuePreview)} <small>Previous due: {money.format(salaryAutoPreview?.dueAmount || 0)}</small></div>
                <Field label="Note"><input className="control" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
              </div>
            )}

            {modal === "mark" && (
              <div className="form-grid">
                <Field label="Student"><select className="control" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} required><option value="">Select student</option>{markEntryStudents.map((item) => <option key={item._id} value={item._id}>{item.name} - {item.className}</option>)}</select></Field>
                <Field label="Subject"><input className="control" list="subjects" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></Field>
                <Field label="Academic Year"><input className="control" min="2000" type="number" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></Field>
                <Field label="Exam Type"><select className="control" value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value, examNo: 1 })}><option value="monthly">Monthly Exam</option><option value="semester">Semester Exam</option><option value="class_test">Class Test</option></select></Field>
                <Field label="Exam Number" hint="Monthly: 1-12, Semester: 1-3, Class test: 1-2 per month"><input className="control" min="1" type="number" value={form.examNo} onChange={(e) => setForm({ ...form, examNo: e.target.value })} /></Field>
                <Field label="Month" hint="Required for class tests"><input className="control" type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></Field>
                <Field label="Total Marks"><input className="control" min="1" type="number" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} required /></Field>
                <Field label="Obtained Marks"><input className="control" min="0" type="number" value={form.obtainedMarks} onChange={(e) => setForm({ ...form, obtainedMarks: e.target.value })} required /></Field>
                <Field label="Final Result Contribution %"><input className="control" min="0" max="100" type="number" value={form.contributionPercent} onChange={(e) => setForm({ ...form, contributionPercent: e.target.value })} /></Field>
                <Field label="Note"><input className="control" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
              </div>
            )}

            {modal === "routine" && (
              <div className="form-grid">
                <Field label="Class"><input className="control" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} list="classes" required /></Field>
                <Field label="Day"><select className="control" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>{["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => <option key={day} value={day}>{day}</option>)}</select></Field>
                <Field label="Start Time"><input className="control" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
                <Field label="End Time"><input className="control" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
                <Field label="Subject"><input className="control" list="subjects" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></Field>
                <Field label="Teacher Name"><input className="control" value={form.teacherName} onChange={(e) => setForm({ ...form, teacherName: e.target.value })} required /></Field>
                <Field label="Room"><input className="control" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></Field>
                <Field label="Status"><select className="control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
              </div>
            )}

            {modal === "increment" && (
              <div className="form-grid">
                <Field label="Employee"><select className="control" value={form.employee} onChange={(e) => {
                  const selected = data.employees.find((item) => item._id === e.target.value);
                  setForm({ ...form, employee: e.target.value, previousSalary: selected?.salaryAmount || 0, newSalary: selected?.salaryAmount || 0 });
                }} required><option value="">Select employee</option>{data.employees.map((item) => <option key={item._id} value={item._id}>{item.name} - {item.role}</option>)}</select></Field>
                <Field label="Previous Salary"><input className="control" min="0" type="number" value={form.previousSalary} onChange={(e) => setForm({ ...form, previousSalary: e.target.value })} /></Field>
                <Field label="Increment Amount"><input className="control" min="0" type="number" value={form.incrementAmount} onChange={(e) => setForm({ ...form, incrementAmount: e.target.value, newSalary: Number(form.previousSalary || 0) + Number(e.target.value || 0) })} /></Field>
                <Field label="New Salary"><input className="control" min="0" type="number" value={form.newSalary} onChange={(e) => setForm({ ...form, newSalary: e.target.value })} /></Field>
                <Field label="Effective Date"><input className="control" type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} /></Field>
                <Field label="Reason"><textarea className="control" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
              </div>
            )}

            {modal === "expense" && (
              <div className="form-grid">
                <Field label="Title / Purpose" hint="What was purchased or spent on?">
                  <input className="control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Sports Day banner printing" />
                </Field>
                <Field label="Category">
                  <select className="control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="asset">Asset Purchase</option>
                    <option value="tour">Tour / Field Trip</option>
                    <option value="food">Food &amp; Refreshments</option>
                    <option value="gift">Gifts &amp; Awards</option>
                    <option value="event">Event Costs (Sports Day / Teachers Day etc.)</option>
                    <option value="stationery">Stationery &amp; Supplies</option>
                    <option value="utility">Utility Bills (Electricity / Water etc.)</option>
                    <option value="maintenance">Maintenance &amp; Repair</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Amount (BDT)">
                  <input className="control" min="0" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </Field>
                <Field label="Date">
                  <input className="control" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </Field>
                <Field label="Paid To" hint="Vendor or supplier name">
                  <input className="control" value={form.paidTo} onChange={(e) => setForm({ ...form, paidTo: e.target.value })} placeholder="Optional — e.g. ABC Stationery Shop" />
                </Field>
                <Field label="Payment Method">
                  <select className="control" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                  </select>
                </Field>
                <Field label="Receipt / Bill No." hint="Leave blank if unavailable">
                  <input className="control" value={form.receiptNo} onChange={(e) => setForm({ ...form, receiptNo: e.target.value })} placeholder="Optional" />
                </Field>
                <Field label="Note / Details">
                  <textarea className="control" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Additional context, approval, or description..." />
                </Field>
              </div>
            )}

            {modal === "userSettings" && (
              <div className="form-grid user-settings-form">
                <div className="profile-photo-editor full-span">
                  <span className="profile-avatar settings-preview-avatar">
                    {form.photoUrl ? <img alt="Profile preview" src={form.photoUrl} /> : <span className="avatar-initials">{String(form.name || "U").slice(0, 2).toUpperCase()}</span>}
                  </span>
                  <div>
                    <strong>Profile Photo</strong>
                    <p>Upload a small image or paste an image URL.</p>
                    <input className="control" accept="image/*" type="file" onChange={handleProfilePhotoChange} />
                  </div>
                </div>
                <Field label="Name"><input className="control" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Email"><input className="control" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
                <Field label="Photo URL"><input className="control" value={form.photoUrl || ""} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="Paste image URL or upload above" /></Field>
                <Field label="Current Password" hint="Required only when changing password"><input className="control" type="password" value={form.currentPassword || ""} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></Field>
                <Field label="New Password"><input className="control" minLength="6" type="password" value={form.newPassword || ""} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></Field>
                <Field label="Confirm Password"><input className="control" minLength="6" type="password" value={form.confirmPassword || ""} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></Field>

                {/* ── Biometric / Windows Hello ────────────────────────── */}
                {webauthnSupported && (
                  <div className="full-span" style={{ borderTop: "1px solid #e2e8f0", paddingTop: 18, marginTop: 4 }}>
                    <strong style={{ fontSize: 13, color: "#0f172a", display: "block", marginBottom: 4 }}>
                      Fingerprint / Windows Hello
                    </strong>
                    <p style={{ fontSize: 12, color: "var(--edu-muted)", marginBottom: 12 }}>
                      Register your fingerprint or Windows Hello so you can log in without a password.
                    </p>

                    {/* Registered credentials */}
                    {webauthnCredentials.length > 0 && (
                      <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                        {webauthnCredentials.map((c) => (
                          <div key={c.credentialID} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f1f5f9", borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
                            <span>
                              <strong>{c.deviceName || "Device"}</strong>
                              <span style={{ color: "var(--edu-muted)", marginLeft: 8 }}>
                                {c.addedAt ? new Date(c.addedAt).toLocaleDateString() : ""}
                              </span>
                            </span>
                            <button type="button" className="btn danger" style={{ fontSize: 11, padding: "2px 10px" }} onClick={() => removeBiometric(c.credentialID)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn outline"
                      disabled={webauthnLoading}
                      onClick={registerBiometric}
                      style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                        <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04.054-.09A13.916 13.916 0 0 0 8 11a4 4 0 1 1 8 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0 0 15.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 0 0 8 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                      </svg>
                      {webauthnLoading ? "Waiting for biometric..." : webauthnCredentials.length > 0 ? "Add Another Device" : "Register Fingerprint / Windows Hello"}
                    </button>

                    {webauthnStatus === "success" && <p className="alert success" style={{ marginTop: 10, fontSize: 12 }}>Biometric registered! You can now log in with your fingerprint.</p>}
                    {webauthnStatus === "cancelled" && <p className="alert error" style={{ marginTop: 10, fontSize: 12 }}>Cancelled. Please try again.</p>}
                    {webauthnStatus.startsWith("error:") && <p className="alert error" style={{ marginTop: 10, fontSize: 12 }}>{webauthnStatus.slice(6)}</p>}
                  </div>
                )}
              </div>
            )}

            {modal === "schoolSettings" && (
              <div className="form-grid">
                <Field label="School Name"><input className="control" value={form.schoolName || ""} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} required /></Field>
                <Field label="Short Name"><input className="control" value={form.shortName || ""} onChange={(e) => setForm({ ...form, shortName: e.target.value })} /></Field>
                <Field label="Subtitle"><input className="control" value={form.subtitle || ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field>
                <Field label="Academic Year"><input className="control" value={form.academicYear || ""} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></Field>
                <Field label="Session"><input className="control" value={form.academicSession || ""} onChange={(e) => setForm({ ...form, academicSession: e.target.value })} /></Field>
                <Field label="Class Start Time"><input className="control" type="time" value={form.classStartTime || "09:00"} onChange={(e) => setForm({ ...form, classStartTime: e.target.value })} /></Field>
                <Field label="Left Logo URL"><input className="control" value={form.leftLogoUrl || ""} onChange={(e) => setForm({ ...form, leftLogoUrl: e.target.value })} placeholder="Paste logo image URL" /></Field>
                <Field label="Right Logo URL"><input className="control" value={form.rightLogoUrl || ""} onChange={(e) => setForm({ ...form, rightLogoUrl: e.target.value })} placeholder="Paste logo image URL" /></Field>
                <Field label="Address"><input className="control" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
                <Field label="Phone"><input className="control" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="School Email"><input className="control" type="email" value={form.schoolEmail || ""} onChange={(e) => setForm({ ...form, schoolEmail: e.target.value })} /></Field>
                <Field label="Support Email"><input className="control" type="email" value={form.supportEmail || ""} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} /></Field>
                <Field label="Website"><input className="control" value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
                <Field label="Report Title"><input className="control" value={form.defaultExamTitle || ""} onChange={(e) => setForm({ ...form, defaultExamTitle: e.target.value })} /></Field>
                <Field label="Pass Mark %"><input className="control" min="0" max="100" type="number" value={form.defaultPassMark || 33} onChange={(e) => setForm({ ...form, defaultPassMark: e.target.value })} /></Field>
                <Field label="Principal Name"><input className="control" value={form.principalName || ""} onChange={(e) => setForm({ ...form, principalName: e.target.value })} /></Field>
                <Field label="Default Remarks"><input className="control" value={form.resultRemarksDefault || ""} onChange={(e) => setForm({ ...form, resultRemarksDefault: e.target.value })} /></Field>
                <Field label="Admission/Notice Text"><textarea className="control" value={form.admissionNotice || ""} onChange={(e) => setForm({ ...form, admissionNotice: e.target.value })} /></Field>
              </div>
            )}

            {modal === "section" && (
              <div className="form-grid">
                <Field label="Class Name" hint="e.g. Class 5, KG, Class 10 Science">
                  <input className="control" list="classes" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} required />
                </Field>
                <Field label="Section Name" hint="e.g. A, B, Red, Blue">
                  <input className="control" placeholder="A" value={form.sectionName} onChange={(e) => setForm({ ...form, sectionName: e.target.value })} required />
                </Field>
                <Field label="Class Teacher" hint="Assign a teacher user to this section">
                  <select className="control" value={form.classTeacher} onChange={(e) => setForm({ ...form, classTeacher: e.target.value })}>
                    <option value="">No teacher assigned</option>
                    {data.teacherUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </Field>
                <Field label="Academic Year">
                  <input className="control" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
                </Field>
              </div>
            )}

            {modal === "classroom" && (
              <div className="form-grid">
                <Field label="Room Number" hint="e.g. 101, G-01, Lab-2">
                  <input className="control" value={form.roomNo} onChange={(e) => setForm({ ...form, roomNo: e.target.value })} required placeholder="101" />
                </Field>
                <Field label="Floor" hint="e.g. Ground, 1st, 2nd">
                  <input className="control" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="1st" />
                </Field>
                <Field label="Number of Benches">
                  <input className="control" type="number" min="0" value={form.benchCount} onChange={(e) => setForm({ ...form, benchCount: e.target.value })} />
                </Field>
                <Field label="Student Capacity">
                  <input className="control" type="number" min="0" value={form.studentCapacity} onChange={(e) => setForm({ ...form, studentCapacity: e.target.value })} />
                </Field>
                <Field label="Notes" hint="Optional room description">
                  <input className="control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Science lab, corner room..." />
                </Field>

                {/* Shifts */}
                <div className="full-span" style={{borderTop:"1px solid var(--edu-border)",paddingTop:"16px",marginTop:"4px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
                    <strong style={{fontSize:"13px"}}>Shifts / Time Assignments ({(form.shifts||[]).length})</strong>
                    <button type="button" className="btn soft" style={{fontSize:"12px",padding:"4px 12px"}}
                      onClick={() => setForm({ ...form, shifts: [...(form.shifts||[]), { shiftName: "", className: "", section: "", classTeacher: "" }] })}>
                      + Add Shift
                    </button>
                  </div>
                  {(form.shifts||[]).length === 0 && (
                    <p style={{fontSize:"13px",color:"var(--edu-muted)",margin:"0 0 8px"}}>No shifts yet. Click "Add Shift" to assign a class to this room.</p>
                  )}
                  {(form.shifts||[]).map((shift, idx) => {
                    const sectionsForClass = data.sections.filter((s) => s.className === shift.className);
                    const teachersForClass = data.employees.filter((e) => e.role === "teacher");
                    return (
                      <div key={idx} className="shift-row-grid">
                        <label style={{fontSize:"12px",fontWeight:700,display:"flex",flexDirection:"column",gap:"4px"}}>
                          Shift Name
                          <input className="control" value={shift.shiftName} onChange={(e) => {
                            const s = [...form.shifts]; s[idx] = { ...s[idx], shiftName: e.target.value }; setForm({ ...form, shifts: s });
                          }} placeholder="Morning" style={{fontSize:"13px"}} />
                        </label>
                        <label style={{fontSize:"12px",fontWeight:700,display:"flex",flexDirection:"column",gap:"4px"}}>
                          Class
                          <select className="control" value={shift.className} onChange={(e) => {
                            const s = [...form.shifts]; s[idx] = { ...s[idx], className: e.target.value, section: "", classTeacher: "" }; setForm({ ...form, shifts: s });
                          }} style={{fontSize:"13px"}}>
                            <option value="">Select class</option>
                            {classNames.map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <label style={{fontSize:"12px",fontWeight:700,display:"flex",flexDirection:"column",gap:"4px"}}>
                          Section
                          <select className="control" value={shift.section} onChange={(e) => {
                            const s = [...form.shifts]; s[idx] = { ...s[idx], section: e.target.value }; setForm({ ...form, shifts: s });
                          }} style={{fontSize:"13px"}}>
                            <option value="">No section</option>
                            {sectionsForClass.map((sec) => <option key={sec._id} value={sec._id}>{sec.sectionName}</option>)}
                          </select>
                        </label>
                        <label style={{fontSize:"12px",fontWeight:700,display:"flex",flexDirection:"column",gap:"4px"}}>
                          Class Teacher
                          <select className="control" value={shift.classTeacher} onChange={(e) => {
                            const s = [...form.shifts]; s[idx] = { ...s[idx], classTeacher: e.target.value }; setForm({ ...form, shifts: s });
                          }} style={{fontSize:"13px"}}>
                            <option value="">No teacher</option>
                            {teachersForClass.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                          </select>
                        </label>
                        <button type="button" title="Remove shift" className="shift-delete-btn" style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:"18px",lineHeight:1,padding:"0 4px",marginBottom:"2px"}}
                          onClick={() => { const s = form.shifts.filter((_, i) => i !== idx); setForm({ ...form, shifts: s }); }}>
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {modal === "monthlyFees" && <Field label="Billing Month"><input className="control" type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></Field>}
            {modal === "examFees" && <Field label="Exam Term"><input className="control" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} required /></Field>}
            {modal === "monthlySalaries" && <Field label="Salary Month"><input className="control" type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></Field>}

            <div className="modal-actions">
              <button className="btn soft" type="button" onClick={() => { setModal(null); setEditingId(""); }}>Cancel</button>
              <button className="btn primary" type="submit">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
}
