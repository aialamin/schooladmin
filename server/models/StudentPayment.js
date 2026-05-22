const mongoose = require("mongoose");

const studentPaymentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    feeType: {
      type: String,
      enum: ["admission", "session", "monthly", "exam"],
      required: true,
    },
    term: {
      type: String,
      default: "",
      trim: true,
    },
    billingMonth: {
      type: String,
      default: "",
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "unpaid",
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

studentPaymentSchema.index({ student: 1, feeType: 1, billingMonth: 1, term: 1 });

module.exports = mongoose.model("StudentPayment", studentPaymentSchema);
