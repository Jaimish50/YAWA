const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socket = require("socket.io");
const userRoutes = require("./routes/userRoutes");
const messagesRoute = require("./routes/messagesRoute");
require("dotenv").config();
const HOST = "0.0.0.0";

const app = express();
app.use(cors({
  origin: "https://yawa-gyyq.vercel.app",
  credentials: true
}));
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

const server = app.listen(process.env.PORT,HOST, () => {
    console.log(`Server Started on Port ${process.env.PORT}`);
});

const io = socket(server,{
    cors:{
        origin:"https://yawa-gyyq.vercel.app",
        credentials: true,
    }
});

global.onlineUsers = new Map();

io.on("connection",(socket) => {
    console.log("connection is built");
    global.chatSocket = socket;
    socket.on("add-user", (userId) => {
        console.log("user id is received : "+ userId);
        onlineUsers.set(userId, socket.id);
    });

    socket.on("send-msg", (data) => {
        const sendUserSocket = onlineUsers.get(data.to);
        if(sendUserSocket){
            socket.to(sendUserSocket).emit("msg-recieve", data);
        }
    });
});