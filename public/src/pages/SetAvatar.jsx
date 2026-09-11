import React, { useEffect, useState } from "react";
import styled from "styled-components";
import api, { apiError } from "../utils/api";
import loader from "../assets/loader.gif";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { setAvatarRoute, meRoute } from "../utils/APIRoutes";
import multiavatar from "@multiavatar/multiavatar/esm";

export default function SetAvatar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [avatars] = useState(() => Array.from({ length: 4 }, () =>
    btoa(unescape(encodeURIComponent(multiavatar(Math.random().toString(36).slice(2)))))));
  const [selectedAvatar, setSelectedAvatar] = useState();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(meRoute).then(({ data }) => { if (active) setUser(data.user); }).catch((error) => {
      if (!active) return;
      if (error.response?.status === 401) navigate("/login", { replace: true });
      else toast.error(apiError(error));
    });
    return () => { active = false; };
  }, [navigate]);

  const setProfilePicture = async () => {
    if (selectedAvatar === undefined) { toast.error("Please select an avatar."); return; }
    if (!user || busy) return;
    setBusy(true);
    try {
      await api.post(setAvatarRoute + "/" + user._id, { image: avatars[selectedAvatar] });
      navigate("/", { replace: true });
    } catch (error) {
      if (error.response?.status === 401) navigate("/login", { replace: true });
      else toast.error(apiError(error));
    } finally { setBusy(false); }
  };

  return (
    <Container>
      {!user ? <img src={loader} alt="Loading your profile" className="loader" /> : (
        <>
          <div className="title-container"><h1>Pick an avatar for your profile</h1></div>
          <div className="avatars">
            {avatars.map((avatar, index) => (
              <button type="button" key={index} aria-label={"Select avatar " + (index + 1)}
                aria-pressed={selectedAvatar === index}
                className={"avatar " + (selectedAvatar === index ? "selected" : "")}
                onClick={() => setSelectedAvatar(index)}>
                <img src={"data:image/svg+xml;base64," + avatar} alt="" />
              </button>
            ))}
          </div>
          <button onClick={setProfilePicture} className="submit-btn" disabled={busy}>
            {busy ? "Saving…" : "Set profile picture"}
          </button>
        </>
      )}
      <ToastContainer position="bottom-right" theme="dark" />
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 3rem;
  background-color: #131324;
  height: 100vh;
  width: 100vw;

  .loader {
    max-inline-size: 100%;
  }

  .title-container {
    h1 {
      color: white;
    }
  }

  .avatars {
    display: flex;
    gap: 2rem;

    .avatar {
      background: transparent;
      border: 0.4rem solid transparent;
      padding: 0.4rem;
      border-radius: 5rem;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: 0.5s ease-in-out;

      img {
        height: 6rem;
        transition: 0.5s ease-in-out;
      }

      &:hover {
        cursor: pointer;
        transform: scale(1.1);
      }
    }

    .selected {
      border: 0.4rem solid #4e0eff;
    }
  }

  .submit-btn {
    background-color: #4e0eff;
    color: white;
    padding: 1rem 2rem;
    border: none;
    font-weight: bold;
    cursor: pointer;
    border-radius: 0.4rem;
    font-size: 1rem;
    text-transform: uppercase;

    &:hover {
      background-color: #3c0edc;
    }
  }
`;
