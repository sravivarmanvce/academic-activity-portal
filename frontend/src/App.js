// src/App.js

import React, { useState, useEffect, useCallback } from "react";
import Login from "./Login";
import Dashboard from './components/Dashboard';
import ProgramEntryForm from "./components/ProgramEntryForm";
import ProgramTypeManager from './components/ProgramTypeManager';
import axios from "axios";

function App() {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [page, setPage] = useState("dashboard");  // <--- NEW: Track page

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // Load departments (only for Principal)
  useEffect(() => {
    if (user?.role === "principal") {
      axios
        .get("http://127.0.0.1:8000/departments")
        .then((res) => setDepartments(res.data))
        .catch((err) => console.error("Failed to load departments", err));
    }
  }, [user]);

  // Load academic years
  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/academic-years")
      .then((res) => {
        setAcademicYears(res.data);
        if (res.data.length > 0) {
          setSelectedAcademicYearId(res.data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load academic years", err));
  }, []);

  const fetchProgramCounts = useCallback(
    (departmentId) => {
      if (!selectedAcademicYearId) return;
      axios
        .get(`http://127.0.0.1:8000/program-counts?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
        .catch((err) => {
          if (err.response?.status !== 404)
            console.error("Error fetching program counts", err);
        });

      axios
        .get(`http://127.0.0.1:8000/principal-remarks?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
        .catch(() => {});
    },
    [selectedAcademicYearId]
  );

  useEffect(() => {
    if (user?.role === "hod" && user?.departmentId && selectedAcademicYearId) {
      fetchProgramCounts(user.departmentId);
    }
  }, [user, selectedAcademicYearId, fetchProgramCounts]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setPage("dashboard");
  };

  if (!user) return <Login onLogin={(u) => { setUser(u); setPage("dashboard"); }} />;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between mb-3">
        <h3>Welcome, {user.role.toUpperCase()}</h3>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Academic Year Dropdown */}
      <div className="mb-3">
        <label><strong>Select Academic Year:</strong></label>
        <select
          className="form-select"
          value={selectedAcademicYearId}
          onChange={(e) => {
            setSelectedAcademicYearId(Number(e.target.value));
            if (user?.departmentId) {
              fetchProgramCounts(user.departmentId);
            }
          }}
        >
          <option value="">-- Select Academic Year --</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.year}
            </option>
          ))}
        </select>
      </div>

      {/* Switch between Dashboard and ProgramEntryForm */}
      {page === "dashboard" && (
        <Dashboard
          role={user.role}
          onGoToProgramEntry={() => setPage("form")}
        />
      )}

      {page === "form" && (
        <>
          {user.role === "hod" && selectedAcademicYearId && (
            <ProgramEntryForm
              departmentId={user.departmentId}
              academicYearId={selectedAcademicYearId}
              userRole={user.role}
            />
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

              {user.departmentId && selectedAcademicYearId && (
                <ProgramEntryForm
                  departmentId={user.departmentId}
                  academicYearId={selectedAcademicYearId}
                  userRole={user.role}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
