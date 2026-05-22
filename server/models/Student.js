const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    classFee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassFee",
      required: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    rollNumber: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      guardianName: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
      email: { type: String, default: "", lowercase: true, trim: true },
      address: { type: String, default: "", trim: true },
    },
    dateOfBirth: {
      type: Date,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

studentSchema.index({ className: 1, rollNumber: 1 }, { unique: true });

module.exports = mongoose.model("Student", studentSchema);
