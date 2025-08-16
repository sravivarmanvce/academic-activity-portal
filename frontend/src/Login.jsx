// src/Login.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./authConfig";
import API from "./Api";
import "./Login.css";

const Login = ({ onLogin }) => {
  const { instance } = useMsal();
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleMicrosoftLogin = async () => {
    setError("");

    try {
      const loginResponse = await instance.loginPopup(loginRequest);
      const email = loginResponse.account.username;

      // Now authenticate this email with your backend
      const res = await API.post("/auth/login", null, {
        params: { email },
      });

      if (res?.data) {
        const mappedUser = {
          ...res.data,
          departmentId: res.data.department_id,
        };

        localStorage.setItem("user", JSON.stringify(mappedUser));
        onLogin(mappedUser);
        navigate("/dashboard");
      } else {
        setError("Login failed: No user data returned.");
      }
    } catch (err) {
      console.error("Microsoft login error:", err);
      setError("Microsoft login failed. Please try again.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container d-flex justify-content-center align-items-center">
        <div className="login-box shadow fade-in">
          <div className="text-center mb-5">
            <img
              src="/assets/logo.png"
              alt="Vardhaman"
              className="login-logo mb-2"
            />
            <h4 className="text-dark">Academic Activity Portal</h4>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button
            onClick={handleMicrosoftLogin}
            className="btn btn-light w-100 fw-bold"
          >
            Sign in with Microsoft
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
