const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const http = require("node:http");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const { io: connectSocket } = require("socket.io-client");
const { SMTPServer } = require("smtp-server");
const nodemailer = require("nodemailer");
const { createApp } = require("../app");
const { attachSocket } = require("../socket");
const { createOtpMailer } = require("../services/mailer");
const User = require("../models/userModel");
const Verification = require("../models/verificationModel");
const Session = require("../models/sessionModel");
const Message = require("../models/messageModel");

const origin = "http://localhost:3000";
const password = "TestPassword!1234";
const dbName = "yawa_feature_test_" + randomUUID().replaceAll("-", "");
const delivered = [];
const sockets = [];
let smtp, server, io, base, app, passwordHash;

function post(client, path, body) {
  return client.post(path).set("Origin", origin).set("X-Requested-With", "XMLHttpRequest").send(body);
}

async function fixture(username) {
  return User.create({ username, usernameKey: username.toLowerCase(), email: username.toLowerCase() + "@example.test",
    password: passwordHash, emailVerifiedAt: new Date(), isAvatarImageSet: true });
}

async function login(user) {
  const client = request.agent(base);
  const result = await post(client, "/api/auth/login", { username: user.username, password });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return { client, cookie: result.headers["set-cookie"].at(-1).split(";")[0], result };
}

async function challenge(username) {
  const identity = { username, email: username.toLowerCase() + "@example.test" };
  const response = await post(request(base), "/api/auth/register", identity);
  assert.equal(response.status, 202, JSON.stringify(response.body));
  const mail = delivered.at(-1);
  assert.ok(mail.includes(identity.email));
  const code = mail.match(/verification code is (\d{6})/)[1];
  return { ...identity, password, challengeId: response.body.challengeId, code };
}

async function openSocket(cookie) {
  const socket = connectSocket(base, {
    transports: ["websocket"], reconnection: false,
    extraHeaders: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
  });
  sockets.push(socket);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Socket connection timed out")), 4000);
    socket.once("connect", () => { clearTimeout(timer); resolve(); });
    socket.once("connect_error", (err) => { clearTimeout(timer); reject(err); });
  });
  return socket;
}

function socketEvent(socket, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, receive); reject(new Error("Missing event " + name)); }, 4000);
    function receive(event) { clearTimeout(timer); resolve(event); }
    socket.once(name, receive);
  });
}

before(async () => {
  // A separate randomly named database: never run tests against the app's data.
  await mongoose.connect(process.env.TEST_MONGO_URL || "mongodb://127.0.0.1:27017", {
    dbName, serverSelectionTimeoutMS: 5000,
  });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  passwordHash = await bcrypt.hash(password, 12);
  smtp = new SMTPServer({
    authOptional: true, disabledCommands: ["STARTTLS"],
    onData(stream, _session, callback) {
      let raw = "";
      stream.on("data", (chunk) => { raw += chunk; });
      stream.on("end", () => { delivered.push(raw); callback(); });
    },
  });
  await new Promise((resolve) => smtp.listen(0, "127.0.0.1", resolve));
  const transport = nodemailer.createTransport({
    host: "127.0.0.1", port: smtp.server.address().port, secure: false, ignoreTLS: true,
  });
  const sendOtp = createOtpMailer({
    SMTP_HOST: "127.0.0.1", SMTP_USER: "test", SMTP_PASS: "test", MAIL_FROM: "YAWA <noreply@example.test>",
  }, transport);
  app = createApp({ sendOtp, clientOrigin: origin });
  server = http.createServer(app);
  io = attachSocket(server, app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = "http://127.0.0.1:" + server.address().port;
});

after(async () => {
  sockets.forEach((socket) => socket.disconnect());
  if (io) await new Promise((resolve) => io.close(resolve));
  if (smtp) await new Promise((resolve) => smtp.close(resolve));
  if (mongoose.connection.readyState === 1) {
    assert.equal(mongoose.connection.name, dbName);
    assert.match(dbName, /^yawa_feature_test_[a-f0-9]{32}$/);
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

test("registration sends email but stores no account/password until the OTP is verified", async () => {
  const input = await challenge("VerifiedAlice");
  assert.equal(await User.countDocuments({ email: input.email }), 0);
  const pending = await Verification.findOne({ challengeId: input.challengeId }).select("+codeHash").lean();
  assert.equal(pending.password, undefined);
  assert.notEqual(pending.codeHash, input.code);
  assert.ok(await bcrypt.compare(input.code, pending.codeHash));
  const client = request.agent(base);
  const result = await post(client, "/api/auth/verify-registration", input);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.ok(result.body.user.emailVerifiedAt);
  assert.equal(result.body.user.password, undefined);
  assert.match(result.headers["set-cookie"].at(-1), /HttpOnly/);
  assert.match(result.headers["set-cookie"].at(-1), /SameSite=Lax/);
  assert.equal(await Verification.countDocuments({ challengeId: input.challengeId }), 0);
  assert.equal((await client.get("/api/auth/me")).status, 200);
  const saved = await User.findById(result.body.user._id).select("+password");
  assert.ok(await bcrypt.compare(password, saved.password));
  const replay = await post(client, "/api/auth/verify-registration", input);
  assert.equal(replay.status, 400);
});

test("OTP cooldown and resend invalidate the earlier code", async () => {
  const input = await challenge("ResendPerson");
  const blocked = await post(request(base), "/api/auth/register", input);
  assert.equal(blocked.status, 429);
  await Verification.updateOne({ challengeId: input.challengeId }, { $set: { sentAt: new Date(Date.now() - 61000) } });
  const replacement = await challenge("ResendPerson");
  assert.notEqual(replacement.challengeId, input.challengeId);
  assert.equal((await post(request(base), "/api/auth/verify-registration", input)).status, 400);
  assert.equal((await post(request(base), "/api/auth/verify-registration", replacement)).status, 201);
});

test("expired codes and codes bound to another email cannot create users", async () => {
  const input = await challenge("ExpiredPerson");
  const wrongEmail = await post(request(base), "/api/auth/verify-registration", { ...input, email: "other@example.test" });
  assert.equal(wrongEmail.status, 400);
  await Verification.updateOne({ challengeId: input.challengeId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await post(request(base), "/api/auth/verify-registration", input)).status, 400);
  assert.equal(await User.countDocuments({ email: input.email }), 0);
});

test("five wrong OTP guesses lock the challenge, even with the correct code afterwards", async () => {
  const input = await challenge("LockedPerson");
  for (let i = 0; i < 5; i++) {
    assert.equal((await post(request(base), "/api/auth/verify-registration", { ...input, code: "000000" })).status, 400);
  }
  assert.equal((await post(request(base), "/api/auth/verify-registration", input)).status, 400);
  assert.equal(await User.countDocuments({ email: input.email }), 0);
});

test("concurrent verification requests create exactly one account", async () => {
  const input = await challenge("ConcurrentPerson");
  const results = await Promise.all([
    post(request(base), "/api/auth/verify-registration", input),
    post(request(base), "/api/auth/verify-registration", input),
  ]);
  assert.equal(results.filter((result) => result.status === 201).length, 1);
  assert.equal(await User.countDocuments({ email: input.email }), 1);
});

test("mail delivery failure removes the challenge and creates no account", async () => {
  const original = app.get("sendOtp");
  app.set("sendOtp", async () => { throw Object.assign(new Error("Email unavailable"), { statusCode: 502 }); });
  try {
    const result = await post(request(base), "/api/auth/register", { username: "MailFailure", email: "failure@example.test" });
    assert.equal(result.status, 502);
    assert.equal(await Verification.countDocuments({ email: "failure@example.test" }), 0);
    assert.equal(await User.countDocuments({ email: "failure@example.test" }), 0);
  } finally { app.set("sendOtp", original); }
});

test("server enforces password policy and case-insensitive duplicate protection", async () => {
  const input = await challenge("PolicyPerson");
  assert.equal((await post(request(base), "/api/auth/verify-registration", { ...input, password: "short" })).status, 400);
  assert.equal(await User.countDocuments({ email: input.email }), 0);
  assert.equal((await post(request(base), "/api/auth/verify-registration", input)).status, 201);
  const duplicate = await post(request(base), "/api/auth/register", {
    username: input.username.toUpperCase(), email: "different@example.test",
  });
  assert.equal(duplicate.status, 409);
});

test("login uses generic errors, rejects query injection, and throttles guesses", async () => {
  const existing = await fixture("LoginPerson");
  const wrong = await post(request(base), "/api/auth/login", { username: existing.username, password: "wrong-password" });
  const unknown = await post(request(base), "/api/auth/login", { username: "NotARealAccount", password: "wrong-password" });
  assert.equal(wrong.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
  const injection = await post(request(base), "/api/auth/login", { username: { $ne: null }, password });
  assert.equal(injection.status, 401);
  for (let i = 0; i < 10; i++) await post(request(base), "/api/auth/login", { username: "ThrottledPerson", password: "wrong" });
  const limited = await post(request(base), "/api/auth/login", { username: "ThrottledPerson", password: "wrong" });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers["retry-after"]) > 0);
});

test("session tokens are hashed, rotated, expired and invalidated on logout", async () => {
  const user = await fixture("SessionPerson");
  const { client, cookie, result } = await login(user);
  assert.equal(result.body.user.password, undefined);
  const session = await Session.findOne({ userId: user._id });
  assert.notEqual(session.tokenHash, cookie.split("=")[1]);
  const rotated = await post(client, "/api/auth/login", { username: user.username, password });
  assert.notEqual(rotated.headers["set-cookie"].at(-1).split(";")[0], cookie);
  assert.equal((await request(base).get("/api/auth/me").set("Cookie", cookie)).status, 401);
  await Session.updateOne({ userId: user._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await client.get("/api/auth/me")).status, 401);
  const fresh = await login(user);
  await post(fresh.client, "/api/auth/logout", {});
  assert.equal((await fresh.client.get("/api/auth/me")).status, 401);
});

test("unauthenticated access, forged sender IDs and foreign origins are rejected", async () => {
  const alice = await fixture("AccessAlice");
  const bob = await fixture("AccessBob");
  const { client } = await login(alice);
  assert.equal((await request(base).get("/api/messages/getmsg").query({ to: bob.id })).status, 401);
  assert.equal((await post(client, "/api/auth/setAvatar/" + bob.id, { image: "PHN2Zz48L3N2Zz4=" })).status, 403);
  assert.equal((await post(client, "/api/messages/addMessage", { from: bob.id, to: bob.id, message: "forged" })).status, 403);
  assert.equal((await client.get("/api/messages/getmsg").query({ from: bob.id, to: alice.id })).status, 403);
  assert.equal((await client.get("/api/auth/allUsers/" + bob.id)).status, 403);
  assert.equal((await client.post("/api/auth/logout").send({})).status, 403);
  assert.equal((await client.post("/api/auth/logout").set("X-Requested-With", "XMLHttpRequest")
    .set("Origin", "https://foreign.example").send({})).status, 403);
});

test("chat order and unread counts belong to the recipient and persist across requests", async () => {
  const alice = await fixture("ChatAlice");
  const bob = await fixture("ChatBob");
  const carol = await fixture("ChatCarol");
  const a = await login(alice), b = await login(bob), c = await login(carol);
  const first = await post(b.client, "/api/messages/addMessage", { to: alice.id, message: "Hello Alice" });
  assert.equal(first.status, 201);
  let contacts = (await a.client.get("/api/auth/allUsers/" + alice.id)).body;
  assert.equal(contacts[0]._id, bob.id);
  assert.equal(contacts[0].unreadCount, 1);
  assert.equal(contacts[0].email, undefined);
  await post(c.client, "/api/messages/addMessage", { to: bob.id, message: "An unrelated chat" });
  contacts = (await a.client.get("/api/auth/allUsers/" + alice.id)).body;
  assert.equal(contacts[0]._id, bob.id);
  const latest = await post(b.client, "/api/messages/addMessage", { to: alice.id, message: "Another message" });
  await post(a.client, "/api/messages/read", { to: bob.id, through: first.body.message.id });
  contacts = (await a.client.get("/api/auth/allUsers/" + alice.id)).body;
  assert.equal(contacts.find((item) => item._id === bob.id).unreadCount, 1);
  await post(a.client, "/api/messages/read", { to: bob.id, through: latest.body.message.id });
  contacts = (await a.client.get("/api/auth/allUsers/" + alice.id)).body;
  assert.equal(contacts.find((item) => item._id === bob.id).unreadCount, 0);
  const history = (await a.client.get("/api/messages/getmsg").query({ to: bob.id })).body;
  assert.deepEqual(history.map((item) => item.text), ["Hello Alice", "Another message"]);
  assert.equal((await post(c.client, "/api/messages/read", { to: bob.id, through: latest.body.message.id })).status, 404);
});

test("legacy messages without an unread flag do not suddenly appear unread", async () => {
  const alice = await fixture("LegacyAlice"), bob = await fixture("LegacyBob");
  await Message.collection.insertOne({ message: { sender: bob._id, users: [bob.id, alice.id], text: "Old chat" },
    createdAt: new Date(), updatedAt: new Date() });
  const { client } = await login(alice);
  const contacts = (await client.get("/api/auth/allUsers/" + alice.id)).body;
  assert.equal(contacts.find((item) => item._id === bob.id).unreadCount, 0);
});

test("sockets require sessions, deliver persisted messages to the right user, and disconnect on logout", async () => {
  await assert.rejects(openSocket(), /Authentication required/);
  const sender = await fixture("SocketSender"), recipient = await fixture("SocketRecipient"), stranger = await fixture("SocketStranger");
  const a = await login(sender), b = await login(recipient), c = await login(stranger);
  const recipientSocket = await openSocket(b.cookie);
  const strangerSocket = await openSocket(c.cookie);
  let leaked = false;
  strangerSocket.on("message:new", () => { leaked = true; });
  // The old impersonation event no longer grants access to another user's room.
  strangerSocket.emit("add-user", recipient.id);
  const eventPromise = socketEvent(recipientSocket, "message:new");
  const result = await post(a.client, "/api/messages/addMessage", { to: recipient.id, message: "Private hello" });
  const event = await eventPromise;
  assert.equal(event.id, result.body.message.id);
  assert.equal(event.from, sender.id);
  assert.equal(event.text, "Private hello");
  assert.ok(await Message.exists({ _id: event.id }));
  assert.equal(leaked, false);
  const disconnected = socketEvent(recipientSocket, "disconnect");
  await post(b.client, "/api/auth/logout", {});
  await disconnected;
  await assert.rejects(openSocket(b.cookie), /Authentication required/);
});
