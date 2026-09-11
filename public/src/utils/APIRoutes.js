// export const host = "https://yawa-n436.onrender.com";
export const host = process.env.REACT_APP_API_URL || "http://localhost:5000";
export const registerRoute = `${host}/api/auth/register`;
export const loginRoute = `${host}/api/auth/login`;
export const setAvatarRoute = `${host}/api/auth/setAvatar`;
export const allUsersRoute = `${host}/api/auth/allUsers`;

export const sendMessagesRoute = `${host}/api/messages/addMessage`;
export const getAllMessagesRoute = `${host}/api/messages/getmsg`;

export const searchContactsRoute = `${host}/api/auth/searchContacts`;

export const verifyRegistrationRoute = host + "/api/auth/verify-registration";
export const meRoute = host + "/api/auth/me";
export const logoutRoute = host + "/api/auth/logout";
export const markReadRoute = host + "/api/messages/read";
