// src/components/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaClipboardList, FaCogs } from "react-icons/fa";
import "./Dashboard.css"; // Optional for tile styling

const Dashboard = ({ role }) => {
  const isPrincipal = role === "principal";
  const navigate = useNavigate();

  return (
    <div className="container mt-4">
      <h4 className="mb-4">Dashboard ({role.toUpperCase()})</h4>

      <div className="row g-4">
        {/* Program Entry Form Tile */}
        <div className="col-sm-6 col-lg-4">
          <div
            className="card text-white bg-primary h-100 shadow dashboard-tile clickable-tile"
            onClick={() => navigate("/bpsaform")}
          >
            <div className="card-body text-center">
              <FaClipboardList size={36} className="mb-2" />
              <h5 className="card-title">Budget Proposals for Student Activities</h5>
              <p className="card-text">Submit or Review Student Activity Budgets</p>
              <button className="btn btn-light mt-2">Go to Form</button>
            </div>
          </div>
        </div>

        {/* Program Type Manager Tile (Principal only) */}
        {isPrincipal && (
          <div className="col-sm-6 col-lg-4">
            <div
              className="card text-white bg-success h-100 shadow dashboard-tile clickable-tile"
              onClick={() => navigate("/manage-types")}
            >
              <div className="card-body text-center">
                <FaCogs size={36} className="mb-2" />
                <h5 className="card-title">Student Activities Program Type Manager</h5>
                <p className="card-text">Manage Program Types, Categories and Access</p>
                <button className="btn btn-light mt-2">Manage</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
