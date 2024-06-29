const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    message: {
        text: {
            type: String,
            required: true,
        },
        users: {
            type: Array,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isRemoved: {
            type: Boolean,
            default: false
        }
    },
},
{ timestamps: true });

module.exports = mongoose.model("Messages",messageSchema);