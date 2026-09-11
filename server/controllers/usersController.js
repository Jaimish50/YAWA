const { randomInt, randomBytes } = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Verification = require("../models/verificationModel");
const Message = require("../models/messageModel");
const { createSession, endSession } = require("../middleware/auth");
const { registrationIdentity, validatePassword, escapeRegex, httpError } = require("../utils/validation");
const dummyPasswordHash = bcrypt.hash(randomBytes(32).toString("hex"), 12);
const OTP_MS = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;

async function assertAvailable(username, email) {
  const exists = await User.exists({
    $or: [
      { username: new RegExp("^" + escapeRegex(username) + "$", "i") },
      { email: new RegExp("^" + escapeRegex(email) + "$", "i") },
    ],
  });
  if (exists) throw httpError(409, "That username or email is unavailable. Try another or log in.");
}

module.exports.register = async (req, res, next) => {
  try {
    const { username, email } = registrationIdentity(req.body);
    await assertAvailable(username, email);
    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 12);
    const challengeId = randomBytes(32).toString("hex");
    const now = new Date();
    try {
      // Unique email + conditional update makes cooldown atomic, including simultaneous resends.
      await Verification.findOneAndUpdate(
        { email, sentAt: { $lte: new Date(now - RESEND_MS) } },
        { $set: { username, email, challengeId, codeHash, sentAt: now,
          expiresAt: new Date(now.getTime() + OTP_MS), attemptsRemaining: 5 } },
        { upsert: true, new: true, runValidators: true }
      );
    } catch (err) {
      if (err.code !== 11000) throw err;
      res.set("Retry-After", "60");
      return res.status(429).json({ status: false, msg: "Please wait 60 seconds before requesting another code.", retryAfter: 60 });
    }
    try {
      await req.app.get("sendOtp")({ email, code });
    } catch (err) {
      await Verification.deleteOne({ challengeId });
      throw err;
    }
    res.status(202).json({ status: true, verificationRequired: true, challengeId, email,
      expiresIn: OTP_MS / 1000, resendAfter: RESEND_MS / 1000, msg: "Check your email for a verification code." });
  } catch (err) { next(err); }
};

module.exports.verifyRegistration = async (req, res, next) => {
  try {
    const { username, email } = registrationIdentity(req.body);
    validatePassword(req.body.password);
    const { code, challengeId } = req.body;
    if (typeof code !== "string" || !/^\d{6}$/.test(code) ||
        typeof challengeId !== "string" || !/^[a-f0-9]{64}$/.test(challengeId)) {
      throw httpError(400, "Enter the six-digit code from your email.");
    }
    // Reserve an attempt atomically before the expensive comparison.
    const challenge = await Verification.findOneAndUpdate(
      { challengeId, email, username, expiresAt: { $gt: new Date() }, attemptsRemaining: { $gt: 0 } },
      { $inc: { attemptsRemaining: -1 } }, { new: false }
    ).select("+codeHash");
    if (!challenge || !(await bcrypt.compare(code, challenge.codeHash))) {
      throw httpError(400, "The code is invalid, expired, or has too many failed attempts. Request a new code if needed.");
    }
    await assertAvailable(username, email);
    const consumed = await Verification.findOneAndDelete({
      challengeId, codeHash: challenge.codeHash, expiresAt: { $gt: new Date() },
    });
    if (!consumed) throw httpError(400, "This code was already used or replaced. Please request a new code.");
    const user = await User.create({
      username, usernameKey: username.toLowerCase(), email,
      password: await bcrypt.hash(req.body.password, 12), emailVerifiedAt: new Date(),
    });
    await createSession(req, res, user);
    res.status(201).json({ status: true, user });
  } catch (err) { next(err); }
};

module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || !username.trim() || username.length > 100 ||
        typeof password !== "string" || !password || Buffer.byteLength(password, "utf8") > 72) {
      throw httpError(401, "Invalid username or password.");
    }
    const user = await User.findOne({ username: new RegExp("^" + escapeRegex(username.trim()) + "$", "i") }).select("+password");
    const matches = await bcrypt.compare(password, user?.password || await dummyPasswordHash);
    if (!user || !matches) throw httpError(401, "Invalid username or password.");
    await createSession(req, res, user);
    res.json({ status: true, user });
  } catch (err) { next(err); }
};

module.exports.me = (req, res) => res.json({ status: true, user: req.auth.user });
module.exports.logout = async (req, res, next) => {
  try {
    await endSession(req, res);
    res.json({ status: true });
  } catch (err) { next(err); }
};

module.exports.setAvatar = async (req, res, next) => {
  try {
    if (req.params.id !== req.auth.user.id) throw httpError(403, "You can only update your own profile.");
    const image = req.body?.image;
    if (typeof image !== "string" || image.length > 100000 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) throw httpError(400, "Select a valid avatar.");
    await User.updateOne({ _id: req.auth.user._id }, { $set: { isAvatarImageSet: true, avatarImage: image } });
    res.json({ isSet: true, image });
  } catch (err) { next(err); }
};

module.exports.getAllUsers = async (req, res, next) => {
  try {
    const viewer = req.auth.user.id;
    if (req.params.id && req.params.id !== viewer) throw httpError(403, "You can only view your own chat list.");
    const [users, activity] = await Promise.all([
      User.find({ _id: { $ne: viewer } }).select("username avatarImage").lean(),
      Message.aggregate([
        { $match: { "message.users": viewer } },
        { $sort: { createdAt: 1, _id: 1 } },
        { $project: {
          peer: { $arrayElemAt: [{ $filter: { input: "$message.users", as: "id", cond: { $ne: ["$$id", viewer] } } }, 0] },
          createdAt: 1, text: "$message.text",
          unread: { $cond: [{ $and: [
            { $ne: ["$message.sender", req.auth.user._id] }, { $eq: ["$unread", true] },
          ] }, 1, 0] },
        } },
        { $group: { _id: "$peer", lastMessageAt: { $last: "$createdAt" }, lastMessageId: { $last: "$_id" },
          lastMessage: { $last: "$text" }, unreadCount: { $sum: "$unread" } } },
      ]),
    ]);
    const byPeer = new Map(activity.map((item) => [String(item._id), item]));
    const contacts = users.map((user) => {
      const stats = byPeer.get(String(user._id));
      return { ...user, lastMessageAt: stats?.lastMessageAt || null,
        lastMessageId: stats?.lastMessageId ? String(stats.lastMessageId) : "",
        lastMessage: stats?.lastMessage || "", unreadCount: stats?.unreadCount || 0 };
    }).sort((a, b) => (new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)) ||
      b.lastMessageId.localeCompare(a.lastMessageId) ||
      a.username.localeCompare(b.username) || String(a._id).localeCompare(String(b._id)));
    res.json(contacts);
  } catch (err) { next(err); }
};

module.exports.searchContacts = async (req, res, next) => {
  try {
    if (typeof req.query.key !== "string" || req.query.key.length > 100) throw httpError(400, "Enter a valid search.");
    const contacts = await User.find({ _id: { $ne: req.auth.user._id },
      username: new RegExp("^" + escapeRegex(req.query.key), "i") }).select("username avatarImage").limit(50);
    res.json(contacts);
  } catch (err) { next(err); }
};
