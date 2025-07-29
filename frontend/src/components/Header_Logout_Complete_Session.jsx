// src/components/Header.jsx   logout complete Microsoft account
import React from "react";
import { Link } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import "./Header.css";

function Header({ userRole }) {
  const { instance } = useMsal();

  const handleLogout = () => {
    localStorage.removeItem("user");
    instance.logoutRedirect({ postLogoutRedirectUri: "/" });
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark custom-navbar fixed-top shadow-sm px-3">
      <Link className="navbar-brand d-flex align-items-center" to="/">
        <img
          src="/assets/logo.png"
          alt="College Logo"
          style={{ height: "40px", marginRight: "10px" }}
        />
        <span>Portal</span>
      </Link>

      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
          <li className="nav-item">
            <Link className="nav-link" to="/">Dashboard</Link>
          </li>

          {(userRole === "hod" || userRole === "principal" || userRole === "admin") && (
            <li className="nav-item">
              <Link className="nav-link" to="/bpsaform">BPSA Entry</Link>
            </li>
          )}

          {(userRole === "principal" || userRole === "admin") && (
            <li className="nav-item">
              <Link className="nav-link" to="/manage-types">BPSA Manager</Link>
            </li>
          )}

          {userRole === "admin" && (
            <li className="nav-item">
              <Link className="nav-link" to="/admin/users">Users</Link>
            </li>
          )}

          {(userRole === "principal" || userRole === "admin") && (
            <li className="nav-item">
              <Link className="nav-link" to="/admin/manage-academic-years">Deadlines</Link>
            </li>
          )}
        </ul>

        <div className="d-flex align-items-center">
          <span className="navbar-text me-3">
            👤 <strong>{userRole.toUpperCase()}</strong>
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Header;
