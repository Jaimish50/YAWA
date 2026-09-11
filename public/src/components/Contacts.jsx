import React, { useState } from "react";
import styled from "styled-components";
import Logo from "../assets/logo.svg";

function Contacts({ contacts, currentUser, currentChatId, changeChat }) {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = contacts.filter((contact) => contact.username.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Container>
      <div className="brand"><img src={Logo} alt="YAWA" /><h3>YAWA</h3></div>
      <div className="search">
        <input aria-label="Search chats" type="search" placeholder="Search chats" value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)} />
        <button className="unpressed" onClick={() => setSearchQuery("")}>Clear</button>
      </div>
      <div className="contacts" aria-label="Chats">
        {filtered.map((contact) => (
          <button type="button" key={contact._id} onClick={() => changeChat(contact)}
            aria-pressed={contact._id === currentChatId}
            aria-label={contact.username + (contact.unreadCount ? ", " + contact.unreadCount + " unread messages" : "")}
            className={"contact " + (contact._id === currentChatId ? "selected " : "") + (contact.unreadCount ? "has-unread" : "")}>
            <div className="avatar">
              {contact.avatarImage ? <img src={"data:image/svg+xml;base64," + contact.avatarImage} alt="" /> :
                <span className="avatar-fallback">{contact.username[0].toUpperCase()}</span>}
            </div>
            <div className="username">
              <h3>{contact.username}</h3>
              <p className="preview">{contact.lastMessage || "Start a conversation"}</p>
            </div>
            {contact.unreadCount > 0 && <span className="unread-dot" aria-hidden="true" title="Unread messages" />}
          </button>
        ))}
        {filtered.length === 0 && <p className="empty">{searchQuery ? "No matching chats" : "No contacts yet"}</p>}
      </div>
      {currentUser && <div className="current-user">
        <div className="avatar">{currentUser.avatarImage && <img src={"data:image/svg+xml;base64," + currentUser.avatarImage} alt="Your avatar" />}</div>
        <div className="username"><h2>{currentUser.username}</h2></div>
      </div>}
    </Container>
  );
}

const Container = styled.div`
    .empty { color: #ccc; padding: 1rem; }
    .avatar-fallback { display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: 50%; background: #6851ad; color: white; }
    .preview { color: #bcb8d0; font-size: 0.8rem; margin-top: 0.35rem; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
    .unread-dot { flex-shrink: 0; width: 0.7rem; height: 0.7rem; border-radius: 50%; background: #25d366; margin-left: auto; box-shadow: 0 0 0 3px #25d36620; }
    display: flex;
    flex-direction: column;
    height: 85vh; /* Ensure the container takes the full height of the viewport */
    overflow: hidden;
    background-color: #080420;
    .brand {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        img {
            height: 2rem;
        }
        h3 {
            color: white;
            text-transform: uppercase;
        }
    }
    .search {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0.5rem;
        input {
            width: 90%;
            margin: 5px 0.2rem 7px 0px; 
            padding: 0.5rem;
            border-radius: 0.2rem 0rem 0rem 0.2rem;
            border: none;
            outline: none;
            background-color: #ffffff39;
            color: white;
            font-size: 1rem;
            &::placeholder {
                color: #ccc;
            }
        }
        .pressed {
            padding: 0.46rem;
            background-color: #ffffff39;
            border-radius: 0rem 0.2rem 0.2rem 0rem;
            border: none;
            margin: 5px 0.2rem 7px 0px; 
            font-size: 0.9rem;
            color: white;
            &:hover{
                color: black;
            }
        }
        .unpressed {
            padding: 0.5rem;
            background-color: #ffffff39;
            border-radius: 0rem 0.2rem 0.2rem 0rem;
            border: none;
            margin: 5px 0.2rem 7px 0px; 
            font-size: 1rem;
            color: white;
            &:hover{
                color: black;
            }
        }
    }
    .contacts {
        flex: 1; /* Take up remaining space */
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: auto;
        gap: 0.8rem;
        &::-webkit-scrollbar {
            width: 0.2rem;
            &-thumb {
                background-color: #ffffff39;
                width: 0.1rem;
                border-radius: 1rem;
            }
        }
        .contact {
            border: 1px solid transparent;
            text-align: left;
            font: inherit;
            background-color: #ffffff39;
            min-height: 5rem;
            width: 90%;
            cursor: pointer;
            border-radius: 0.2rem;
            padding: 0.4rem;
            gap: 1rem;
            display: flex;
            align-items: center;
            transition: 0.5s ease-in-out;
            .avatar {
                img {
                    height: 3rem;
                }
            }
            .username {
                min-width: 0;
                flex: 1;
                h3 {
                    color: white;
                }
            } 
        }
        .selected {
            background-color: #9186f3
        }
        .has-unread {
            background-color: #153b32;
            border-color: #25d36655;
            .preview { color: #e1f7e8; font-weight: 600; }
        }
    }
    .current-user {
        background-color: #0d0d30;
        display: flex;
        justify-content: left;
        align-items: center;
        gap: 2rem;
        padding: 1rem;
        .avatar {
            img {
                height: 4rem;
                max-inline-size: 100%
            }
        }
        .username {
            h2 {
                color: white;
            }
        }
        @media screen and (min-width: 720px) and (max-width:1080px){
            grid-template-columns: 35% 65%;
            gap: 0.5rem;
            .username {
                h2 {
                    font-size: 1rem;
                }
            }
        }
    }
`;

export default Contacts;
