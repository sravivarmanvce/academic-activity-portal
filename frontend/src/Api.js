// src/Api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// Add token to every request
API.interceptors.request.use((config) => {
  console.log('Making API request to:', config.url);
  const user = JSON.parse(localStorage.getItem("user") || '{}');
  const msalToken = localStorage.getItem("msal_access_token"); // Store M365 token here
  
  // Temporarily disable auth for debugging
  // if (msalToken) {
  //   // Use real M365 access token
  //   config.headers.Authorization = `Bearer ${msalToken}`;
  // } else if (user?.role) {
  //   // Fallback to dummy token for development
  //   const token = `${user.role}-token`;
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  console.log('Request config:', config);
  return config;
});

// Add response interceptor for debugging
API.interceptors.response.use(
  (response) => {
    console.log('API response received:', response.config.url, response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API error:', error.config?.url, error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default API;
