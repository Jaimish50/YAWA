const Message = require("../models/messageModel");
const User = require("../models/userModel");
const { httpError, isId } = require("../utils/validation");

function serializeMessage(doc) {
  const from = String(doc.message.sender);
  return { id: String(doc._id), from, to: doc.message.users.find((id) => id !== from),
    text: doc.message.text, createdAt: doc.createdAt };
}

function assertOwnSender(req, supplied) {
  if (supplied !== undefined && supplied !== req.auth.user.id) {
    throw httpError(403, "You cannot send or read messages as another user.");
  }
}

module.exports.addMessage = async (req, res, next) => {
  try {
    const from = req.auth.user.id;
    const { to, message } = req.body || {};
    assertOwnSender(req, req.body?.from);
    if (!isId(to) || to === from) throw httpError(400, "Choose a valid recipient.");
    if (typeof message !== "string" || !message.trim() || message.length > 4000) {
      throw httpError(400, "Messages must contain 1–4000 characters.");
    }
    const recipient = await User.findById(to).select("username avatarImage");
    if (!recipient) throw httpError(404, "Recipient not found.");
    const saved = await Message.create({ message: { text: message.trim(), users: [from, to], sender: from } });
    const result = serializeMessage(saved);
    // Only persisted server-authored messages are broadcast to authenticated rooms.
    req.app.get("io")?.to("user:" + from).to("user:" + to).emit("message:new", {
      ...result,
      sender: { _id: from, username: req.auth.user.username, avatarImage: req.auth.user.avatarImage },
      recipient: { _id: to, username: recipient.username, avatarImage: recipient.avatarImage },
    });
    res.status(201).json({ status: true, message: result });
  } catch (err) { next(err); }
};

module.exports.getAllMessages = async (req, res, next) => {
  try {
    assertOwnSender(req, req.query.from);
    const { to } = req.query;
    if (!isId(to) || to === req.auth.user.id) throw httpError(400, "Choose a valid conversation.");
    const messages = await Message.find({ "message.users": { $all: [req.auth.user.id, to] } })
      .sort({ createdAt: 1, _id: 1 });
    res.json(messages.map(serializeMessage));
  } catch (err) { next(err); }
};

module.exports.markRead = async (req, res, next) => {
  try {
    const { to, through } = req.body || {};
    if (!isId(to) || !isId(through)) throw httpError(400, "Choose a valid message to mark as read.");
    const filter = { "message.users": { $all: [req.auth.user.id, to] }, "message.sender": to };
    if (!await Message.exists({ ...filter, _id: through })) throw httpError(404, "Message not found in this conversation.");
    // A racing new message stays unread: update only through the last displayed message.
    await Message.updateMany({ ...filter, _id: { $lte: through }, unread: true },
      { $set: { unread: false, readAt: new Date() } });
    req.app.get("io")?.to("user:" + req.auth.user.id).emit("chat:read", { contactId: to, through });
    res.json({ status: true });
  } catch (err) { next(err); }
};



