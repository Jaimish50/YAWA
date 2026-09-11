import React, { useState } from "react";
import styled from "styled-components";
import Picker from "emoji-picker-react";
import { IoMdSend } from "react-icons/io";
import { BsEmojiSmileFill } from "react-icons/bs";

export default function ChatInput({ handleSendMsg }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const sendChat = async (event) => {
    event.preventDefault();
    if (!msg.trim() || sending) return;
    setSending(true);
    try {
      if (await handleSendMsg(msg)) setMsg("");
    } finally { setSending(false); }
  };

  return (
    <Container>
      <div className="button-container">
        <div className="emoji">
          <button type="button" aria-label="Choose emoji" className="emoji-toggle"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}><BsEmojiSmileFill /></button>
          {showEmojiPicker && <Picker onEmojiClick={(emoji) => setMsg((value) => (value + emoji.emoji).slice(0, 4000))} />}
        </div>
      </div>
      <form className="input-container" onSubmit={sendChat}>
        <input type="text" aria-label="Message" placeholder="Type your message here" maxLength={4000}
          disabled={sending} value={msg} onChange={(event) => setMsg(event.target.value)} />
        <button type="submit" aria-label="Send message" disabled={sending || !msg.trim()}
          className={sending ? "pressed" : "unpressed"}><IoMdSend /></button>
      </form>
    </Container>
  );
}

const Container = styled.div`
    .emoji-toggle { background: transparent; border: 0; padding: 0; }
    button:disabled { opacity: 0.5; cursor: wait; }
    display: grid;
    grid-template-columns: 5% 95%;
    align-items: center;
    background-color: #080420;
    padding: 0 2rem;
    padding-bottom: 0.3rem;
    .button-container {
        display: flex;
        align-items: center;
        color: white;
        gap : 1rem;
        .emoji {
            position: relative;
            svg {
                font-size: 1.5rem;
                color: #ffff00c8;
                cursor: pointer;
            }

            .emoji-picker-react {
                position: absolute;
                top: -350px;
                background-color: #080420;
                box-shadow: 0 5px 10px #9a86f3;
                border-color: #9186f3;

                .emoji-scroll-wrapper::-webkit-scrollbar {
                    background-color: #080420;
                    width: 5px;

                    &-thumb {
                        background-color: #9186f3;
                    }
                }

                .emoji-categories {
                    button {
                        filter: contrast(0);
                    }
                }

                .emoji-search {
                    background-color: transparent;
                    border-color: #9186f3;
                }

                .emoji-group:before {
                    background-color: #080420;
                }
            }
        }
    } 
    .input-container {
        width: 100%;
        border-radius: 2rem;
        display: flex;
        background-color: #ffffff34;
        input {
            width: 90%;
            background-color: transparent;
            color: white;
            border: none;
            padding-left : 1rem;
            font-size: 1.2rem;

            &::selection {
                background-color: #9a86f3;
            }
            &:focus {
                outline: none;  
            }
        }  
        .unpressed {
            padding: 0.3rem 2rem;
            border-radius: 2rem;
            display: flex;
            justify-content; center;
            align-items: center;
            background-color: #9a86f3;
            border: none;
            @media screen and (min-width: 720px) and (max-width: 1080px) {
                padding: 0.3rem 2rem;
                svg {
                    font-size: 1rem;
                }
            }
            svg {
                font-size:2rem;
                color: white;
            }
        }    
        .pressed {
            padding: 0.26rem 1.97rem;
            border-radius: 2rem;
            display: flex;
            justify-content; center;
            align-items: center;
            background-color: #9a86f3;
            border: none;
            @media screen and (min-width: 720px) and (max-width: 1080px) {
                padding: 0.29rem 1.97rem;
                svg {
                    font-size: 0.97rem;
                }
            }
            svg {
                font-size:1.97rem;
                color: white;
            }
        }    
    }      
`;
