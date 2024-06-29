import React, {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {BiPowerOff} from "react-icons/bi";


export default function Logout(){
    const navigate = useNavigate();
    const [isLogout , setIsLogout] = useState(false);

    const handleClick = async () => {
        localStorage.clear();
        setIsLogout(true);
        setTimeout(() => {
            setIsLogout(false);
            navigate("/login");
        },40);
        
    }
    return (
        <>
        <Button>
            <BiPowerOff onClick={handleClick} className={ isLogout ? "logout" : "staylogin" }/>
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
        curser: pointer;
        .staylogin {
            font-size: 1.2rem;
            color: black;
        }
        .logout {
            font-size: 1.1rem;
            color: black;
        }
`;