import axios from "axios";

// Profile data in localStorage was never authentication. Remove the legacy cache.
localStorage.removeItem("chat-app-user");

const api = axios.create({
  withCredentials: true,
  timeout: 20000,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

export const apiError = (error) =>
  error.response?.data?.msg || "Couldn't reach the server. Please try again.";

export default api;
