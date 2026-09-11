function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

function registrationIdentity(body) {
  if (typeof body?.username !== "string" || typeof body?.email !== "string") {
    throw httpError(400, "Enter a username and email address.");
  }
  const username = body.username.trim();
  const email = body.email.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username)) {
    throw httpError(400, "Use 3–20 letters, numbers, dots, hyphens or underscores for your username.");
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, "Enter a valid email address.");
  }
  return { username, email };
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72 || !/[a-zA-Z]/.test(password) ||
      !/\d/.test(password) || !/[^a-zA-Z0-9\s]/.test(password)) {
    throw httpError(400, "Use at least 12 characters with a letter, number and symbol (maximum 72 UTF-8 bytes).");
  }
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isId = (value) => typeof value === "string" && /^[a-f0-9]{24}$/.test(value);

module.exports = { httpError, registrationIdentity, validatePassword, escapeRegex, isId };
