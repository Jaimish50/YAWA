const { addMessage, getAllMessages } = require("../controllers/messagesController");

const router = require("express").Router();
router.post("/addMessage",addMessage);
router.get("/getmsg", getAllMessages);

module.exports = router;