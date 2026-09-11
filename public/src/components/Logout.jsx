import React, {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {BiPowerOff} from "react-icons/bi";
import api, { apiError } from "../utils/api";
import { logoutRoute } from "../utils/APIRoutes";
import { toast } from "react-toastify";


export default function Logout(){
    const navigate = useNavigate();
    const [isLogout , setIsLogout] = useState(false);

    const handleClick = async () => {
        if (isLogout) return;
        setIsLogout(true);
        try {
            await api.post(logoutRoute);
            navigate("/login", { replace: true });
        } catch (error) {
            toast.error(apiError(error));
        } finally {
            setIsLogout(false);
        }
        
    }
    return (
        <>
        <Button onClick={handleClick} disabled={isLogout} aria-label="Log out" title="Log out">
            <BiPowerOff className={ isLogout ? "logout" : "staylogin" }/>
        </Button>
        </>
    )
}

const Button = styled.button`
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0.5rem;
        border-radius: 0.5rem;
        background-color: #9a8abcd;
        border: none;
        cursor: pointer;
        .staylogin {
            font-size: 1.2rem;
            color: black;
        }
        .logout {
            font-size: 1.1rem;
            color: black;
        }
`;
