const mongoose = require("mongoose");
const ALLOWED_ROLES = require("../config/roles");
const User = require("../models/User");
const { hashPassword } = require("../utils/password");
const { normalizeEmail, publicUser } = require("../utils/users");

function sanitizeRole(role) {
  const cleanRole = String(role || "").trim().toLowerCase();
  return ALLOWED_ROLES.includes(cleanRole) ? cleanRole : "";
}

async function getUsers(req, res, next) {
  try {
    const role = sanitizeRole(req.query.role);
    const query = role ? { role } : {};
    const users = await User.find(query).sort({ createdAt: -1, name: 1 });

    return res.json({ users: users.map(publicUser) });
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const role = sanitizeRole(req.body.role) || "student";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordData = hashPassword(password);
    const user = await User.create({
      name,
      email,
      role,
      salt: passwordData.salt,
      passwordHash: passwordData.hash,
    });

    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const role = sanitizeRole(req.body.role);
    const password = String(req.body.password || "");

    if (!name || !email || !role) {
      return res.status(400).json({ message: "Name, email, and role are required." });
    }

    const duplicateUser = await User.findOne({ email, _id: { $ne: user.id } });
    if (duplicateUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    user.name = name;
    user.email = email;
    user.role = role;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }

      const passwordData = hashPassword(password);
      user.salt = passwordData.salt;
      user.passwordHash = passwordData.hash;
    }

    await user.save();
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ message: "User deleted.", user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
};
