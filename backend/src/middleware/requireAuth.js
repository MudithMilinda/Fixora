const User = require("../models/User");
const { verifySessionToken } = require("../config/auth");

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.fixora_session;
    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const payload = verifySessionToken(token);
    const user = await User.findByPk(payload.sub);
    if (!user || !user.isActive || payload.sessionVersion !== user.sessionVersion) {
      return res.status(401).json({ success: false, message: "Your session is no longer valid." });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Your session has expired. Please sign in again." });
  }
}

module.exports = { requireAuth };
