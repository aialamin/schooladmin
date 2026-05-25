const User = require("../models/User");
const { getSessionUserId } = require("../utils/session");

async function protect(req, res, next) {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const userId = getSessionUserId(token);

    if (!userId) {
      return res.status(401).json({ message: "Please log in again." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "Please log in again." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access is required." });
  }

  return next();
}

function permitRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }

    return next();
  };
}

module.exports = {
  adminOnly,
  permitRoles,
  protect,
};
