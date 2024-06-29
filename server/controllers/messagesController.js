const Message = require("../models/messageModel");

module.exports.addMessage = async (req,res,next) => {
    try {
        const {from,to,message} = req.body;
        const data = await Message.create({
            message: {
                text: message,
                users: [from, to],
                sender: from,
            }
        });
        if(data) return res.json({msg: "Message added successfully", order: data.createdAt});
        return res.json({msg: "Failed to add to the database"});

    }catch (err) {
        next(err);
    }
};

module.exports.getAllMessages = async (req,res,next) => {
    try {
        const { from, to } = req.query;
        const messages = await Message.find({
            
                "message.users": {
                    $all: [from, to],
                }
            
        }).sort({ updatedAt: 1 });
        const projectMessages = messages.map((msg) => {
            return {
                fromSelf: msg.message.sender.toString() == from,
                message: msg.message,
                id:msg._id,
            };
        });
        return res.json(projectMessages);
    } catch (err){
        next(err);
    }
};



