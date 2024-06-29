const User = require("../models/userModel");
const bcrypt = require("bcrypt");

module.exports.register = async (req,res,next) =>{
    try {
        const {username,email,password} = req.body;
        const usernameCheck = await User.findOne({ username });
        if(usernameCheck)
            return res.json({ msg: "Username already used", status: false });
        const emailCheck = await User.findOne({ email });
        if(emailCheck)
            return res.json({ msg : "Email already used", status: false});
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            username,
            password: hashedPassword
        });
        delete user.password;
        return res.json({status: true, user});
    } catch(err){
        next(err);
    }
};

module.exports.login = async (req,res,next) => {
    try {
        const { username, password } = req.body; 
        const user = await User.findOne({ username });
        if(!user){
            return res.json({ msg: "Wrong Username", status:false});
        }

        const checkPass = await bcrypt.compare(password,user.password);
        if(!checkPass){
            return res.json({ msg: "Password is wrong", status:false});
        }
        return res.json({user, status: true});
    }catch (err){
        next(err);
    }
}

module.exports.setAvatar = async (req,res,next) => {
    try {
        const userId = req.params.id;
        const avatarImage= req.body.image; 
        const userData = await User.findByIdAndUpdate(userId, {
            isAvatarImageSet: true,
            avatarImage,
        });
        return res.json({isSet: true, image:avatarImage});
    }catch (err){
        next(err);
    }
}

module.exports.getAllUsers = async (req,res,next) => {
    try {
        const users = await User.find({_id: { $ne: req.params.id }}).select([
            "email",
            "username",
            "avatarImage",
            "_id",
        ]).sort({order : -1});
        return res.json(users);
    } catch(err){
        next(err);
    }
}

module.exports.searchContacts = async (req,res,next) => {
    try {
        const key = req.query.key;
        const contacts = await User.find({ username : new RegExp('^' + key, 'i')}).select([
            "email",
            "username",
            "avatarImage",
            "_id",
        ]);
        return res.json(contacts);
    } catch (err) {
        next(err);
    }
}

module.exports.changeOrder = async  (req, res, next) => {
    try {
        const { sender, order } = req.body;
        const users = await User.findByIdAndUpdate({ _id: sender }, { order });
        
        return res.json(users);
    } catch (err) {
        next(err);
    }
}