import React, {useState} from "react";
import { FaTrashAlt } from "react-icons/fa";
import styled from "styled-components";


export default function ClearChat({ handleClearAllChat }){
    
    
    return (
        <>
            <Button onClick={handleClearAllChat} >
                
            </Button>
        </>
    )
}

const Button = styled.button`
    

`;