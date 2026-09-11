const { randomBytes, createHash } = require("crypto");
const Session = require("../models/sessionModel");
const User = require("../models/userModel");
const COOKIE_NAME = "yawa_session";
const SESSION_MS = 12 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    path: "/",
  };
}

function tokenHashFromRequest(req) {
  const match = (req.headers.cookie || "").match(/(?:^|;\s*)yawa_session=([a-f0-9]{64})(?:;|$)/);
  return match ? createHash("sha256").update(match[1]).digest("hex") : null;
}

async function resolveSession(req) {
  const tokenHash = tokenHashFromRequest(req);
  if (!tokenHash) return null;
  // TTL deletion is asynchronous, so enforce expiration in every query as well.
  const session = await Session.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await User.findById(session.userId);
  return user ? { session, user } : null;
}

async function requireAuth(req, res, next) {
  try {
    const auth = await resolveSession(req);
    if (!auth) return res.status(401).json({ status: false, msg: "Please log in to continue." });
    req.auth = auth;
    next();
  } catch (err) { next(err); }
}

async function endSession(req, res) {
  const tokenHash = tokenHashFromRequest(req);
  if (tokenHash) {
    const session = await Session.findOneAndDelete({ tokenHash });
    if (session) req.app.get("io")?.in(`session:${session.id}`).disconnectSockets(true);
  }
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

async function createSession(req, res, user) {
  // A new random token on every login prevents session fixation.
  await endSession(req, res);
  const token = randomBytes(32).toString("hex");
  await Session.create({
    tokenHash: createHash("sha256").update(token).digest("hex"),
    userId: user._id,
    expiresAt: new Date(Date.now() + SESSION_MS),
  });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: SESSION_MS });
}

module.exports = { requireAuth, resolveSession, createSession, endSession };
