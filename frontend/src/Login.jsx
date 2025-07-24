import React, { useState } from "react";
import API from "./Api";
import { useNavigate } from "react-router-dom";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
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
    <div className="container mt-5" style={{ maxWidth: "400px" }}>
      <h3 className="mb-4">Login with Email</h3>
      <form onSubmit={handleLogin}>
        <div className="form-group mb-3">
          <label>Email</label>
          <input
            type="email"
            className="form-control"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <button type="submit" className="btn btn-primary w-100">
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
