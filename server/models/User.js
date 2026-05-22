const mongoose = require("mongoose");
const ALLOWED_ROLES = require("../config/roles");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ALLOWED_ROLES,
      default: "student",
    },
    photoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    salt: {
      type: String,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
