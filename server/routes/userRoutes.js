const { register, login, setAvatar, getAllUsers, searchContacts, changeOrder } = require("../controllers/usersController.js");//

const router = require("express").Router();

router.post("/register",register);
router.post("/login", login);
router.post("/setAvatar/:id", setAvatar);
router.get("/allUsers/:id", getAllUsers);
router.get("/searchContacts", searchContacts);

router.post("/changeOrder", changeOrder); //

module.exports = router;
