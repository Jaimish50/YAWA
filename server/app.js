const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const messagesRoute = require("./routes/messagesRoute");
const { createOtpMailer } = require("./services/mailer");

function createApp({ sendOtp = createOtpMailer(), clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000" } = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.set("clientOrigin", clientOrigin);
  app.set("sendOtp", sendOtp);
  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json({ limit: "150kb" }));
  app.get("/healthz", (_req, res) => {
    const ready = mongoose.connection.readyState === 1 && !app.get("shuttingDown");
    res.set("Cache-Control", "no-store").status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable" });
  });
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    // A custom header forces browser preflight; also reject foreign origins to stop CSRF.
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) &&
        (req.get("X-Requested-With") !== "XMLHttpRequest" ||
         (req.get("Origin") && req.get("Origin") !== clientOrigin))) {
      return res.status(403).json({ status: false, msg: "Request origin is not allowed." });
    }
    next();
  });
  app.use("/api/auth", userRoutes);
  app.use("/api/messages", messagesRoute);
  app.use((_req, res) => res.status(404).json({ status: false, msg: "Endpoint not found." }));
  app.use((err, _req, res, _next) => {
    let status = err.statusCode || err.status || 500;
    let msg = err.message;
    if (err.code === 11000) { status = 409; msg = "That username or email is unavailable. Try another or log in."; }
    if (err.name === "ValidationError" || err.name === "CastError") { status = 400; msg = "Please check the supplied values."; }
    if (status >= 500 && !err.statusCode) {
      console.error("Request failed:", err.name);
      msg = "Something went wrong. Please try again.";
    }
    res.status(status).json({ status: false, msg });
  });
  return app;
}

module.exports = { createApp };
