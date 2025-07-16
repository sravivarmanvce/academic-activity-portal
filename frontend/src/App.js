import React, { useState, useEffect } from "react";
import Login from "./Login";
import ProgramEntryForm from "./ProgramEntryForm";

function App() {
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [academicYearId, setAcademicYearId] = useState(2);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const fetchProgramCounts = (departmentId) => {
    fetch(`http://127.0.0.1:8000/program-counts?department_id=${departmentId}&academic_year_id=${academicYearId}`)
      .then((res) =>
        res.status === 404 ? [] : res.json()
      )
      .then((data) => {
        setEntries(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error fetching program counts", err);
        setEntries([]);
      });
  };

  useEffect(() => {
    if (user?.role === "principal") {
      fetch("http://127.0.0.1:8000/departments")
        .then((res) => res.json())
        .then((data) => setDepartments(data))
        .catch((err) => console.error("Failed to load departments", err));
    } else if (user?.role === "hod" && user?.departmentId) {
      fetchProgramCounts(user.departmentId);
    }
  }, [user, academicYearId]);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Welcome, {user.role.toUpperCase()}</h3>
        <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
      </div>

      {user.role === "hod" && (
        <>
          <ProgramEntryForm
            departmentId={user.departmentId}
            academicYearId={academicYearId}
          />
          <hr />
        </>
      )}

      {user.role === "principal" && (
        <>
          <div className="mb-3">
            <label>Select Department:</label>
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

          <h4>Submitted Program Counts</h4>
          <table className="table table-bordered mt-3">
            <thead className="table-dark">
              <tr>
                <th>Activity Category</th>
                <th>Program Type</th>
                <th>Sub Type</th>
                <th>Budget Mode</th>
                <th>Count</th>
                <th>Total Budget</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {entries.length > 0 ? (
                Object.entries(
                  Array.isArray(entries)
                    ? entries.reduce((acc, curr) => {
                        if (!acc[curr.activity_category]) acc[curr.activity_category] = [];
                        acc[curr.activity_category].push(curr);
                        return acc;
                      }, {})
                    : {}
                ).map(([category, items]) =>
                  items.map((item, index) => (
                    <tr key={item.id || index}>
                      {index === 0 && (
                        <td rowSpan={items.length}>{category}</td>
                      )}
                      <td>{item.program_type}</td>
                      <td>{item.sub_program_type || "-"}</td>
                      <td>{item.budget_mode}</td>
                      <td>{item.count}</td>
                      <td>{item.total_budget}</td>
                      <td>{item.remarks}</td>
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td colSpan="7" className="text-center">
                    No program counts available for this department.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default App;
