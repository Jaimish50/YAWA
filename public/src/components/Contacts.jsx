import React, {useState,useEffect} from 'react';
import styled from 'styled-components';
import Logo from "../assets/logo.svg";

function Contacts({ contacts, currentUser, changeChat, sender }) {
    const [currentUserName, setCurrentUserName] = useState(undefined);
    const [currentUserImage, setCurrentUserImage] = useState(undefined);
    const [currentSelected, setCurrentSelected] = useState(undefined);
    const [searchQuery, setSearchQuery] = useState("");
    const [press, setPress] = useState(false);

    const [from,setFrom] = useState(undefined);
    
    useEffect(() => {
        if (currentUser) {
            setCurrentUserImage(currentUser.avatarImage);
            setCurrentUserName(currentUser.username);
        }
    }, [currentUser]);

    useEffect(() => {
        if (sender) {
            setFrom(sender);
            debugger
        }
    }, [sender])

    const changeCurrentChat = (index, contact) => {
        if(contact._id === from){
            setFrom(0);
            debugger
        }
        setCurrentSelected(index);
        changeChat(contact);
    };

    const filteredContacts = contacts.filter((contact) =>
        contact.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleClose = async () => {
        setPress(true);
        setSearchQuery("");
        setTimeout(() => {
            setPress(false);
        }, 50);;  
    }
    return (
        <>
            {currentUserImage && currentUserName && (
                <Container>
                    <div className='brand'>
                        <img src={Logo} alt="logo" />
                        <h3>YAWA</h3>
                    </div>
                    <div className='search'>
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button onClick={handleClose} className={press ? "pressed" : "unpressed"}>
                            Close
                        </button>
                    </div>
                    <div className='contacts'>
                        {filteredContacts.map((contact, index) => (
                            <div
                                className={`contact ${index === currentSelected ? "selected" : ""} ${from === contact._id ? "msgReceived" : ""}`}
                                key={index}
                                onClick={() => changeCurrentChat(index, contact)}
                            >
                                <div className="avatar">
                                    <img
                                        src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                                        alt="avatar"
                                    />
                                </div>
                                <div className='username'>
                                    <h3>{contact.username}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="current-user">
                        <div className="avatar">
                            <img
                                src={`data:image/svg+xml;base64,${currentUserImage}`}
                                alt="avatar"
                            />
                        </div>
                        <div className='username'>
                            <h2>{currentUserName}</h2>
                        </div>
                    </div>
                </Container>
            )}
        </>
    );
}

const Container = styled.div`
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
                h3 {
                    color: white;
                }
            } 
        }
        .selected {
            background-color: #9186f3
        }
        .msgReceived {
            border: 2px solid green;
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