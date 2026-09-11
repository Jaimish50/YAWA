require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const http = require("http");
const mongoose = require("mongoose");
const { createApp } = require("./app");
const { attachSocket } = require("./socket");

async function startServer() {
  if (!process.env.MONGO_URL) throw new Error("MONGO_URL environment variable is not configured.");
  if (process.env.COOKIE_SAME_SITE === "none" && process.env.NODE_ENV !== "production") {
    throw new Error("SameSite=None cookies require HTTPS production mode.");
  }
  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 5000 });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  console.log("DB Connection Successfully");
  const app = createApp();
  const server = http.createServer(app);
  const io = attachSocket(server, app);
  const port = Number(process.env.PORT || 5000);
  server.on("error", async (err) => {
    console.error(err.code === "EADDRINUSE"
      ? "Port " + port + " is already in use. Stop the existing backend process first."
      : "Server Error: " + err.message);
    io.close();
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  server.listen(port, "0.0.0.0", () => console.log("Server Started on Port " + port));
  const shutdown = () => {
    if (app.get("shuttingDown")) return;
    app.set("shuttingDown", true);
    const deadline = setTimeout(() => process.exit(1), 25000);
    deadline.unref();
    io.close(async () => {
      try {
        await mongoose.disconnect();
      } catch {
        process.exitCode = 1;
      } finally {
        clearTimeout(deadline);
      }
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  return { app, server, io };
}

if (require.main === module) {
  startServer().catch(async (err) => {
    console.error("Backend startup failed:", err.message);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}

module.exports = { startServer };
