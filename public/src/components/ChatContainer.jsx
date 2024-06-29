import React, {useState,useEffect, useRef} from 'react';
import styled from 'styled-components';
import Logout from '../components/Logout';
import ChatInput from "../components/ChatInput";
import {ToastContainer, toast} from 'react-toastify';
import axios from "axios";
import { getAllMessagesRoute, sendMessagesRoute } from '../utils/APIRoutes';
import { v4 as uuidv4 } from "uuid";
import { FaTrashAlt } from "react-icons/fa";

export default function ChatContainer({ currentChat, currentUser, socket, changeOrder }){
    const [messages, setMessages] = useState([]);
    const [arrivalMessage, setArrivalMessage] = useState(null);
    const scrollRef = useRef();

    const [press, setPress] = useState(false);

    const [isDelete, setIsDelete] = useState(false);

    useEffect(() => {
        const fetchMessages = async () => {
            if(currentChat && currentUser){
                const response = await axios.get(getAllMessagesRoute, {
                    params: {
                        from: currentUser._id,
                        to: currentChat._id,
                    }
                });
                
                const deletedMessages = JSON.parse(localStorage.getItem("deleted-messages")) || [];
                const updatedMessages = response.data.filter((message) => !deletedMessages.includes(message.id)) || [];
                setMessages(updatedMessages);
            }
        }
        fetchMessages();
    },[currentChat,currentUser])

    const handleSendMsg = async (msg) => {
        const or = await axios.post(sendMessagesRoute, {
            from: currentUser._id,
            to: currentChat._id,
            message: msg,
        });
        debugger
        socket.current.emit("send-msg", {
            to: currentChat._id,
            from: currentUser._id,
            message: msg,
            order: or.data.order
        })

        const newMessage ={ fromSelf: true, message: {text:msg}};
        
        setMessages((prev) => [...prev, newMessage]);
    }

    useEffect(() => {
        if(socket.current){
            socket.current.on("msg-recieve",(data)=> {
                changeOrder( data.from, data.order );
                toast.success(`${data.message} from ${data.from}, to: ${data.to}`);
                setArrivalMessage({ fromSelf: false, message: {text: data.message} });
            });
        }
    },[]);

    useEffect(() => {
        if(arrivalMessage) {
            setMessages((prev) => {
                const updatedMessages = [...prev, arrivalMessage];
                return updatedMessages;   
            });
        } 
    },[arrivalMessage]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    },[messages]);

    const handleClearAllChat = async () => {
        const deletedMessages = JSON.parse(localStorage.getItem("deleted-messages")) || [];
        const deletingMessages = messages.map((message) => message.id);
        deletingMessages.map((m) => deletedMessages.push(m) );
        
        localStorage.setItem("deleted-messages", JSON.stringify(deletedMessages));
        
        setMessages([]);
    }

    const handleDeleteMessage = async (id) => {
        setMessages((prevMessages) => prevMessages.filter((message) => message.id !== id));

        const deletedMessages = JSON.parse(localStorage.getItem("deleted-messages")) || [];
        deletedMessages.push(id);
        localStorage.setItem("deleted-messages", JSON.stringify(deletedMessages));
    }

    return (
        <>{
            currentChat && (
                <>
                <Container>
                <div className='chat-header'>
                    <div className="user-details">
                        <div className="avatar">
                            <img 
                                src={`data:image/svg+xml;base64,${currentChat.avatarImage}`} 
                                alt="avatar"
                            />
                        </div>
                        <div className="username">
                            <h3>{currentChat.username}</h3>
                        </div>
                    </div>
                    <div className="settings">
                        <button onClick={handleClearAllChat} className={press ? "pressed" : "unpressed"}> 
                            <FaTrashAlt />
                        </button>
                        
                        <Logout></Logout>
                    </div>
                    
                </div>
                <div className="chat-messages">
                    {
                        messages.map((message) => {
                            return (
                                <>
                                    <div ref={scrollRef} key={uuidv4()}>
                                        <div className={`message ${message.fromSelf ? "sended" : "received"}`}>
                                            <div className="content">
                                                <p>
                                                    {message.message.text}
                                                </p>
                                                
                                            </div>
                                            <div className="clear-message" onClick={() => handleDeleteMessage(message.id)}>
                                                    <button 
                                                        className={isDelete ? "delete" : "normal"}
                                                    >
                                                        <FaTrashAlt />
                                                    </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )
                            
                        })
                    }
                </div>               
                <ChatInput handleSendMsg={handleSendMsg} />
            </Container>
            <ToastContainer />
            </>
            )
        }
            
        </>
    )
}

const Container = styled.div`
    padding-top: 1rem;
    color: white;
    display: grid;
    grid-template-rows: 10% 78% 12%;
    gap: 0.1 rem;
    overflow: hidden;
    @media screen and (min-width: 720px) and (max-width: 1080px){
        grid-auto-rows: 15% 70% 15%;
    }
    .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0rem 2rem;
        .user-details {
            display: flex;
            align-items: center;
            gap: 1rem;
            .avatar {
                img {
                    height: 3rem;
                }
                .username {
                    h3 {
                        color: white;
                    }
                }
            }
        }
        .settings {
            width: 5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            .unpressed {
                font-size: 2rem;
                border: none;
                background: transparent;
                color: white;
                &:hover {
                    color: red;
                }
            }
            .pressed {
                font-size: 1.85rem;
                border: none;
                background: transparent;
                color: white;   
            }
        }
    }
    .chat-messages {
        padding: 1rem 2rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        overflow: auto;
        &::-webkit-scrollbar {
            width: 0.2rem;
            &-thumb {
                background-color: #ffffff39;
                width: 0.1rem;
                border-radius: 1rem;
            }
        }
        .message {
            display: flex;
            align-items: center;
            .content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                max-width: 60%;
                overflow-wrap: break-word;
                padding: 1.1rem;
                border-radius: 1rem 0rem 0rem 1rem;
                color: white;
                gap: 2rem;
                font-size: 1.1rem;
                
            }
            .clear-message{
                .normal {
                    font-size: 1.2rem;
                    padding: 1.0rem;
                    border-radius: 0 1rem 1rem 0rem;
                    background-color: #9a86f3;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border: none;
                    color: white;
                }
                    
                .delete {
                    font-size: 1.1rem;
                    padding: 1.0rem;
                    border-radius: 0 1rem 1rem 0rem;
                    background-color: #9a86f3;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border: none;
                    color: white;
                }
            }
        }
    }
        .sended {
            justify-content: flex-end;
            .content {
                background-color: #4f0aff21;
            }
        }

        .received {
            justify-content: flex-start;
            .content {
                background-color: #9900ff20;
            }
        }
    }
`; 