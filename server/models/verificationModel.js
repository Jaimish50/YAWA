const mongoose = require("mongoose");

// Temporary email challenges only. No user account or password is stored here.
const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  challengeId: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true, select: false },
  attemptsRemaining: { type: Number, default: 5 },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model("EmailVerification", schema);
