// src/components/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaClipboardList,
  FaCogs,
  FaUserShield,
  FaUniversity,
  FaChartBar,
  FaFileAlt,
} from "react-icons/fa";
import "./Dashboard.css"; // Optional for styling

const Dashboard = ({ role }) => {
  const navigate = useNavigate();

  return (
    <div className="container mt-4">
      <h4 className="mb-4">Home Dashboard ({role.toUpperCase()})</h4>

      <div className="row g-3">
        {/* 1st row: User Management, Manage Deadlines */}
        {role === "admin" && (
          <>
            <div className="col-sm-6 col-lg-4">
              <div
                className="card text-white bg-dark h-100 shadow dashboard-tile clickable-tile"
                onClick={() => navigate("/admin/users")}
              >
                <div className="card-body text-center">
                  <FaUserShield size={36} className="mb-2" />
                  <h5 className="card-title">User Management</h5>
                  <p className="card-text">Add, Edit, or Delete Users</p>
                  <button className="btn btn-dark mt-2">Manage</button>
                </div>
              </div>
            </div>
            </>
          )}
        {(role === "admin" || role === "principal" || role === "pa_principal") && (
          <>
            <div className="col-sm-6 col-lg-4">
              <div
                className="card text-white bg-warning h-100 shadow dashboard-tile clickable-tile"
                onClick={() => navigate("/admin/manage-academic-years")}
              >
                <div className="card-body text-center">
                  <FaUniversity size={36} className="mb-2" />
                  <h5 className="card-title">Years & Dealines Setup</h5>
                  <p className="card-text">Manage Academic Years and Deadlines</p>
                  <button className="btn btn-dark mt-2">Setup</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 2nd row: Analytics Dashboard, BPSA Entry Form, Status, Program Type Manager */}
        <div className="w-100"></div> {/* Force new row */}
        {["hod", "principal", "admin", "pa_principal"].includes(role) && (
          <div className="col-sm-6 col-lg-4">
            <div
              className="card text-white bg-primary h-100 shadow dashboard-tile clickable-tile"
              onClick={() => navigate("/bpsaform")}
            >
              <div className="card-body text-center">
                <FaClipboardList size={36} className="mb-2" />
                <h5 className="card-title">Budget Proposals for Student Activities</h5>
                <p className="card-text">Submit or Review Student Activity Budgets</p>
                <button className="btn btn-dark mt-2">Go to Form</button>
              </div>
            </div>
          </div>
        )}


        {/* Document Management Tile */}
        <div className="col-sm-6 col-lg-4">
          <div
            className="card text-white bg-gradient-warning h-100 shadow dashboard-tile clickable-tile"
            style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            }}
            onClick={() => navigate("/documents")}
          >
            <div className="card-body text-center">
              <FaFileAlt size={36} className="mb-2" />
              <h5 className="card-title">📄 Document Management</h5>
              <p className="card-text">Upload, organize and manage documents</p>
              <button className="btn btn-dark mt-2">Manage Documents</button>
            </div>
          </div>
        </div>

        {(role === "admin" || role === "principal" || role === "pa_principal") && (
          <div className="col-sm-6 col-lg-4">
            <div
              className="card text-white bg-info h-100 shadow dashboard-tile clickable-tile"
              onClick={() => navigate("/program-entry-summary")}
            >
              <div className="card-body text-center">
                <FaClipboardList size={36} className="mb-2" />
                <h5 className="card-title">Student Activities Entry Status</h5>
                <p className="card-text">View submission status and send reminders</p>
                <button className="btn btn-dark mt-2">View Status</button>
              </div>
            </div>
          </div>
        )}


        {["hod", "principal", "admin"].includes(role) && (
          <div className="col-sm-6 col-lg-4">
            <div
              className="card text-white bg-gradient-primary h-100 shadow dashboard-tile clickable-tile"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              }}
              onClick={() => navigate("/analytics")}
            >
              <div className="card-body text-center">
                <FaChartBar size={36} className="mb-2" />
                <h5 className="card-title">📊 Analytics Dashboard</h5>
                <p className="card-text">Visual insights, charts and performance metrics</p>
                <button className="btn btn-dark mt-2">View Analytics</button>
              </div>
            </div>
          </div>
        )}


        {(role === "principal" || role === "admin" || role === "pa_principal") && (
          <div className="col-sm-6 col-lg-4">
            <div
              className="card text-white bg-success h-100 shadow dashboard-tile clickable-tile"
              onClick={() => navigate("/manage-types")}
            >
              <div className="card-body text-center">
                <FaCogs size={36} className="mb-2" />
                <h5 className="card-title">Program Type Manager</h5>
                <p className="card-text">Manage Program Types and Categories</p>
                <button className="btn btn-dark mt-2">Manage</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;