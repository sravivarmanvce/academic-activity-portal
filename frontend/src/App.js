// src/App.js

import React, { useState, useEffect } from "react";
import Login from "./Login";
import ProgramEntryForm from "./ProgramEntryForm";
import axios from "axios";

function App() {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [academicYearId, setAcademicYearId] = useState(2);
  const [entries, setEntries] = useState([]);
  const [principalRemarks, setPrincipalRemarks] = useState("");
  const [remarksStatus, setRemarksStatus] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (remarksStatus) {
      const timer = setTimeout(() => {
        setRemarksStatus(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [remarksStatus]);

  useEffect(() => {
    if (user?.role === "principal") {
      axios
        .get("http://127.0.0.1:8000/departments")
        .then((res) => setDepartments(res.data))
        .catch((err) => console.error("Failed to load departments", err));
    }
  }, [user]);

  const fetchProgramCounts = (departmentId) => {
    axios
      .get(
        `http://127.0.0.1:8000/program-counts?department_id=${departmentId}&academic_year_id=${academicYearId}`
      )
      .then((res) => setEntries(res.data))
      .catch((err) => {
        if (err.response?.status === 404) setEntries([]);
        else console.error("Error fetching program counts", err);
      });

    axios
      .get(
        `http://127.0.0.1:8000/principal-remarks?department_id=${departmentId}&academic_year_id=${academicYearId}`
      )
      .then((res) => setPrincipalRemarks(res.data.remarks))
      .catch(() => setPrincipalRemarks(""));
  };

  useEffect(() => {
    if (user?.role === "hod" && user?.departmentId) {
      fetchProgramCounts(user.departmentId);
    }
  }, [user, academicYearId]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const handleRemarksSave = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/principal-remarks", {
        department_id: user.departmentId,
        academic_year_id: academicYearId,
        remarks: principalRemarks,
      });
      setRemarksStatus("success");
    } catch (err) {
      setRemarksStatus("error");
    }
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between mb-3">
        <h3>Welcome, {user.role.toUpperCase()}</h3>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {user.role === "hod" && (
        <>
          <ProgramEntryForm
            departmentId={user.departmentId}
            academicYearId={academicYearId}
            userRole={user.role}
          />
        </>
      )}

      {user.role === "principal" && (
        <>
          <div className="mb-3">
            <label><strong>Select Department:</strong></label>
            <select
              className="form-select"
              value={user.departmentId || ""}
              onChange={(e) => {
                const deptId = Number(e.target.value);
                setUser({ ...user, departmentId: deptId });
                fetchProgramCounts(deptId);
              }}
            >
              <option value="">-- Select Department --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {user.departmentId && (
            <>
              <ProgramEntryForm
                departmentId={user.departmentId}
                academicYearId={academicYearId}
                userRole={user.role}
              />

              {/* Final remarks entry by Principal */}
              <div className="mb-4 mt-4">
                <label><strong>Principal Final Remarks:</strong></label>
                <textarea
                  className="form-control"
                  value={principalRemarks}
                  onChange={(e) => setPrincipalRemarks(e.target.value)}
                  rows={3}
                />
              </div>
              {remarksStatus === "success" && (
                <div className="alert alert-success mt-2">✅ Remarks saved.</div>
              )}
              {remarksStatus === "error" && (
                <div className="alert alert-danger mt-2">❌ Failed to save remarks.</div>
              )}
              <button className="btn btn-success" onClick={handleRemarksSave}>
                Save Remarks
              </button>
              <div style={{ marginBottom: "80px" }}></div> {/* Space at bottom */}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
