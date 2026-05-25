const mongoose = require("mongoose");

const classSectionSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true,
    },
    sectionName: {
      type: String,
      required: true,
      trim: true,
    },
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    academicYear: {
      type: String,
      default: () => String(new Date().getFullYear()),
    },
  },
  { timestamps: true }
);

classSectionSchema.index({ className: 1, sectionName: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model("ClassSection", classSectionSchema);
