const mongoose = require("mongoose");

const substituteEntrySchema = new mongoose.Schema(
  {
    routineId:              { type: mongoose.Schema.Types.ObjectId, ref: "ClassRoutine", default: null },
    className:              { type: String, default: "" },
    day:                    { type: String, default: "" },
    subject:                { type: String, default: "" },
    startTime:              { type: String, default: "" },
    endTime:                { type: String, default: "" },
    substituteEmployeeId:   { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    substituteEmployeeName: { type: String, default: "" },
    sectionId:              { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", default: null },
    sectionName:            { type: String, default: "" },
  },
  { _id: false },
);

const leaveApplicationSchema = new mongoose.Schema(
  {
    applicant:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    applicantName: { type: String, required: true, trim: true },
    fromDate:      { type: Date, required: true },
    toDate:        { type: Date, required: true },
    reason:        { type: String, required: true, trim: true },
    substitutes:   [substituteEntrySchema],
    status:        { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote:    { type: String, default: "" },
    reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt:    { type: Date, default: null },
  },
  { timestamps: true },
);

leaveApplicationSchema.index({ applicant: 1, status: 1 });
leaveApplicationSchema.index({ fromDate: 1, toDate: 1 });

module.exports = mongoose.model("LeaveApplication", leaveApplicationSchema);
