import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import AdminLayout from "../layouts/AdminLayout";
import { getErrorMessage } from "../api";
import { erpApi, loadERPData } from "../services/erpService";

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
  student: { name: "", classFee: "", rollNumber: "", phone: "", email: "", guardianName: "", address: "", dateOfBirth: "", admissionDate: new Date().toISOString().slice(0, 10), status: "active" },
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
  });
  const [modal, setModal] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForms.classFee);
  const [profileStudent, setProfileStudent] = useState(null);
  const [resultCardFilter, setResultCardFilter] = useState({ student: "", exam: "" });
  const [classFilter, setClassFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("schoolManagerTheme") || "light");
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceTab, setAttendanceTab] = useState("register"); // "register" | "biometric"
  const [biometricEmployee, setBiometricEmployee] = useState("");
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricResult, setBiometricResult] = useState(null);
  const [bulkAttendanceRows, setBulkAttendanceRows] = useState([]);
  const [attendanceView, setAttendanceView] = useState("today"); // "today" | "monthly"
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expenseMonth, setExpenseMonth] = useState(() => new Date().toISOString().slice(0, 7));

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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loadERPData(token));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    setModal(type);
  }, [data.schoolSettings, user]);

  function showDoneAlert(message) {
    setSuccess(`Done! ${message}`);
  }

  const handleDelete = useCallback(async (type, id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    setError("");
    setSuccess("");
    try {
      if (type === "classFee") await erpApi.deleteClassFee(token, id);
      if (type === "student") await erpApi.deleteStudent(token, id);
      if (type === "employee") await erpApi.deleteEmployee(token, id);
      if (type === "mark") await erpApi.deleteMark(token, id);
      if (type === "routine") await erpApi.deleteRoutine(token, id);
      if (type === "increment") await erpApi.deleteIncrement(token, id);
      if (type === "attendance") await erpApi.deleteAttendance(token, id);
      if (type === "expense") await erpApi.deleteExpense(token, id);
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
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBiometricScanning(false);
    }
  }, [biometricEmployee, token, refresh]);

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
        editingId ? await erpApi.updateMark(token, editingId, form) : await erpApi.createMark(token, form);
        showDoneAlert(editingId ? "Mark updated." : "Mark entered.");
      }
      if (modal === "routine") {
        editingId ? await erpApi.updateRoutine(token, editingId, form) : await erpApi.createRoutine(token, form);
        showDoneAlert(editingId ? "Class routine updated." : "Class routine created.");
      }
      if (modal === "increment") {
        editingId ? await erpApi.updateIncrement(token, editingId, form) : await erpApi.createIncrement(token, form);
        showDoneAlert(editingId ? "Salary increment updated." : "Salary increment recorded.");
      }
      if (modal === "attendance") {
        editingId
          ? await erpApi.updateAttendance(token, editingId, form)
          : await erpApi.createAttendance(token, form);
        showDoneAlert(editingId ? "Attendance updated." : "Attendance marked.");
      }
      if (modal === "expense") {
        editingId
          ? await erpApi.updateExpense(token, editingId, form)
          : await erpApi.createExpense(token, form);
        showDoneAlert(editingId ? "Expense updated." : "Expense recorded.");
      }
      if (modal === "schoolSettings") {
        await erpApi.updateSchoolSettings(token, form);
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
      if (modal !== "userSettings") {
        await refresh();
      }
    } catch (err) {
      if (receiptWindow) receiptWindow.close();
      setError(getErrorMessage(err));
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
  const resultCardStudents = useMemo(() => {
    const map = new Map();
    resultCards.forEach((card) => {
      if (card.studentId && !map.has(card.studentId)) {
        map.set(card.studentId, card.student?.name || "Student");
      }
    });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [resultCards]);
  const resultCardExamOptions = useMemo(() => {
    const source = resultCardFilter.student ? resultCards.filter((card) => card.studentId === resultCardFilter.student) : resultCards;
    return source.map((card) => ({ id: card.id, label: `${card.student?.name || "Student"} - ${card.examLabel} (${card.academicYear})` }));
  }, [resultCards, resultCardFilter.student]);
  const visibleResultCards = useMemo(() => {
    return resultCards.filter((card) => {
      if (resultCardFilter.student && card.studentId !== resultCardFilter.student) return false;
      if (resultCardFilter.exam && card.id !== resultCardFilter.exam) return false;
      return true;
    });
  }, [resultCards, resultCardFilter]);

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
    { key: "name", label: "Student", search: (row) => `${row.name} ${row.rollNumber} ${row.contactInfo?.email || ""}`, render: (row) => <div><strong>{row.name}</strong><small>ID/Roll {row.rollNumber}</small></div> },
    { key: "class", label: "Class", search: (row) => row.className, render: (row) => row.className },
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
    { key: "classTeacher", label: "Class Teacher", render: (row) => <BooleanDot value={row.isClassTeacher} /> },
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

  const renderEmployees = () => (
    <>
      <SectionHeader
        eyebrow="Employee Management"
        title="Employees and Teachers"
        action={financeAllowed && <button className="btn primary" type="button" onClick={() => openModal("employee")}>Add Employee</button>}
      />
      <DataTable columns={employeesColumns} rows={data.employees} />
    </>
  );

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

  const renderMarks = () => (
    <div className="stack">
      <SectionHeader
        eyebrow="Academic Marks"
        title="Monthly, Semester, and Class Test Marks"
        action={teacherAllowed && <button className="btn primary" type="button" onClick={() => openModal("mark")}>Enter Marks</button>}
      />
      <div className="info-card">
        Business rules active: monthly exams are limited to 12 per year, semester exams to 3 per year, and class tests to 2 per month. Obtained marks cannot exceed total marks, and each student-subject-year final contribution cannot exceed 100%.
      </div>
      <DataTable columns={marksColumns} rows={data.marks} />
      <SectionHeader eyebrow="Auto Calculation" title="Final Result Summary" />
      <DataTable columns={markResultsColumns} rows={data.markResults} />
    </div>
  );


  const renderResultCards = () => (
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

      <section className="result-builder panel">
        <div>
          <p className="eyebrow">Report card design</p>
          <h3>{schoolSettings.schoolName || "Your School Name"}</h3>
          <p>This page creates exam-wise report cards similar to a printed school progress report. Admin can change school name, subtitle, address, phone, website, logos, notice, principal name, and remarks. Teachers can download/print the PDF. Students can view their own generated exam cards.</p>
        </div>
        <div className="result-filter-grid">
          <Field label="Student">
            <select className="control" value={resultCardFilter.student} onChange={(event) => setResultCardFilter({ student: event.target.value, exam: "" })}>
              <option value="">All students</option>
              {resultCardStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </Field>
          <Field label="Exam">
            <select className="control" value={resultCardFilter.exam} onChange={(event) => setResultCardFilter({ ...resultCardFilter, exam: event.target.value })}>
              <option value="">All exams</option>
              {resultCardExamOptions.map((exam) => <option key={exam.id} value={exam.id}>{exam.label}</option>)}
            </select>
          </Field>
        </div>
      </section>

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
                <strong>{schoolSettings.defaultExamTitle || "Progress Report"} - {card.student?.className || "Class"}</strong>
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
                <span><strong>Result:</strong> {card.resultStatus}</span>
                <span><strong>Percentage:</strong> {card.percentage}%</span>
                <span><strong>Grade:</strong> {card.grade}</span>
                <span><strong>Highest:</strong> {card.highestMarks || card.obtainedMarks}</span>
                <span><strong>Position:</strong> {card.classPosition ? `${card.classPosition} of ${card.classSize}` : "-"}</span>
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
        <div className="info-card">
          <h3>No result card available yet</h3>
          <p>Enter marks for a student first. Each exam group will automatically become a downloadable result card.</p>
        </div>
      )}
    </div>
  );

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
  }[modal];

  const selectedProfilePayments = useMemo(() => profileStudent ? data.payments.filter((payment) => (payment.student?._id || payment.student) === profileStudent._id) : [], [profileStudent, data.payments]);
  const selectedProfileMarks = useMemo(() => profileStudent ? data.marks.filter((mark) => (mark.student?._id || mark.student) === profileStudent._id) : [], [profileStudent, data.marks]);
  const selectedProfileResults = useMemo(() => profileStudent ? data.markResults.filter((result) => (result.student?._id || result.student) === profileStudent._id) : [], [profileStudent, data.markResults]);
  const selectedMarkStudent = data.students.find((student) => student._id === form.student);
  const subjectOptionsForForm = modal === "mark" && selectedMarkStudent ? subjectsForClass(selectedMarkStudent.className) : allSubjectOptions;
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
    const statusColors = {
      present: "bg-emerald-100 text-emerald-700",
      late: "bg-amber-100 text-amber-700",
      absent: "bg-rose-100 text-rose-700",
      leave: "bg-blue-100 text-blue-700",
      "half-day": "bg-purple-100 text-purple-700",
    };
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-800">Employee Attendance</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${attendanceTab === "register" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-400"}`}
              onClick={() => setAttendanceTab("register")}
            ><svg style={{display:"inline",verticalAlign:"-2px",marginRight:"5px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>Register</button>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${attendanceTab === "biometric" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-400"}`}
              onClick={() => setAttendanceTab("biometric")}
            ><svg style={{display:"inline",verticalAlign:"-2px",marginRight:"5px"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 3"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 17h2"/><path d="M20 17a5 5 0 0 1-5 5"/><path d="M6 10a6 6 0 0 1 11.56-2"/><path d="M9 15a3.5 3.5 0 0 1-.5-1.8"/></svg>Biometric Terminal</button>
          </div>
        </div>

        {attendanceTab === "register" && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Present / Late", value: presentCount, color: "text-emerald-600" },
                { label: "Absent", value: absentCount, color: "text-rose-600" },
                { label: "On Leave", value: leaveCount, color: "text-blue-600" },
                { label: "Biometric", value: biometricCount, color: "text-violet-600" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">{s.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400">of {totalEmployees} staff</p>
                </div>
              ))}
            </div>

            {/* Filters + Add button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                <button className={`px-3 py-1.5 ${attendanceView==="today"?"bg-violet-600 text-white":"bg-white text-slate-600 hover:bg-slate-50"}`} onClick={()=>setAttendanceView("today")}>Daily</button>
                <button className={`px-3 py-1.5 ${attendanceView==="monthly"?"bg-violet-600 text-white":"bg-white text-slate-600 hover:bg-slate-50"}`} onClick={()=>setAttendanceView("monthly")}>Monthly</button>
              </div>
              {attendanceView === "today"
                ? <input type="date" value={attendanceDate} onChange={e=>setAttendanceDate(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
                : <input type="month" value={attendanceMonth} onChange={e=>setAttendanceMonth(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
              }
              <button
                onClick={() => openModal("attendance")}
                className="ml-auto rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
              >+ Mark Attendance</button>
            </div>

            {/* Attendance table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Employee</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Check-In</th>
                      <th className="px-4 py-3 text-left">Check-Out</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Method</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No attendance records for this period.</td></tr>
                    ) : filtered.map(r => {
                      const d = new Date(r.date);
                      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
                      return (
                        <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{r.employee?.name || "—"}</td>
                          <td className="px-4 py-3 text-slate-500 capitalize">{r.employee?.role || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{dateStr}</td>
                          <td className="px-4 py-3 text-slate-700">{r.checkIn || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 text-slate-700">{r.checkOut || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[r.status] || "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              {methodIcon[r.method] || <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>} {r.method}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openModal("attendance", { _id: r._id, employee: r.employee?._id, date: dateStr, checkIn: r.checkIn, checkOut: r.checkOut, status: r.status, method: r.method, note: r.note })} className="text-xs text-blue-600 hover:underline">Edit</button>
                              <button onClick={() => handleDelete("attendance", r._id)} className="text-xs text-rose-500 hover:underline">Del</button>
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
          <div className="flex flex-col items-center gap-6">
            {/* Biometric Terminal Card */}
            <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 p-6 shadow-2xl text-white">
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
                  <span className={`inline-block mt-1.5 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColors[biometricResult.status] || "bg-slate-600 text-white"}`}>{biometricResult.status}</span>
                </div>
              )}
            </div>

            {/* Today's biometric log */}
            <div className="w-full max-w-2xl">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Today's Biometric Log</h3>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
                          <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[r.status] || ""}`}>{r.status}</span></td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
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
          <strong>Done</strong>
          <span>{success.replace(/^Done!\s*/, "")}</span>
          <button aria-label="Dismiss done alert" type="button" onClick={() => setSuccess("")}>x</button>
        </div>
      )}
      {loading ? <p className="panel">Loading ERP data...</p> : (
        <>
          {activeView === "dashboard" && renderDashboard()}
          {activeView === "students" && studentReadAllowed && renderStudents()}
          {activeView === "fees" && renderFees()}
          {activeView === "expenses" && financeAllowed && renderExpenses()}
          {activeView === "employees" && renderEmployees()}
          {activeView === "attendance" && attendanceAllowed && renderAttendance()}
          {activeView === "classTeachers" && isAdmin && renderClassTeachers()}
          {activeView === "marks" && renderMarks()}
          {activeView === "resultCards" && renderResultCards()}
          {activeView === "routines" && renderRoutines()}
          {activeView === "salaries" && renderSalaries()}
          {activeView === "reports" && renderReports()}
          {activeView === "settings" && renderSettings()}
        </>
      )}

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
                <Field label="Class"><select className="control" value={form.classFee} onChange={(e) => setForm({ ...form, classFee: e.target.value })} required><option value="">Select class</option>{data.classFees.map((item) => <option key={item._id} value={item._id}>{item.className}</option>)}</select></Field>
                <Field label="Roll / ID"><input className="control" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} required /></Field>
                <Field label="Phone"><input className="control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Email"><input className="control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Guardian"><input className="control" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></Field>
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
                <Field label="Student"><select className="control" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })} required><option value="">Select student</option>{data.students.map((item) => <option key={item._id} value={item._id}>{item.name} - {item.className}</option>)}</select></Field>
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
