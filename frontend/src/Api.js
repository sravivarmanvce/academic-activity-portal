// src/Api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// Add token to every request
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user") || '{}');
  const msalToken = localStorage.getItem("msal_access_token"); // Store M365 token here
  
  if (msalToken) {
    // Use real M365 access token
    config.headers.Authorization = `Bearer ${msalToken}`;
  } else if (user?.role) {
    // Fallback to dummy token for development
    let token = `${user.role}-token`;
    
    // For HOD users, create department-specific tokens
    if (user.role === 'hod' && user.department_id) {
      const deptMap = {
        1: 'civ',
        2: 'eee', 
        3: 'mec',
        4: 'ece',
        5: 'cse',
        6: 'inf',
        7: 'csm',
        8: 'csd',
        9: 'mba'
      };
      const deptCode = deptMap[user.department_id];
      if (deptCode) {
        token = `hod-${deptCode}-token`;
      }
    }
    
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed - please check your login status');
    }
    return Promise.reject(error);
  }
);

export default API;