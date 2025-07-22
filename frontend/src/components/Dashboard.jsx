// src/components/Dashboard.jsx

import React from 'react';

const Dashboard = ({ role, onGoToProgramEntry, onGoToProgramTypeManager }) => {
  return (
    <div className="card p-4">
      <h4>Dashboard ({role})</h4>
      <p>This is your dashboard. You can navigate below:</p>

      <button className="btn btn-primary me-2" onClick={onGoToProgramEntry}>
        Go to Program Entry Form
      </button>

      {(role === "principal" || role === "admin") && (
        <button className="btn btn-secondary mt-2" onClick={onGoToProgramTypeManager}>
          Manage Program Types
        </button>
      )}
    </div>
  );
};

export default Dashboard;