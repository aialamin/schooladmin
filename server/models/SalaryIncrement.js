const mongoose = require("mongoose");

const salaryIncrementSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    previousSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    incrementAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    newSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

salaryIncrementSchema.index({ employee: 1, effectiveDate: -1 });

module.exports = mongoose.model("SalaryIncrement", salaryIncrementSchema);
