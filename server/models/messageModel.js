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
            ref: "Users",
            required: true,
        },
        isRemoved: {
            type: Boolean,
            default: false
        }
    },
    // Legacy messages have no unread field and are treated as already read.
    unread: { type: Boolean, default: true },
    readAt: { type: Date, default: null },
},
{ timestamps: true });

messageSchema.index({ "message.users": 1, createdAt: 1 });

module.exports = mongoose.model("Messages",messageSchema);
