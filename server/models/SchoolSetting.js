const mongoose = require("mongoose");

const schoolSettingSchema = new mongoose.Schema(
  {
    schoolName: { type: String, default: "Your School Name", trim: true },
    shortName: { type: String, default: "School", trim: true },
    subtitle: { type: String, default: "An English Medium School", trim: true },
    leftLogoUrl: { type: String, default: "", trim: true },
    rightLogoUrl: { type: String, default: "", trim: true },
    address: { type: String, default: "School address here", trim: true },
    phone: { type: String, default: "", trim: true },
    schoolEmail: { type: String, default: "", trim: true },
    website: { type: String, default: "", trim: true },
    academicYear: { type: String, default: new Date().getFullYear().toString(), trim: true },
    academicSession: { type: String, default: "January - December", trim: true },
    defaultExamTitle: { type: String, default: "Progress Report", trim: true },
    defaultPassMark: { type: Number, default: 33 },
    classStartTime: { type: String, default: "09:00", trim: true },
    supportEmail: { type: String, default: "", trim: true },
    admissionNotice: { type: String, default: "Admission open. Contact school office for details.", trim: true },
    principalName: { type: String, default: "Principal", trim: true },
    resultRemarksDefault: { type: String, default: "She/He has been consistently progressing.", trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SchoolSetting", schoolSettingSchema);
