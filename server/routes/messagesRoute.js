const { addMessage, getAllMessages, markRead } = require("../controllers/messagesController");
const { requireAuth } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const router = require("express").Router();
router.use(requireAuth);
router.post("/addMessage", rateLimit("send-message", 120, 60000, (req) => req.auth.user.id), addMessage);
router.get("/getmsg", getAllMessages);
router.post("/read", markRead);
module.exports = router;
