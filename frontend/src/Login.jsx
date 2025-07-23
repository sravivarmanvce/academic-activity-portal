// src/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login({ onLogin }) {
  const [role, setRole] = useState("hod");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://127.0.0.1:8000/departments")
      .then((res) => res.json())
      .then((data) => setDepartments(data))
      .catch((err) => console.error("Failed to load departments", err));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (role === "hod" && !departmentId) return alert("Select Department");

    const user = {
      role,
      departmentId: role === "hod" ? parseInt(departmentId) : null,
    };
    localStorage.setItem("user", JSON.stringify(user));
    onLogin(user);
    navigate("/dashboard");
  };

  return (
    <div className="container mt-5">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Role</label>
          <select
            className="form-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="hod">HoD</option>
            <option value="principal">Principal</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {role === "hod" && (
          <div className="mb-3">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">-- Select --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="btn btn-primary">Login</button>
      </form>
    </div>
  );
}

export default Login;
