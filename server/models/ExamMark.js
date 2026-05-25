const mongoose = require("mongoose");

const examMarkSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    academicYear: {
      type: Number,
      required: true,
      min: 2000,
    },
    examType: {
      type: String,
      enum: ["monthly", "semester", "class_test"],
      required: true,
    },
    examNo: {
      type: Number,
      required: true,
      min: 1,
    },
    month: {
      type: String,
      default: "",
      trim: true,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    obtainedMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    contributionPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    weightedScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

examMarkSchema.index({ student: 1, subject: 1, academicYear: 1, examType: 1, examNo: 1, month: 1 }, { unique: true });
examMarkSchema.index({ className: 1, subject: 1, academicYear: 1 });

module.exports = mongoose.model("ExamMark", examMarkSchema);
