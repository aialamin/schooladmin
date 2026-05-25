const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    shiftName: { type: String, required: true, trim: true }, // "Morning", "Day", "Evening", etc.
    className: { type: String, trim: true, default: "" },
    section: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", default: null },
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const classroomSchema = new mongoose.Schema(
  {
    roomNo: { type: String, required: true, unique: true, trim: true },
    floor: { type: String, trim: true, default: "" },
    benchCount: { type: Number, default: 0, min: 0 },
    studentCapacity: { type: Number, default: 0, min: 0 },
    shifts: [shiftSchema],
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Classroom", classroomSchema);
