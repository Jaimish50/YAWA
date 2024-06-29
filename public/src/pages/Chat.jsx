import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { allUsersRoute, changeOrderRoute, host } from "../utils/APIRoutes";
import Contacts from '../components/Contacts.jsx';
import Welcome from "../components/Welcome.jsx";
import ChatContainer from "../components/ChatContainer.jsx";
import {io} from "socket.io-client";

function Chat(){
    const socket = useRef();

    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [currentUser, setCurrentUser] = useState(undefined);
    const [currentChat, setCurrentChat] = useState(undefined);
    const [isLoaded, setIsLoaded] = useState(false);
    const [sender, setSender] = useState(undefined);

    useEffect(() => {
        const temp = async () => {
            if(!localStorage.getItem("chat-app-user")){
                navigate("/login");
            }else{
                setCurrentUser(await JSON.parse(localStorage.getItem("chat-app-user")));
                setIsLoaded(true);
            }
        }
        temp();
    },[]);

    useEffect(() => {
        if(currentUser){
            socket.current = io(host);
            socket.current.emit("add-user", currentUser._id);
        }
    },[currentUser]);

    useEffect(()=> {
        const temp2 = async () => {
            if(currentUser){
                if(currentUser.isAvatarImageSet){
                    const {data} = await axios.get(`${allUsersRoute}/${currentUser._id}`);
                    setContacts(data);
                }else{
                    navigate("/setAvatar");
                }
            }
        }
        temp2();
        
    },[currentUser]);

    const handleChatChange = (chat) => {
        setCurrentChat(chat);
    }

    const handleChangeOrder = async (sender, order) => {//
        setSender(sender);
        debugger
        const response = await axios.post(changeOrderRoute, {
            sender,
            order
        });

        const {data} = await axios.get(`${allUsersRoute}/${currentUser._id}`);
        setContacts(data);
    }

    return <Container>
        <div className="container">
            {contacts && (<Contacts contacts={contacts} currentUser={currentUser} currentChat={currentChat} changeChat={handleChatChange} sender={sender} />)}
            {isLoaded && currentChat === undefined ? (
                <Welcome currentUser={currentUser} />
            ) : (
                <ChatContainer currentChat={currentChat} currentUser={currentUser} socket={socket} changeOrder={handleChangeOrder} />
            )}
        </div>
    </Container>
}

const Container = styled.div`
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1rem;
    align-items: center;
    background-color: #131324;
    .container {
        height: 85vh;
        width: 85vw;
        background-color: #00000076;
        display: grid;
        grid-template-columns: 25% 75%;

        @media screen and (min-width: 720px) and (max-width:1080px){
            grid-tamplate-columns: 35% 65%;
        }
    }
`;

export default Chat;
