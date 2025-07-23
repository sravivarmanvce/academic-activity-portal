// src/components/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaClipboardList,
  FaCogs,
  FaUserShield,
  FaUniversity,
} from "react-icons/fa";
import "./Dashboard.css"; // Optional for styling

const Dashboard = ({ role }) => {
  const navigate = useNavigate();

  return (
    <div className="container mt-4">
      <h4 className="mb-4">Dashboard ({role.toUpperCase()})</h4>

      <div className="row g-3">

        {/* Program Entry Form - For all roles */}
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

        {/* Program Type Manager - Principal and Admin */}
        {(role === "principal" || role === "admin") && (
          <div className="col-sm-6 col-lg-4">
            <div
              className="card text-white bg-success h-100 shadow dashboard-tile clickable-tile"
              onClick={() => navigate("/manage-types")}
            >
              <div className="card-body text-center">
                <FaCogs size={36} className="mb-2" />
                <h5 className="card-title">Program Type Manager</h5>
                <p className="card-text">Manage Program Types and Categories</p>
                <button className="btn btn-light mt-2">Manage</button>
              </div>
            </div>
          </div>
        )}

        {/* Admin-only */}
        {role === "admin" && (
          <>
            {/* Future Admin: Academic Year Management */}
            <div className="col-sm-6 col-lg-4">
              <div
                className="card text-white bg-warning h-100 shadow dashboard-tile clickable-tile"
                onClick={() => navigate("/admin/academic-years")}
              >
                <div className="card-body text-center">
                  <FaUniversity size={36} className="mb-2" />
                  <h5 className="card-title">Academic Year Setup</h5>
                  <p className="card-text">Manage Academic Years and Deadlines</p>
                  <button className="btn btn-light mt-2">Setup</button>
                </div>
              </div>
            </div>

            {/* Future Admin: User Management */}
            <div className="col-sm-6 col-lg-4">
              <div
                className="card text-white bg-dark h-100 shadow dashboard-tile clickable-tile"
                onClick={() => navigate("/admin/users")}
              >
                <div className="card-body text-center">
                  <FaUserShield size={36} className="mb-2" />
                  <h5 className="card-title">User Management</h5>
                  <p className="card-text">Add, Edit, or Delete Users</p>
                  <button className="btn btn-light mt-2">Manage</button>
                </div>
              </div>
            </div>


          </>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
