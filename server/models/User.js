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
    // WebAuthn / biometric credentials — one entry per registered device
    webauthnCredentials: [
      {
        credentialID:        { type: String, required: true },
        credentialPublicKey: { type: String, required: true }, // base64
        counter:             { type: Number, default: 0 },
        transports:          [String],
        deviceName:          { type: String, default: "Device" },
        addedAt:             { type: Date, default: Date.now },
      },
    ],
    // Temporary challenge stored during registration/authentication handshake
    webauthnChallenge: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
