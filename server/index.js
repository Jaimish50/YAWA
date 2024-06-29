const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const messagesRoute = require("./routes/messagesRoute");

app.use(cors());
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/messages", messagesRoute);

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("DB Connection Successfully");
    })
    .catch((err) => {
        console.error(`DB Connection Error: `, err.message);
    });

const server = app.listen(process.env.PORT, () => {
    console.log(`Server Started on Port ${process.env.PORT}`);
});

const socket = require("socket.io");

const io = socket(server,{
    cors:{
        origin:"http://localhost:3000",
        credentials: true,
    }
});

global.onlineUsers = new Map();

io.on("connection",(socket) => {
    global.chatSocket = socket;
    socket.on("add-user", (userId) => {
        onlineUsers.set(userId, socket.id);
    });

    socket.on("send-msg", (data) => {
        const sendUserSocket = onlineUsers.get(data.to);
        if(sendUserSocket){
            socket.to(sendUserSocket).emit("msg-recieve", data);
        }
    });
});