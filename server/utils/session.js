const crypto = require("node:crypto");

const JWT_SECRET = process.env.JWT_SECRET || "education-manager-local-secret";
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(value) {
  return crypto.createHmac("sha256", JWT_SECRET).update(value).digest("base64url");
}

function createSession(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlEncode({
    sub: user.id,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  });
  const unsignedToken = `${header}.${payload}`;

  return `${unsignedToken}.${sign(unsignedToken)}`;
}

function getSessionUserId(token) {
  try {
    const [header, payload, signature] = String(token || "").split(".");
    if (!header || !payload || !signature) {
      return "";
    }

    const unsignedToken = `${header}.${payload}`;
    if (signature !== sign(unsignedToken)) {
      return "";
    }

    const data = base64UrlDecode(payload);
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return "";
    }

    return data.sub || "";
  } catch {
    return "";
  }
}

module.exports = {
  createSession,
  getSessionUserId,
};
