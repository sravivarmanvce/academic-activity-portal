// src/Api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// Add token to every request
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const msalToken = localStorage.getItem("msal_access_token"); // Store M365 token here
  
  if (msalToken) {
    // Use real M365 access token
    config.headers.Authorization = `Bearer ${msalToken}`;
  } else if (user?.role) {
    // Fallback to dummy token for development
    const token = `${user.role}-token`;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
