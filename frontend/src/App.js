// frontend/src/App.js

import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./Login";
import ProgramEntrySummary from "./components/ProgramEntrySummary";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import DocumentManagement from "./components/DocumentManagement";
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
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");

  const navigate = useNavigate();

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // Load academic years and set default selection
  useEffect(() => {
    API.get("/api/academic-years")
      .then((res) => {
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
          <Header userRole={user.role} userName={user.name} onLogout={handleLogout} />

          <Routes key={user.id}>
            <Route index element={<Navigate to="/dashboard" />} />

            <Route path="/dashboard" element={
              <ProtectedRoute user={user}>
                <Dashboard role={user.role} />
              </ProtectedRoute>
            } />

            <Route path="/analytics" element={
              <ProtectedRoute user={user} allowedRoles={["admin", "principal", "hod"]}>
                <AnalyticsDashboard userRole={user.role} />
              </ProtectedRoute>
            } />

            <Route path="/documents" element={
              <ProtectedRoute user={user}>
                <DocumentManagement />
              </ProtectedRoute>
            } />

            <Route path="/admin/users" element={
              <ProtectedRoute user={user} allowedRoles={["admin"]}>
                <ManageUsers />
              </ProtectedRoute>
            } />

            {/* Program Entry Summary for Admin/Principal */}
            <Route path="/program-entry-summary" element={
              <ProtectedRoute user={user} allowedRoles={["admin", "principal"]}>
                <ProgramEntrySummary userRole={user.role} />
              </ProtectedRoute>
            } />

            <Route
              path="/admin/manage-academic-years"
              element={
                <ProtectedRoute user={user} allowedRoles={["admin", "principal"]}>
                  <ManageAcademicYearsDeadlines userRole={user?.role?.toLowerCase()} />
                </ProtectedRoute>
              }
            />

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
                {user.role === "principal" && selectedAcademicYearId && (
                  <ProgramEntryForm
                    academicYearId={selectedAcademicYearId}
                    userRole={user.role}
                  />
                )}
                {user.role === "admin" && selectedAcademicYearId && (
                  <ProgramEntryForm
                    academicYearId={selectedAcademicYearId}
                    userRole="admin"
                  />
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
