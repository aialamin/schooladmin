function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    photoUrl: user.photoUrl || "",
    createdAt: user.createdAt,
  };
}

module.exports = {
  normalizeEmail,
  publicUser,
};
