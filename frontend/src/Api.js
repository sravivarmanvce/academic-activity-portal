// src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// Add token to every request
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.role) {
    const token = `${user.role}-token`;  // dummy token for fastapi
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
