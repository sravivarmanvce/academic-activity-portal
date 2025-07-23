import React from "react";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Admin Dashboard</h2>

      <div className="d-flex flex-wrap justify-content-center gap-4">
            <div
              className="card text-white bg-success h-100 shadow dashboard-tile clickable-tile"
              onClick={() => navigate("/manage-types")}
            >
              <div className="card-body text-center">
                <h5 className="card-title">Student Activities Program Type Manager</h5>
                <p className="card-text">Manage Program Types, Categories and Access</p>
                <button className="btn btn-light mt-2">Manage</button>
              </div>
            </div>
 


        <button
          className="btn btn-outline-primary btn-lg"
          onClick={() => navigate("/admin/program-types")}
        >
          🛠️ Manage Program Types
        </button>

        <button
          className="btn btn-outline-secondary btn-lg"
          onClick={() => navigate("/admin/academic-years")}
        >
          📅 Manage Academic Years
        </button>

        <button
          className="btn btn-outline-success btn-lg"
          onClick={() => navigate("/admin/users")}
        >
          👥 Manage Users
        </button>

        <button
          className="btn btn-outline-dark btn-lg"
          onClick={() => navigate("/admin/departments")}
        >
          🏫 Manage Departments
        </button>

        <button
          className="btn btn-outline-info btn-lg"
          onClick={() => navigate("/admin/program-entry-viewe")}
        >
          📋 View Program Entry Form
        </button>

      </div>
    </div>
  );
}

export default AdminDashboard;
