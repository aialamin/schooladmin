const ClassFee     = require("../models/ClassFee");
const ClassSection = require("../models/ClassSection");
const ExamMark     = require("../models/ExamMark");
const Student      = require("../models/Student");

// ── Class progression map ────────────────────────────────────────────────────
// Each entry is: currentClass → nextClass
// Class 8 graduates to Class 9 Science by default; admin can move to Arts/Commerce manually
const CLASS_PROGRESSION = {
  "Play":               "Nursery",
  "Nursery":            "KG",
  "KG":                 "Class 1",
  "Class 1":            "Class 2",
  "Class 2":            "Class 3",
  "Class 3":            "Class 4",
  "Class 4":            "Class 5",
  "Class 5":            "Class 6",
  "Class 6":            "Class 7",
  "Class 7":            "Class 8",
  "Class 8":            "Class 9 Science",   // default stream; admin adjusts if needed
  "Class 9 Science":    "Class 10 Science",
  "Class 9 Arts":       "Class 10 Arts",
  "Class 9 Commerce":   "Class 10 Commerce",
  "Class 10 Science":   "Class 11 Science",
  "Class 10 Arts":      "Class 11 Arts",
  "Class 10 Commerce":  "Class 11 Commerce",
  "Class 11 Science":   "Class 12 Science",
  "Class 11 Arts":      "Class 12 Arts",
  "Class 11 Commerce":  "Class 12 Commerce",
  // Class 12 students graduate — no next class (they are moved to inactive)
};

// Minimum pass percentage (matches default school setting)
const DEFAULT_PASS_PERCENT = 33;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compute final result percentage for a student across all their exam marks. */
async function getStudentPassStatus(studentId, academicYear, passMark) {
  const rows = await ExamMark.aggregate([
    { $match: { student: studentId, academicYear } },
    {
      $group: {
        _id: null,
        totalObtained: { $sum: "$obtainedMarks" },
        totalMarks:    { $sum: "$totalMarks" },
        totalContrib:  { $sum: "$contributionPercent" },
        totalWeighted: { $sum: "$weightedScore" },
      },
    },
  ]);

  if (!rows.length) return { passed: false, percent: 0, hasMarks: false };

  const row = rows[0];
  // If contribution-based scoring is used (totalContrib ≈ 100), use weightedScore
  // Otherwise fall back to raw percentage
  let percent;
  if (row.totalContrib >= 95) {
    percent = Number(row.totalWeighted.toFixed(2));
  } else if (row.totalMarks > 0) {
    percent = Number(((row.totalObtained / row.totalMarks) * 100).toFixed(2));
  } else {
    return { passed: false, percent: 0, hasMarks: true };
  }

  return { passed: percent >= passMark, percent, hasMarks: true };
}

/**
 * Preview which students will be promoted / graduated / held back.
 * Does NOT modify any data.
 */
async function previewPromotion(academicYear, passMark = DEFAULT_PASS_PERCENT) {
  const year = academicYear || new Date().getFullYear();
  const students = await Student.find({ status: "active" });

  const promoted  = [];
  const graduated = [];
  const retained  = [];
  const noMarks   = [];

  for (const student of students) {
    const nextClass = CLASS_PROGRESSION[student.className];
    const result    = await getStudentPassStatus(student._id, year, passMark);

    if (!result.hasMarks) {
      noMarks.push({ student: { _id: student._id, name: student.name, className: student.className, rollNumber: student.rollNumber } });
      continue;
    }

    if (!result.passed) {
      retained.push({ student: { _id: student._id, name: student.name, className: student.className, rollNumber: student.rollNumber }, percent: result.percent });
      continue;
    }

    if (!nextClass) {
      // Class 12 — graduates
      graduated.push({ student: { _id: student._id, name: student.name, className: student.className, rollNumber: student.rollNumber }, percent: result.percent });
    } else {
      promoted.push({
        student: { _id: student._id, name: student.name, className: student.className, rollNumber: student.rollNumber },
        fromClass: student.className,
        toClass: nextClass,
        percent: result.percent,
      });
    }
  }

  return {
    academicYear: year,
    passMark,
    summary: {
      total:     students.length,
      promoted:  promoted.length,
      graduated: graduated.length,
      retained:  retained.length,
      noMarks:   noMarks.length,
    },
    promoted,
    graduated,
    retained,
    noMarks,
  };
}

/**
 * Run the annual promotion:
 *  - Students who passed → move to next class, assign to matching section teacher
 *  - Class 12 students who passed → mark inactive (graduated)
 *  - Students who failed → stay in same class (no change)
 *  - Students with no marks → stay in same class
 */
async function runAnnualPromotion(academicYear, passMark = DEFAULT_PASS_PERCENT, triggeredBy = "system") {
  const year    = academicYear || new Date().getFullYear();
  const nextYear = String(year + 1);

  console.log(`[Promotion] Starting annual promotion for year ${year} (triggered by: ${triggeredBy})`);

  const students = await Student.find({ status: "active" });

  // Pre-load all next-year sections for fast lookup: "ClassName|SectionName" → section doc
  const nextYearSections = await ClassSection.find({ academicYear: nextYear }).populate("classTeacher", "name email");
  const sectionLookup = new Map();
  for (const s of nextYearSections) {
    sectionLookup.set(`${s.className}|${s.sectionName}`, s);
  }

  // Also check current-year sections as fallback
  const currentYearSections = await ClassSection.find({ academicYear: String(year) }).populate("classTeacher", "name email");
  const currentSectionLookup = new Map();
  for (const s of currentYearSections) {
    currentSectionLookup.set(`${s.className}|${s.sectionName}`, s);
  }

  // Pre-load next-year class fees for fast lookup
  const classFees = await ClassFee.find({});
  const feeMap = new Map(classFees.map((f) => [f.className, f._id]));

  const results = { promoted: 0, graduated: 0, retained: 0, noMarks: 0, errors: [] };

  for (const student of students) {
    try {
      const nextClass = CLASS_PROGRESSION[student.className];
      const result    = await getStudentPassStatus(student._id, year, passMark);

      if (!result.hasMarks) {
        results.noMarks++;
        continue; // no marks → keep as-is
      }

      if (!result.passed) {
        results.retained++;
        continue; // failed → stay in same class
      }

      if (!nextClass) {
        // Class 12 graduate
        await Student.findByIdAndUpdate(student._id, { status: "inactive" });
        results.graduated++;
        continue;
      }

      // Find matching section in next class (same section name as current, if any)
      let newSection = null;
      if (student.section) {
        const currentSection = await ClassSection.findById(student.section);
        if (currentSection) {
          // Try next year first, then current year
          newSection = sectionLookup.get(`${nextClass}|${currentSection.sectionName}`)
                    || currentSectionLookup.get(`${nextClass}|${currentSection.sectionName}`)
                    || null;
        }
      }
      if (!newSection) {
        // No matching section — try any section of next class
        newSection = nextYearSections.find((s) => s.className === nextClass)
                  || currentYearSections.find((s) => s.className === nextClass)
                  || null;
      }

      const newFeeId = feeMap.get(nextClass) || student.classFee;

      await Student.findByIdAndUpdate(student._id, {
        className: nextClass,
        classFee:  newFeeId,
        section:   newSection?._id || null,
      });

      results.promoted++;
    } catch (err) {
      results.errors.push({ studentId: student._id, name: student.name, error: err.message });
    }
  }

  console.log(`[Promotion] Done — promoted: ${results.promoted}, graduated: ${results.graduated}, retained: ${results.retained}, no marks: ${results.noMarks}, errors: ${results.errors.length}`);
  return { academicYear: year, passMark, ...results };
}

// ── Annual scheduler (no external dependencies) ──────────────────────────────
// Checks every day at 00:05 whether it is January 1; if yes, runs promotion.

let _promotionTimer = null;

function scheduleAnnualPromotion() {
  if (_promotionTimer) clearTimeout(_promotionTimer);

  const now   = new Date();
  // Next midnight + 5 minutes
  const next  = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0);
  const delay = Math.max(next - now, 60 * 1000); // at least 1 min

  _promotionTimer = setTimeout(async () => {
    const today = new Date();
    if (today.getMonth() === 0 && today.getDate() === 1) {
      // It is January 1st
      const prevYear = today.getFullYear() - 1;
      try {
        await runAnnualPromotion(prevYear, DEFAULT_PASS_PERCENT, "auto-scheduler");
      } catch (err) {
        console.error("[Promotion] Auto-promotion failed:", err.message);
      }
    }
    scheduleAnnualPromotion(); // reschedule for next day
  }, delay);
}

module.exports = {
  CLASS_PROGRESSION,
  DEFAULT_PASS_PERCENT,
  previewPromotion,
  runAnnualPromotion,
  scheduleAnnualPromotion,
};
