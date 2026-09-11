import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import Logout from "./Logout";
import ChatInput from "./ChatInput";
import api from "../utils/api";
import { getAllMessagesRoute, sendMessagesRoute, markReadRoute } from "../utils/APIRoutes";
import { belongsToChat, mergeMessages } from "../utils/chatState";
import { FaTrashAlt } from "react-icons/fa";

export default function ChatContainer({ currentChat, currentUser, socket, onActivity, onError }) {
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(document.visibilityState === "visible");
  const scrollRef = useRef();
  const lastRead = useRef(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const peerId = currentChat._id;
  const userId = currentUser._id;
  const deletionKey = "deleted-messages:" + userId + ":" + peerId;
  const [deleted, setDeleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem(deletionKey)) || []; } catch { return []; }
  });

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const { data } = await api.get(getAllMessagesRoute, { params: { to: peerId }, signal: controller.signal });
        if (active) { setMessages((previous) => mergeMessages(previous, data)); setLoaded(true); }
      } catch (error) { if (active && error.code !== "ERR_CANCELED") onErrorRef.current(error); }
    };
    const receive = (event) => {
      if (belongsToChat(event, userId, peerId)) setMessages((previous) => mergeMessages(previous, [event]));
    };
    socket?.on("message:new", receive);
    socket?.on("connect", load);
    load();
    return () => {
      active = false;
      controller.abort();
      socket?.off("message:new", receive);
      socket?.off("connect", load);
    };
  }, [peerId, userId, socket]);

  useEffect(() => {
    if (!loaded || !visible) return;
    const incoming = messages.filter((message) => message.from === peerId);
    const through = incoming[incoming.length - 1]?.id;
    if (!through || lastRead.current === through) return;
    lastRead.current = through;
    api.post(markReadRoute, { to: peerId, through }).then(onActivity).catch((error) => {
      lastRead.current = null;
      onErrorRef.current(error);
    });
  }, [messages, peerId, loaded, visible, onActivity]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendMsg = async (text) => {
    try {
      const { data } = await api.post(sendMessagesRoute, { to: peerId, message: text });
      setMessages((previous) => mergeMessages(previous, [data.message]));
      onActivity();
      return true;
    } catch (error) { onErrorRef.current(error); return false; }
  };

  const hideMessages = (ids) => {
    const next = [...new Set([...deleted, ...ids])];
    setDeleted(next);
    localStorage.setItem(deletionKey, JSON.stringify(next));
  };

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">{currentChat.avatarImage && <img src={"data:image/svg+xml;base64," + currentChat.avatarImage} alt="" />}</div>
          <div className="username"><h3>{currentChat.username}</h3></div>
        </div>
        <div className="settings">
          <button type="button" onClick={() => hideMessages(messages.map((message) => message.id))}
            className="unpressed" title="Clear this chat on this device" aria-label="Clear chat on this device"><FaTrashAlt /></button>
          <Logout />
        </div>
      </div>
      <div className="chat-messages">
        {!loaded && <p role="status">Loading messages…</p>}
        {loaded && messages.length === 0 && <p>No messages yet. Say hello!</p>}
        {messages.filter((message) => !deleted.includes(message.id)).map((message) => (
          <div key={message.id}>
            <div className={"message " + (message.from === userId ? "sended" : "received")}>
              <div className="content"><p>{message.text}</p></div>
              <div className="clear-message">
                <button className="normal" onClick={() => hideMessages([message.id])}
                  aria-label="Hide message on this device"><FaTrashAlt /></button>
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>
      <ChatInput handleSendMsg={handleSendMsg} />
    </Container>
  );
}

const Container = styled.div`
    padding-top: 1rem;
    color: white;
    display: grid;
    grid-template-rows: 10% 78% 12%;
    gap: 0.1rem;
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
`;
