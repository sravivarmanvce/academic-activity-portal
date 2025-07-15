// src/App.js
import React, { useState, useEffect } from "react";
import ProgramEntryForm from "./ProgramEntryForm";

function App() {
  const userRole = "hod"; // Change to "principal" or "hod"
  const userDepartmentId = 2; // EEE

  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState(userRole === "hod" ? userDepartmentId : null);
  const [academicYearId, setAcademicYearId] = useState(2);
  const [entries, setEntries] = useState([]);

  // Fetch departments (for principal)
  useEffect(() => {
    if (userRole === "principal") {
      fetch("http://127.0.0.1:8000/departments")
        .then((res) => res.json())
        .then((data) => setDepartments(data))
        .catch((err) => console.error("Failed to load departments", err));
    }
  }, [userRole]);

  // Fetch program counts
  useEffect(() => {
    if (academicYearId && departmentId !== null) {
      fetch(`http://127.0.0.1:8000/program-counts?department_id=${departmentId}&academic_year_id=${academicYearId}`)
        .then((res) => res.json())
        .then((data) => setEntries(data))
        .catch((err) => console.error("Error fetching program counts", err));
    }
  }, [departmentId, academicYearId]);

  return (
    <div className="container mt-4">
      {userRole === "hod" && (
        <>
          <ProgramEntryForm />
          <hr />
        </>
      )}

      <h3>Submitted Program Counts</h3>

      {userRole === "principal" && (
        <div className="mb-3">
          <label>Select Department:</label>
          <select
            className="form-select"
            value={departmentId || ""}
            onChange={(e) => setDepartmentId(Number(e.target.value))}
          >
            <option value="">-- Select Department --</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      )}

      <table className="table table-bordered mt-3">
        <thead className="table-dark">
          <tr>
            <th>Program Type</th>
            <th>Sub Type</th>
            <th>Category</th>
            <th>Budget Mode</th>
            <th>Count</th>
            <th>Total Budget</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {entries.length > 0 ? (
            entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.program_type}</td>
                <td>{entry.sub_program_type}</td>
                <td>{entry.activity_category}</td>
                <td>{entry.budget_mode}</td>
                <td>{entry.count}</td>
                <td>{entry.total_budget}</td>
                <td>{entry.remarks}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="text-center">
                No program counts available for this department.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
