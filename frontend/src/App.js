// frontend/src/App.js

import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./Login";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import ProgramEntryForm from "./components/ProgramEntryForm";
import ManageProgramTypes from "./components/ManageProgramTypes";
import ManageUsers from "./components/ManageUsers";
import ManageAcademicYearsDeadlines from "./components/ManageAcademicYearsDeadlines";
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import API from "./Api";
import ProtectedRoute from "./ProtectedRoute"; 

function App() {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");

  const navigate = useNavigate();

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (user?.role === "principal" || user?.role === "admin") {
      API.get("/departments")
        .then((res) => setDepartments(res.data))
        .catch((err) => console.error("Failed to load departments", err));
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "principal" || user?.role === "admin") {
      API.get("/departments")
        .then((res) => {
          setDepartments(res.data);
        })
        .catch((err) => console.error("Failed to load departments", err));
    }
  }, [user]);

  useEffect(() => {
    API.get("/academic-years")
      .then((res) => {
        setAcademicYears(res.data);
        if (res.data.length > 0) {
          setSelectedAcademicYearId(res.data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load academic years", err));
  }, []);

  const fetchProgramCounts = useCallback((departmentId) => {
    if (!selectedAcademicYearId) return;

    API.get(`/program-counts`, {
      params: {
        department_id: departmentId,
        academic_year_id: selectedAcademicYearId,
      },
    }).catch((err) => {
      if (err.response?.status !== 404)
        console.error("Error fetching program counts", err);
    });

    API.get("/principal-remarks", {
      params: {
        department_id: departmentId,
        academic_year_id: selectedAcademicYearId,
      },
    }).catch(() => { });
  }, [selectedAcademicYearId]);

  useEffect(() => {
    if (user?.role === "hod" && user?.departmentId && selectedAcademicYearId) {
      fetchProgramCounts(user.departmentId);
    }
  }, [user, selectedAcademicYearId, fetchProgramCounts]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  return (
  <div className="container mt-4">
    {!user ? (
      <Routes>
        <Route path="/login" element={<Login onLogin={(u) => setUser(u)} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    ) : (
      <>
        <Header userRole={user.role} onLogout={handleLogout} />

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
              <option key={year.id} value={year.id}>{year.year}</option>
            ))}
          </select>
        </div>

        <Routes key={user.id}>
          <Route path="/" element={<Navigate to="/dashboard" />} />

          <Route path="/dashboard" element={
            <ProtectedRoute user={user}>
              <Dashboard role={user.role} />
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <ManageUsers />
            </ProtectedRoute>
          } />

          <Route path="/admin/manage-academic-years" element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <ManageAcademicYearsDeadlines />
            </ProtectedRoute>
          } />

          <Route path="/bpsaform" element={
            <ProtectedRoute user={user} allowedRoles={["hod", "principal", "admin"]}>
              {/* BPSA logic remains same */}
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
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
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
              {user.role === "admin" && (
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
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  {user.departmentId && selectedAcademicYearId && (
                    <ProgramEntryForm
                      departmentId={user.departmentId}
                      academicYearId={selectedAcademicYearId}
                      userRole="admin"
                    />
                  )}
                </>
              )}
            </ProtectedRoute>
          } />

          <Route path="/manage-types" element={
            <ProtectedRoute user={user} allowedRoles={["principal", "admin"]}>
              <ManageProgramTypes />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </>
    )}
  </div>
);

}

export default App;
