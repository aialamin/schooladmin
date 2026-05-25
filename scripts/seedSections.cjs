/**
 * seedSections.js
 * Run: node scripts/seedSections.js
 *
 * Seeds:
 *  - ClassFee records for each class (if not exist)
 *  - 26 teacher User accounts + matching Employee records
 *  - 26 ClassSection records (Boys + Girls for 13 classes)
 *  - ~10 students per class (5 boys / 5 girls), each assigned to their section
 */

"use strict";

const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const crypto   = require("node:crypto");

// ── Models ────────────────────────────────────────────────────────────────────
const ClassFee      = require("../server/models/ClassFee");
const ClassSection  = require("../server/models/ClassSection");
const Employee      = require("../server/models/Employee");
const Student       = require("../server/models/Student");
const User          = require("../server/models/User");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, passwordHash: hash };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n, len = 3) { return String(n).padStart(len, "0"); }

const YEAR = String(new Date().getFullYear());
const ADMISSION = new Date("2026-01-15");
const DEFAULT_PASS = "teacher123";

// ── Class list ────────────────────────────────────────────────────────────────
const CLASS_LIST = [
  "Play", "Nursery", "KG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8",
  "Class 9 Science", "Class 10 Science",
];

// ── Teacher data (26 people, one per section) ─────────────────────────────────
const TEACHERS = [
  // Pre-primary Boys/Girls
  { name: "Md. Ariful Islam",      email: "ariful.islam@school.edu",    subject: "General" },
  { name: "Farzana Akter",         email: "farzana.akter@school.edu",   subject: "General" },
  // Nursery
  { name: "Md. Nazmul Hasan",      email: "nazmul.hasan@school.edu",    subject: "General" },
  { name: "Shirin Sultana",        email: "shirin.sultana@school.edu",  subject: "General" },
  // KG
  { name: "Md. Jahirul Islam",     email: "jahirul.islam@school.edu",   subject: "General" },
  { name: "Nasrin Jahan",          email: "nasrin.jahan@school.edu",    subject: "General" },
  // Class 1
  { name: "Md. Rafiqul Islam",     email: "rafiqul.islam@school.edu",   subject: "Bangla" },
  { name: "Fatema Begum",          email: "fatema.begum@school.edu",    subject: "English" },
  // Class 2
  { name: "Md. Shahidul Alam",     email: "shahidul.alam@school.edu",   subject: "Mathematics" },
  { name: "Roksana Parvin",        email: "roksana.parvin@school.edu",  subject: "General Science" },
  // Class 3
  { name: "Md. Mizanur Rahman",    email: "mizanur.rahman@school.edu",  subject: "Bangla" },
  { name: "Halima Khatun",         email: "halima.khatun@school.edu",   subject: "English" },
  // Class 4
  { name: "Md. Belal Hossain",     email: "belal.hossain@school.edu",   subject: "Mathematics" },
  { name: "Sumaiya Akter",         email: "sumaiya.akter@school.edu",   subject: "General Science" },
  // Class 5
  { name: "Md. Monir Hossain",     email: "monir.hossain@school.edu",   subject: "Bangladesh Studies" },
  { name: "Kamrun Nahar",          email: "kamrun.nahar@school.edu",    subject: "Bangla" },
  // Class 6
  { name: "Md. Kamal Uddin",       email: "kamal.uddin@school.edu",     subject: "Mathematics" },
  { name: "Nasima Begum",          email: "nasima.begum@school.edu",    subject: "English" },
  // Class 7
  { name: "Md. Shahabuddin",       email: "shahabuddin@school.edu",     subject: "Science" },
  { name: "Rina Akter",            email: "rina.akter@school.edu",      subject: "Bangla" },
  // Class 8
  { name: "Md. Faruk Hossain",     email: "faruk.hossain@school.edu",   subject: "Mathematics" },
  { name: "Laily Begum",           email: "laily.begum@school.edu",     subject: "English" },
  // Class 9 Science
  { name: "Md. Aminul Islam",      email: "aminul.islam@school.edu",    subject: "Physics" },
  { name: "Shiuly Akter",          email: "shiuly.akter@school.edu",    subject: "Chemistry" },
  // Class 10 Science
  { name: "Md. Rezaul Karim",      email: "rezaul.karim@school.edu",    subject: "Mathematics" },
  { name: "Mahbuba Khatun",        email: "mahbuba.khatun@school.edu",  subject: "Biology" },
];

// ── Bangladeshi student names ─────────────────────────────────────────────────
const MALE_FIRST   = ["Arif","Rakib","Sakib","Farhan","Imran","Tawhid","Nayeem","Raihan","Sujon","Mehedi","Riyad","Tanvir","Mahfuz","Sabbir","Asif","Jubayer","Rifat","Siam","Jashim","Nazim"];
const FEMALE_FIRST = ["Nusrat","Tania","Mim","Sadia","Runa","Jannati","Anika","Bristy","Tasmia","Puja","Irin","Munni","Sumi","Rupa","Lima","Keya","Laboni","Mitu","Shanta","Riya"];
const LAST_NAMES   = ["Islam","Hossain","Rahman","Akter","Begum","Khatun","Ahmed","Ali","Khan","Mia","Sarker","Das","Roy","Biswas","Mondal","Sheikh","Nath","Paul","Ghosh","Dey"];
const GUARDIAN     = ["Md. Karim","Md. Rahim","Md. Hasan","Md. Jalal","Md. Faruk","Md. Barek","Md. Malek","Md. Salam","Md. Nurul","Md. Anwar"];
const AREAS        = ["Mirpur","Mohammadpur","Dhanmondi","Uttara","Gulshan","Banani","Rayer Bazar","Shyamoli","Adabor","Kalabagan"];

function makeName(gender) {
  return gender === "male"
    ? `${rnd(MALE_FIRST)} ${rnd(LAST_NAMES)}`
    : `${rnd(FEMALE_FIRST)} ${rnd(LAST_NAMES)}`;
}

// ── Fee structure per level ───────────────────────────────────────────────────
function feeForClass(cls) {
  if (["Play","Nursery","KG"].includes(cls))
    return { admissionFee: 5000, sessionFee: 3000, monthlyFee: 1500, examFee: 500 };
  if (["Class 1","Class 2","Class 3","Class 4","Class 5"].includes(cls))
    return { admissionFee: 6000, sessionFee: 4000, monthlyFee: 2000, examFee: 800 };
  if (["Class 6","Class 7","Class 8"].includes(cls))
    return { admissionFee: 7000, sessionFee: 5000, monthlyFee: 2500, examFee: 1000 };
  return { admissionFee: 8000, sessionFee: 6000, monthlyFee: 3000, examFee: 1200 };
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/schoolmanager";
  console.log("Connecting to MongoDB…");
  await mongoose.connect(uri);
  console.log("Connected.\n");

  // ── 1. ClassFees ─────────────────────────────────────────────────────────
  console.log("── Step 1: Class fees ──");
  const classFeeMap = {};   // className → ClassFee doc
  for (const cls of CLASS_LIST) {
    let cf = await ClassFee.findOne({ className: cls });
    if (!cf) {
      cf = await ClassFee.create({ className: cls, ...feeForClass(cls) });
      console.log(`  Created fee: ${cls}`);
    } else {
      console.log(`  Exists fee: ${cls}`);
    }
    classFeeMap[cls] = cf;
  }

  // ── 2. Teacher Users + Employees ─────────────────────────────────────────
  console.log("\n── Step 2: Teacher users & employees ──");
  const teacherDocs = [];   // parallel array to TEACHERS
  for (let i = 0; i < TEACHERS.length; i++) {
    const t = TEACHERS[i];
    const cls = CLASS_LIST[Math.floor(i / 2)];  // 2 teachers per class
    const isBoysTeacher = i % 2 === 0;
    const section = isBoysTeacher ? "Boys" : "Girls";

    // User account (each teacher gets unique salt/hash)
    let user = await User.findOne({ email: t.email });
    if (!user) {
      const { salt: s, passwordHash: h } = hashPassword(DEFAULT_PASS);
      user = await User.create({
        name: t.name, email: t.email, salt: s, passwordHash: h, role: "teacher",
      });
      console.log(`  Created user: ${t.name} <${t.email}>`);
    }

    // Employee record
    let emp = await Employee.findOne({ "contactInfo.email": t.email });
    if (!emp) {
      emp = await Employee.create({
        name: t.name,
        role: "teacher",
        salaryType: "monthly",
        salaryAmount: isBoysTeacher ? 18000 : 18000,
        assignedClass: cls,
        isClassTeacher: true,
        subject: t.subject,
        joiningDate: new Date("2025-01-10"),
        status: "active",
        contactInfo: {
          email: t.email,
          phone: `017${String(10000000 + i).slice(1)}`,
          address: `${rnd(AREAS)}, Dhaka`,
        },
      });
      console.log(`  Created employee: ${t.name} → ${cls} (${section})`);
    }

    teacherDocs.push({ user, emp, cls, section });
  }

  // ── 3. ClassSections ─────────────────────────────────────────────────────
  console.log("\n── Step 3: Class sections ──");
  const sectionMap = {};   // `${cls}|${sectionName}` → ClassSection doc
  for (let i = 0; i < teacherDocs.length; i++) {
    const { user, cls, section } = teacherDocs[i];
    const key = `${cls}|${section}`;
    let sec = await ClassSection.findOne({ className: cls, sectionName: section, academicYear: YEAR });
    if (!sec) {
      sec = await ClassSection.create({
        className: cls, sectionName: section,
        classTeacher: user._id, academicYear: YEAR,
      });
      console.log(`  Created section: ${cls} – ${section} → teacher: ${user.name}`);
    } else {
      // Update teacher assignment
      sec.classTeacher = user._id;
      await sec.save();
      console.log(`  Updated section: ${cls} – ${section} → teacher: ${user.name}`);
    }
    sectionMap[key] = sec;
  }

  // ── 4. Students ──────────────────────────────────────────────────────────
  console.log("\n── Step 4: Students (5 boys + 5 girls per class) ──");
  let totalCreated = 0;
  let rollCounter = {};

  for (const cls of CLASS_LIST) {
    const cf = classFeeMap[cls];
    const boysSec  = sectionMap[`${cls}|Boys`];
    const girlsSec = sectionMap[`${cls}|Girls`];

    // 5 boys → Boys section, 5 girls → Girls section
    const slots = [
      ...Array.from({ length: 5 }, (_, i) => ({ gender: "male",   section: boysSec,  idx: i + 1 })),
      ...Array.from({ length: 5 }, (_, i) => ({ gender: "female", section: girlsSec, idx: i + 1 })),
    ];

    for (const slot of slots) {
      if (!rollCounter[cls]) rollCounter[cls] = 0;
      rollCounter[cls]++;
      const rollNum = `${YEAR.slice(2)}${pad(rollCounter[cls])}`;

      // Check if roll already exists
      const exists = await Student.findOne({ className: cls, rollNumber: rollNum });
      if (exists) continue;

      const studentName = makeName(slot.gender);
      await Student.create({
        name: studentName,
        classFee: cf._id,
        className: cls,
        rollNumber: rollNum,
        section: slot.section?._id || null,
        gender: slot.gender,
        status: "active",
        admissionDate: ADMISSION,
        contactInfo: {
          guardianName: rnd(GUARDIAN),
          phone: `018${String(10000000 + totalCreated).slice(1)}`,
          address: `${rnd(AREAS)}, Dhaka`,
        },
      });
      totalCreated++;
    }
    console.log(`  ${cls}: ${slots.length} students seeded`);
  }

  console.log(`\n✅ Done! Created ${totalCreated} new students.`);
  console.log(`   Teacher login password: "${DEFAULT_PASS}"`);
  console.log(`   e.g. ariful.islam@school.edu / teacher123`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
