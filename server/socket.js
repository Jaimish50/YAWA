const { Server } = require("socket.io");
const { resolveSession } = require("./middleware/auth");

function attachSocket(server, app) {
  const origin = app.get("clientOrigin");
  const io = new Server(server, {
    cors: { origin, credentials: true },
    allowRequest: (req, callback) => callback(null, !req.headers.origin || req.headers.origin === origin),
  });
  app.set("io", io);
  io.use(async (socket, next) => {
    try {
      const auth = await resolveSession(socket.request);
      if (!auth) return next(new Error("Authentication required."));
      socket.data.auth = auth;
      next();
    } catch { next(new Error("Authentication required.")); }
  });
  io.on("connection", (socket) => {
    const { user, session } = socket.data.auth;
    socket.join("user:" + user.id);
    socket.join("session:" + session.id);
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, session.expiresAt - Date.now()));
    expiry.unref();
    socket.on("disconnect", () => clearTimeout(expiry));
  });
  return io;
}

module.exports = { attachSocket };
