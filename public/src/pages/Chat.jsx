import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import api, { apiError } from "../utils/api";
import { allUsersRoute, host, meRoute } from "../utils/APIRoutes";
import { applyIncomingMessage } from "../utils/chatState";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";
import ChatContainer from "../components/ChatContainer";
import { io } from "socket.io-client";

function Chat() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState("");
  const selectedRef = useRef(null);
  const refreshVersion = useRef(0);
  const currentChat = contacts.find((contact) => contact._id === selectedId);

  useEffect(() => {
    let active = true;
    api.get(meRoute).then(({ data }) => {
      if (!active) return;
      if (!data.user.isAvatarImageSet) navigate("/setAvatar", { replace: true });
      else setCurrentUser(data.user);
    }).catch((error) => {
      if (!active) return;
      if (error.response?.status === 401) navigate("/login", { replace: true });
      else setLoadError(apiError(error));
    });
    return () => { active = false; refreshVersion.current += 1; };
  }, [navigate]);

  const refreshContacts = useCallback(async () => {
    if (!currentUser) return;
    const version = ++refreshVersion.current;
    try {
      const { data } = await api.get(allUsersRoute + "/" + currentUser._id);
      if (version === refreshVersion.current) { setContacts(data); setLoadError(""); }
    } catch (error) {
      if (version !== refreshVersion.current) return;
      if (error.response?.status === 401) navigate("/login", { replace: true });
      else setLoadError(apiError(error));
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const client = io(host, { withCredentials: true, autoConnect: false });
    const seen = new Set();
    setSocket(client);
    client.on("connect", () => { setConnected(true); refreshContacts(); });
    client.on("disconnect", (reason) => {
      setConnected(false);
      if (reason === "io server disconnect") navigate("/login", { replace: true });
    });
    client.on("connect_error", (error) => {
      setConnected(false);
      if (error.message === "Authentication required.") navigate("/login", { replace: true });
    });
    client.on("message:new", (event) => {
      if (seen.has(event.id)) return;
      seen.add(event.id);
      if (seen.size > 1000) seen.delete(seen.values().next().value);
      ++refreshVersion.current;
      setContacts((previous) => applyIncomingMessage(previous, event, currentUser._id,
        selectedRef.current, document.visibilityState === "visible"));
      refreshContacts();
    });
    client.on("chat:read", refreshContacts);
    client.connect();
    refreshContacts();
    return () => { client.removeAllListeners(); client.disconnect(); ++refreshVersion.current; };
  }, [currentUser, refreshContacts, navigate]);

  const changeChat = (contact) => {
    selectedRef.current = contact._id;
    setSelectedId(contact._id);
  };

  return (
    <Container>
      {loadError && <div className="status" role="alert">{loadError} <button onClick={() => window.location.reload()}>Retry</button></div>}
      {currentUser && !connected && <div className="status" role="status">Reconnecting to live messages…</div>}
      <div className="container">
        <Contacts contacts={contacts} currentUser={currentUser} currentChatId={selectedId} changeChat={changeChat} />
        {currentChat && currentUser ? (
          <ChatContainer key={currentChat._id} currentChat={currentChat} currentUser={currentUser}
            socket={socket} onActivity={refreshContacts} onError={(error) => {
              if (error.response?.status === 401) navigate("/login", { replace: true });
              else toast.error(apiError(error));
            }} />
        ) : <Welcome currentUser={currentUser} />}
      </div>
      <ToastContainer position="bottom-right" theme="dark" />
    </Container>
  );
}

const Container = styled.div`
    .status { color: #d9c9ff; }
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
            grid-template-columns: 35% 65%;
        }
    }
`;

export default Chat;
