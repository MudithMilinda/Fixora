const jwt = require("jsonwebtoken");

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || "fixora-development-only-change-me";

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production.");
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
  // Keep a user signed in for one day; the JWT expiry below enforces the same limit.
  maxAge: 1000 * 60 * 60 * 24,
};

function createSessionToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, sessionVersion: user.sessionVersion },
    jwtSecret,
    { expiresIn: "24h", issuer: "fixora-api", audience: "fixora-web" },
  );
}

function verifySessionToken(token) {
  return jwt.verify(token, jwtSecret, {
    issuer: "fixora-api",
    audience: "fixora-web",
  });
}

module.exports = { cookieOptions, createSessionToken, verifySessionToken };
