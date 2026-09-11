import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Logo from "../assets/logo.svg";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api, { apiError } from "../utils/api";
import { registerRoute, verifyRegistrationRoute } from "../utils/APIRoutes";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const handleChange = (event) => setValues({ ...values, [event.target.name]: event.target.value });

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 100);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const validate = () => {
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(values.username.trim())) {
      throw new Error("Use 3–20 letters, numbers, dots, hyphens or underscores for your username.");
    }
    if (values.password !== values.confirmPassword) throw new Error("Passwords must match.");
    if (values.password.length < 12 || new TextEncoder().encode(values.password).length > 72 ||
        !/[a-zA-Z]/.test(values.password) || !/\d/.test(values.password) || !/[^a-zA-Z0-9\s]/.test(values.password)) {
      throw new Error("Use at least 12 characters with a letter, number and symbol (maximum 72 UTF-8 bytes).");
    }
  };

  const sendCode = async () => {
    const { data } = await api.post(registerRoute, { username: values.username.trim(), email: values.email.trim() });
    setChallenge(data);
    setCode("");
    setCooldown(data.resendAfter);
    toast.success("Verification code sent. Check your inbox and spam folder.");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    try { validate(); } catch (error) { toast.error(error.message); return; }
    setBusy(true);
    try {
      if (!challenge) {
        await sendCode();
      } else {
        await api.post(verifyRegistrationRoute, {
          username: values.username.trim(), email: challenge.email, password: values.password,
          challengeId: challenge.challengeId, code,
        });
        setValues({ username: "", email: "", password: "", confirmPassword: "" });
        navigate("/setAvatar", { replace: true });
      }
    } catch (error) {
      if (error.response?.data?.retryAfter) setCooldown(error.response.data.retryAfter);
      toast.error(apiError(error));
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (busy || cooldown) return;
    setBusy(true);
    try { await sendCode(); }
    catch (error) {
      if (error.response?.data?.retryAfter) setCooldown(error.response.data.retryAfter);
      toast.error(apiError(error));
    } finally { setBusy(false); }
  };

  return (
    <>
      <FormContainer>
        <form onSubmit={handleSubmit}>
          <div className="brand"><img className="img" src={Logo} alt="YAWA" /><h1>YAWA</h1></div>
          {challenge ? (
            <>
              <p className="help" role="status">Enter the six-digit code sent to <strong>{challenge.email}</strong>.
                The code expires in 10 minutes. Your account is created only after verification.</p>
              <input aria-label="Email verification code" type="text" inputMode="numeric"
                autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus
                placeholder="6-digit code" value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
              <button type="submit" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify & create account"}</button>
              <button className="secondary" type="button" onClick={resend} disabled={busy || cooldown > 0}>
                {cooldown > 0 ? "Resend code in " + cooldown + "s" : "Resend code"}
              </button>
              <button className="secondary" type="button" disabled={busy}
                onClick={() => { setChallenge(null); setCode(""); }}>Change registration details</button>
            </>
          ) : (
            <>
              <input aria-label="Username" type="text" placeholder="Username" name="username" value={values.username}
                autoComplete="username" required maxLength={20} onChange={handleChange} />
              <input aria-label="Email" type="email" placeholder="Email" name="email" value={values.email}
                autoComplete="email" required maxLength={254} onChange={handleChange} />
              <div className="password-container">
                <input aria-label="Password" type={showPassword ? "text" : "password"} placeholder="Password"
                  name="password" autoComplete="new-password" required value={values.password} onChange={handleChange} />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="password-container">
                <input aria-label="Confirm password" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm password"
                  name="confirmPassword" autoComplete="new-password" required value={values.confirmPassword} onChange={handleChange} />
                <button type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <FaEyeSlash /> : <FaEye />}</button>
              </div>
              <p className="help">At least 12 characters, including a letter, number and symbol.</p>
              <button type="submit" disabled={busy || cooldown > 0}>
                {busy ? "Sending code…" : cooldown > 0 ? "Try again in " + cooldown + "s" : "Send verification code"}
              </button>
            </>
          )}
          <span>Already have an account? <Link to="/login" className="a">Login</Link></span>
        </form>
      </FormContainer>
      <ToastContainer position="bottom-right" theme="dark" />
    </>
  );
}

const FormContainer = styled.div`
    min-height: 100vh;
    padding: 2rem 1rem;
    .help { color: #dad6ea; max-width: 26rem; line-height: 1.5; }
    .secondary { color: #d8c8ff; background: transparent; border: 1px solid #997af0; padding: 0.75rem; border-radius: 0.4rem; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: wait; }
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
        h1 {
            color: #f5f5f5;
        }
    }
    form {
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
        background-color: #00000076;
        border-radius: 2rem;
        padding: 2rem clamp(1rem, 5vw, 5rem);
        max-width: 100%;
        input {
            background-color: transparent;
            padding: 1rem;
            border: 0.1rem solid #4e0eff;
            border-radius: 0.4rem;
            color: white;
            width: 100%;
            font-size: 1rem;
            &:focus {
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
                    background-color: #4e0eff;
                }
            }
        }
        button[type="submit"] {
            background-color: #997af0;
            color: white;
            padding: 1rem 2rem;
            border: none;
            font-weight: bold;
            cursor: pointer;
            border-radius: 0.4rem;
            font-size: 1rem;
            text-transform: uppercase;
            transition: 0.3s ease-in-out;
            &:hover {
                background-color: #4e0eff;
            }
        }
        span {
            color: white;
            text-transform: uppercase;
            .a {
                color: #4e0eff;
                text-decoration: none;
                font-weight: bold;
            }
        }
    }
`;

export default Register;
