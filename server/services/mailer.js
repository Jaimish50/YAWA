const nodemailer = require("nodemailer");
const { httpError } = require("../utils/validation");

function createOtpMailer(env = process.env, suppliedTransport) {
  let transport = suppliedTransport;
  return async ({ email, code }) => {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.MAIL_FROM) {
      throw httpError(503, "Email verification is not configured yet. Please contact the app administrator.");
    }
    if (!transport) {
      transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || 587),
        secure: env.SMTP_SECURE === "true",
        requireTLS: true,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
    }
    try {
      const result = await transport.sendMail({
        from: env.MAIL_FROM,
        to: email,
        subject: "Your YAWA email verification code",
        text: `Your YAWA verification code is ${code}.\n\nIt expires in 10 minutes. Never share this code. If you did not request it, you can ignore this email.`,
      });
      if (result.rejected?.length) throw new Error("Recipient rejected");
    } catch (err) {
      // Never log the OTP, SMTP password, or full transport error.
      console.error("OTP EMAIL ERROR:", {
  code: err.code,
  responseCode: err.responseCode,
  response: err.response,
  command: err.command,
});
      throw httpError(502, "We couldn't send the verification email. Please try again shortly.");
    }
  };
}

module.exports = { createOtpMailer };
