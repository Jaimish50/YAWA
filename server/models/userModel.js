const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username : {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20,
        unique: true
    },
    email : {
        type: String,
        required: true,
        unique: true,
        maxlength: 254
    },
    password : {
        type: String,
        required: true,
        select: false
    },
    isAvatarImageSet: {
        type: Boolean,
        default: false
    },
    avatarImage: {
        type: String,
        default: ""
    },
    usernameKey: { type: String, unique: true, sparse: true },
    emailVerifiedAt: { type: Date, default: null }
})

userSchema.set("toJSON", {
    transform: (_doc, value) => {
        delete value.password;
        delete value.__v;
        delete value.usernameKey;
        return value;
    }
});

module.exports = mongoose.model("Users",userSchema);
