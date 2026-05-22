const mongoose = require("mongoose");

const employeeAttendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: { type: String, default: "", trim: true },
    checkOut: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "leave", "half-day"],
      required: true,
    },
    method: {
      type: String,
      enum: ["manual", "biometric"],
      default: "manual",
    },
    deviceId: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

employeeAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
employeeAttendanceSchema.index({ date: 1 });

module.exports = mongoose.model("EmployeeAttendance", employeeAttendanceSchema);
