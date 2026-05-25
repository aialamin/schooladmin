const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["teacher", "staff", "admin", "accounts", "accountant", "librarian", "guard", "driver", "nurse", "peon"],
      default: "teacher",
    },
    salaryType: {
      type: String,
      enum: ["monthly", "fixed", "hourly"],
      default: "monthly",
    },
    salaryAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    assignedClass: {
      type: String,
      default: "",
      trim: true,
    },
    isClassTeacher: {
      type: Boolean,
      default: false,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    contactInfo: {
      phone: { type: String, default: "", trim: true },
      email: { type: String, default: "", lowercase: true, trim: true },
      address: { type: String, default: "", trim: true },
    },
    // ── WebAuthn / biometric credentials for attendance check-in ────────────
    biometricCredentials: [
      {
        credentialID:        { type: String, required: true },
        credentialPublicKey: { type: String, required: true }, // base64 public key
        counter:             { type: Number, default: 0 },
        transports:          [{ type: String }],
        deviceName:          { type: String, default: "Device" },
        addedAt:             { type: Date, default: Date.now },
      },
    ],
    biometricChallenge: { type: String, default: null }, // cleared after each handshake
  },
  { timestamps: true },
);

module.exports = mongoose.model("Employee", employeeSchema);
