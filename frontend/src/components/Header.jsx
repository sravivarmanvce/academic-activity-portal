// src/components/Header.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import "./Header.css";

function Header({ userRole, userName, onLogout }) {
  const location = useLocation();
  
  // Helper function to determine if a link is active
  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  // Helper function to determine if a dropdown menu should be active
  const isDropdownActive = (menuPaths) => {
    return menuPaths.some(path => location.pathname === path);
  };

  // Helper function to get link class based on active state
  const getLinkClass = (path) => {
    return `nav-link ${isActiveLink(path) ? 'active' : ''}`;
  };

  // Helper function to get dropdown toggle class (for main menu items like BPSA)
  const getDropdownToggleClass = (menuPaths) => {
    return `nav-link dropdown-toggle ${isDropdownActive(menuPaths) ? 'active' : ''}`;
  };

  // Helper function for dropdown items
  const getDropdownItemClass = (path) => {
    return `dropdown-item ${isActiveLink(path) ? 'active' : ''}`;
  };

  // Example usage for future dropdowns:
  // For a "Reports" dropdown with submenu items at "/reports/summary" and "/reports/details":
  // <a className={getDropdownToggleClass(["/reports/summary", "/reports/details"])} ...>Reports</a>
  return (
    <nav className="navbar navbar-expand-lg navbar-light custom-navbar fixed-top shadow-sm px-3">
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
            <Link className={getLinkClass("/")} to="/">Home</Link>
          </li>

          {userRole === "hod" && (
            <>
              <li className="nav-item dropdown">
                <button 
                  className={`nav-link dropdown-toggle ${getDropdownToggleClass(["/bpsaform", "/documents"]).includes('active') ? 'active' : ''}`}
                  id="bpsaDropdown" 
                  type="button"
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                  style={{ background: 'none', border: 'none' }}
                >
                  BPSA
                </button>
                <ul className="dropdown-menu" aria-labelledby="bpsaDropdown">
                  <li>
                    <Link className={getDropdownItemClass("/bpsaform")} to="/bpsaform">Budget & Plan</Link>
                  </li>
                  <li>
                    <Link className={getDropdownItemClass("/documents")} to="/documents">Document Management</Link>
                  </li>
                </ul>
              </li>
            </>
          )}

          {/* Analytics - Only for Principal, Admin, HOD (exclude PA) */}
          {(userRole === "principal" || userRole === "admin" || userRole === "hod") && (
            <li className="nav-item">
              <Link className={getLinkClass("/analytics")} to="/analytics">Analytics</Link>
            </li>
          )}

          {userRole !== "hod" && (userRole === "principal" || userRole === "admin" || userRole === "pa_principal") && (
            <>
              <li className="nav-item dropdown">
                <button 
                  className={`nav-link dropdown-toggle ${getDropdownToggleClass(["/bpsaform", "/documents", "/program-entry-summary", "/manage-types"]).includes('active') ? 'active' : ''}`}
                  id="bpsaDropdownAdmin" 
                  type="button"
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                  style={{ background: 'none', border: 'none' }}
                >
                  BPSA
                </button>
                <ul className="dropdown-menu" aria-labelledby="bpsaDropdownAdmin">
                  <li>
                    <Link className={getDropdownItemClass("/bpsaform")} to="/bpsaform">Budget & Plan</Link>
                  </li>
                  <li>
                    <Link className={getDropdownItemClass("/documents")} to="/documents">Document Management</Link>
                  </li>
                  <li>
                    <Link className={getDropdownItemClass("/program-entry-summary")} to="/program-entry-summary">Summary Status</Link>
                  </li>
                  <li>
                    <Link className={getDropdownItemClass("/manage-types")} to="/manage-types">Program Types Manager</Link>
                  </li>
                </ul>
              </li>
            </>
          )}

          {userRole === "admin" && (
            <li className="nav-item">
              <Link className={getLinkClass("/admin/users")} to="/admin/users">Users</Link>
            </li>
          )}

          {(userRole === "principal" || userRole === "admin" || userRole === "pa_principal") && (
            <>
              <li className="nav-item">
                <Link className={getLinkClass("/admin/manage-academic-years")} to="/admin/manage-academic-years">Deadlines</Link>
              </li>
            </>
          )}
        </ul>

        <div className="d-flex align-items-center">
          <NotificationBell />
          <span className="navbar-text me-3">
            👤 <strong className="text-white">{userName}</strong>
          </span>
          <button className="btn btn-outline-primary btn-sm" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Header;
