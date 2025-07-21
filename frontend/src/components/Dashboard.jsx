// src/components/Dashboard.jsx

import React from 'react';

const Dashboard = ({ role, onGoToProgramEntry }) => {
  return (
    <div className="card p-4">
      <h4>Dashboard ({role})</h4>
      <p>This is your dashboard. You can navigate to Program Entry Form below.</p>
      <button className="btn btn-primary" onClick={onGoToProgramEntry}>
        Go to Program Entry Form
      </button>
    </div>
  );
};

export default Dashboard;
