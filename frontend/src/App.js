import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./Login";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import ProgramEntryForm from "./components/ProgramEntryForm";
import ProgramTypeManager from "./components/ProgramTypeManager";
import API from "./Api";
// Future admin pages
// import UserManagement from "./components/UserManagement";
// import AcademicYearSetup from "./components/AcademicYearSetup";

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
    if (user?.role === "principal") {
      API.get("/departments")
        .then((res) => setDepartments(res.data))
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
    })
      .catch((err) => {
        if (err.response?.status !== 404)
          console.error("Error fetching program counts", err);
      });

    API.get("/principal-remarks", {
      params: {
        department_id: departmentId,
        academic_year_id: selectedAcademicYearId,
      },
    })
      .catch(() => { });
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

  if (!user) {
    return <Login onLogin={(u) => { setUser(u); navigate("/"); }} />;
  }

  return (
    <div className="container mt-4">
      <Header
        userRole={user.role}
        onLogout={handleLogout}
      />

      {/* Academic Year Dropdown - visible globally */}
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

      <Routes>
        <Route path="/" element={<Dashboard role={user.role} />} />

        <Route path="/bpsaform" element={
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
          </>
        } />

        <Route path="/manage-types" element={
          user.role === "principal" && <ProgramTypeManager />
        } />

        {/* Future routes for Admin */}
        {/* 
        <Route path="/manage-users" element={
          user.role === "admin" && <UserManagement />
        } />

        <Route path="/academic-years" element={
          user.role === "admin" && <AcademicYearSetup />
        } />
        */}

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
