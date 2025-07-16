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

  const grouped = {};
  entries.forEach((item) => {
    if (!grouped[item.activity_category]) grouped[item.activity_category] = [];
    grouped[item.activity_category].push(item);
  });

  const renderTable = () => {
    let grandCount = 0,
      grandBudget = 0;

    return (
      <>
        <table className="table table-bordered table-striped mt-3">
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
            {Object.entries(grouped).length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center">
                  No entries found.
                </td>
              </tr>
            ) : (
              Object.entries(grouped).map(([category, items]) => {
                let subtotalCount = 0,
                  subtotalBudget = 0;

                return (
                  <React.Fragment key={category}>
                    {items.map((item, idx) => {
                      const budget =
                        item.budget_mode === "Fixed"
                          ? item.count * (item.total_budget / item.count || 0)
                          : item.total_budget;

                      subtotalCount += item.count;
                      subtotalBudget += budget;
                      grandCount += item.count;
                      grandBudget += budget;

                      return (
                        <tr key={item.id || item.program_type + item.sub_program_type}>
                          {idx === 0 && (
                            <td rowSpan={items.length}>{category}</td>
                          )}
                          <td>{item.program_type}</td>
                          <td>{item.sub_program_type || "-"}</td>
                          <td>{item.budget_mode}</td>
                          <td>{item.count}</td>
                          <td>{budget}</td>
                          <td>{item.remarks}</td>
                        </tr>
                      );
                    })}
                    <tr className="table-info fw-bold">
                      <td colSpan="3" className="text-end">
                        Subtotal for {category}
                      </td>
                      <td>{subtotalCount}</td>
                      <td>{subtotalBudget}</td>
                      <td></td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {Object.entries(grouped).length > 0 && (
            <tfoot>
              <tr className="table-warning fw-bold">
                <td colSpan="3" className="text-end">
                  Grand Total
                </td>
                <td>{grandCount}</td>
                <td>{grandBudget}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Principal Remarks Box */}
        <div className="mb-3">
          <label><strong>Principal Remarks:</strong></label>
          <textarea
            className="form-control"
            value={principalRemarks}
            onChange={(e) => setPrincipalRemarks(e.target.value)}
            rows={3}
          />
        </div>
        <button className="btn btn-success" onClick={handleRemarksSave}>
          Save Remarks
        </button>

        {remarksStatus === "success" && (
          <div className="alert alert-success mt-2">✅ Remarks saved.</div>
        )}
        {remarksStatus === "error" && (
          <div className="alert alert-danger mt-2">❌ Failed to save remarks.</div>
        )}
      </>
    );
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
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {user.departmentId && renderTable()}
        </>
      )}
    </div>
  );
}

export default App;
