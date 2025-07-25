import React, { useState } from "react";
import API from "./Api";
import { useNavigate } from "react-router-dom";
import "./Login.css"; 

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await API.post("/auth/login", null, {
        params: { email },
      });

      if (res?.data) {
        const mappedUser = {
          ...res.data,
          departmentId: res.data.department_id, // consistent field for frontend
        };

        localStorage.setItem("user", JSON.stringify(mappedUser));
        onLogin(mappedUser); // ✅ update App.js user state
        navigate("/dashboard"); // ✅ route to dashboard
      } else {
        setError("Login failed: No user data returned.");
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError("User not found. Please check your email.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="login-page">
    <div className="login-container d-flex justify-content-center align-items-center">
      <div className="login-box shadow fade-in">
        <div className="text-center mb-5">
          <img src="/assets/logo.png" alt="Vardhaman" className="login-logo mb-2" />
          <h4 className="text-white">Academic Activity Portal</h4>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group mb-3">
            <label className="text-white">Email</label>
            <input
              type="email"
              className="form-control"
              /*placeholder="email@vardhaman.org"*/
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="text-white">Password</label>
            <input
              type="password"
              className="form-control"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Remember checkbox 
          <div className="form-check mb-3 text-white">
            <input
              type="checkbox"
              className="form-check-input"
              id="rememberMe"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
            <label className="form-check-label" htmlFor="rememberMe">
              Remember me
            </label>
          </div>*/}

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" className="btn btn-light w-100 fw-bold">
            Login
          </button>
        </form>
      </div>
    </div>
    </div>
  );
};

export default Login;
