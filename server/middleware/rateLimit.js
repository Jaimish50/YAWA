const { createHash } = require("crypto");
const RateLimit = require("../models/rateLimitModel");

// Mongo-backed fixed windows keep login/OTP limits across backend restarts.
function rateLimit(scope, max, windowMs, key = (req) => req.ip) {
  return async (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === "true") return next();
    try {
      const now = Date.now();
      const window = Math.floor(now / windowMs);
      const digest = createHash("sha256").update(String(key(req))).digest("hex");
      const id = `${scope}:${digest}:${window}`;
      const expiresAt = new Date((window + 1) * windowMs);
      let bucket;
      try {
        bucket = await RateLimit.findOneAndUpdate(
          { _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
          { upsert: true, new: true }
        );
      } catch (err) {
        if (err.code !== 11000) throw err;
        bucket = await RateLimit.findOneAndUpdate({ _id: id }, { $inc: { count: 1 } }, { new: true });
      }
      if (bucket.count > max) {
        const retryAfter = Math.max(1, Math.ceil((expiresAt - now) / 1000));
        res.set("Retry-After", String(retryAfter));
        return res.status(429).json({ status: false, msg: "Too many attempts. Please try again later.", retryAfter });
      }
      next();
    } catch (err) { next(err); }
  };
}

module.exports = rateLimit;
