import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Logo from "../assets/logo.svg";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api, { apiError } from "../utils/api";
import { loginRoute, meRoute } from "../utils/APIRoutes";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function Login() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const handleChange = (event) => setValues({ ...values, [event.target.name]: event.target.value });

  useEffect(() => {
    let active = true;
    api.get(meRoute).then(({ data }) => {
      if (active) navigate(data.user.isAvatarImageSet ? "/" : "/setAvatar", { replace: true });
    }).catch(() => {});
    return () => { active = false; };
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!values.username.trim() || !values.password) { toast.error("Enter your username and password."); return; }
    setBusy(true);
    try {
      const { data } = await api.post(loginRoute, { username: values.username.trim(), password: values.password });
      setValues({ username: "", password: "" });
      navigate(data.user.isAvatarImageSet ? "/" : "/setAvatar", { replace: true });
    } catch (error) { toast.error(apiError(error)); }
    finally { setBusy(false); }
  };

  return (
    <>
      <FormContainer>
        <form onSubmit={handleSubmit}>
          <div className="brand"><img className="img" src={Logo} alt="YAWA" /><h1>YAWA</h1></div>
          <input aria-label="Username" type="text" placeholder="Username" name="username" required
            autoComplete="username" maxLength={100} value={values.username} onChange={handleChange} />
          <div className="password-container">
            <input aria-label="Password" type={showPassword ? "text" : "password"} placeholder="Password"
              name="password" required autoComplete="current-password" value={values.password} onChange={handleChange} />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FaEyeSlash /> : <FaEye />}</button>
          </div>
          <button type="submit" disabled={busy}>{busy ? "Logging in…" : "Login"}</button>
          <span>Don't have an account? <Link to="/register" className="a">Sign up</Link></span>
        </form>
      </FormContainer>
      <ToastContainer position="bottom-right" theme="dark" />
    </>
  );
}

const FormContainer = styled.div`
    button:disabled { opacity: 0.5; cursor: wait; }
    height: 100vh;
    width: 100vw;
    display: flex;
    justify-content: center;
    gap: 1rem;
    align-items: center;
    background-color: #131324;
    .brand {
        display: flex;
        align-items: center;
        gap: 1rem;
        justify-content: center;
        .img {
            height: 5rem;
        }
        h1{
            color: #F5F5F5;
        }
    }
    form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        background-color: #00000076;
        border-radius: 2rem;
        padding: 3rem 5rem;
        input {
            background-color: transparent;
            padding: 1rem;
            border: 0.1rem solid #4e0eff;
            border-radius: 0.4rem;
            color: white;
            width: 100%;
            font-size: 1rem;
            &:focus{
                border: 0.2rem solid #997af0;
                outline: none;
            }
        }
        .password-container {
            display: flex;
            align-items: center;
            input {
                flex: 1;
            }
            button {
                display: flex;
                align-items: center;
                background-color: #997af0;
                color: white;
                padding: 0.7rem;
                border: none;
                font-weight: bold;
                cursor: pointer;
                border-radius: 0.4rem;
                font-size: 1.7rem;
                text-transform: uppercase;
                transition: 0.3s ease-in-out;
                &:hover {
                    background-color: rgb(0, 149, 246);
                }
            }
        }
        button {
            background-color: #997af0;
            color: white;
            padding: 1rem 2rem;
            border: none;
            font-weight: bold;
            curser: pointer;
            border-radius: 0.4rem;
            font-size: 1rem;
            text-transform: uppercase;
            transition: 0.3s ease-in-out;
            &:hover{
                background-color: #4e0eff;
            }
            
        }
        span {
            color: white;
            text-transform: uppercase;
            .a{
                color: #4e0eff;
                text-decoration: none;
                font-weight: bold;
            }
        }

    }
`;

export default Login;
