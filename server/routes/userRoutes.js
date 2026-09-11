const controller = require("../controllers/usersController");
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const router = require("express").Router();
const minutes = (n) => n * 60 * 1000;
const bodyKey = (field) => (req) => typeof req.body?.[field] === "string" ? req.body[field].trim().toLowerCase() : "invalid";

router.post("/register", rateLimit("otp-ip", 20, minutes(60)),
  rateLimit("otp-email", 5, minutes(60), bodyKey("email")), controller.register);
router.post("/verify-registration", rateLimit("verify-ip", 40, minutes(15)), controller.verifyRegistration);
router.post("/login", rateLimit("login-ip", 40, minutes(15)),
  rateLimit("login-account", 10, minutes(15), bodyKey("username")), controller.login);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);
router.post("/setAvatar/:id", requireAuth, controller.setAvatar);
router.get("/allUsers/:id", requireAuth, controller.getAllUsers);
router.get("/searchContacts", requireAuth, controller.searchContacts);
// Order is derived from each user's messages; the global changeOrder endpoint is removed.
module.exports = router;
