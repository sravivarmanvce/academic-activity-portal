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
  const [grouped, setGrouped] = useState({});
  const [principalRemark, setPrincipalRemark] = useState("");
  const [remarkSaved, setRemarkSaved] = useState(false);

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

  const fetchProgramCounts = async (departmentId) => {
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/program-counts?department_id=${departmentId}&academic_year_id=${academicYearId}`
      );
      setEntries(res.data);

      // Grouping logic for principal view
      const groupedData = {};
      res.data.forEach((item) => {
        if (!groupedData[item.activity_category]) {
          groupedData[item.activity_category] = [];
        }
        groupedData[item.activity_category].push(item);
      });
      setGrouped(groupedData);
    } catch {
      setEntries([]);
      setGrouped({});
    }
  };

  const fetchPrincipalRemark = async (departmentId) => {
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/principal-remarks?department_id=${departmentId}&academic_year_id=${academicYearId}`
      );
      setPrincipalRemark(res.data.remarks || "");
    } catch {
      setPrincipalRemark("");
    }
  };

  const handleSaveRemark = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/principal-remarks", {
        department_id: user.departmentId,
        academic_year_id: academicYearId,
        remarks: principalRemark,
      });
      setRemarkSaved(true);
      setTimeout(() => setRemarkSaved(false), 2000);
    } catch {
      alert("Failed to save remarks");
    }
  };

  useEffect(() => {
    if (user?.role === "principal") {
      axios
        .get("http://127.0.0.1:8000/departments")
        .then((res) => setDepartments(res.data))
        .catch((err) => console.error("Failed to load departments", err));
    } else if (user?.role === "hod" && user?.departmentId) {
      fetchProgramCounts(user.departmentId);
    }
  }, [user, academicYearId]);

  useEffect(() => {
    if (user?.role === "principal" && user?.departmentId) {
      fetchProgramCounts(user.departmentId);
      fetchPrincipalRemark(user.departmentId);
    }
  }, [user?.departmentId]);

  const calculateTotals = () => {
    let totalCount = 0;
    let totalBudget = 0;
    entries.forEach((item) => {
      totalCount += item.count || 0;
      totalBudget += item.total_budget || 0;
    });
    return { totalCount, totalBudget };
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
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

          <h4>Submitted Program Counts</h4>
          <table className="table table-bordered table-striped">
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
                    No data available.
                  </td>
                </tr>
              ) : (
                Object.entries(grouped).map(([category, items]) => {
                  const subtotalCount = items.reduce(
                    (sum, i) => sum + (i.count || 0),
                    0
                  );
                  const subtotalBudget = items.reduce(
                    (sum, i) => sum + (i.total_budget || 0),
                    0
                  );
                  return (
                    <React.Fragment key={category}>
                      {items.map((item, idx) => (
                        <tr key={item.id || idx}>
                          {idx === 0 && (
                            <td rowSpan={items.length}>{category}</td>
                          )}
                          <td>{item.program_type}</td>
                          <td>{item.sub_program_type || "-"}</td>
                          <td>{item.budget_mode}</td>
                          <td>{item.count}</td>
                          <td>{item.total_budget}</td>
                          <td>{item.remarks}</td>
                        </tr>
                      ))}
                      <tr className="table-secondary fw-bold">
                        <td colSpan="4" className="text-end">
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
              {entries.length > 0 && (
                <tr className="table-dark fw-bold">
                  <td colSpan="4" className="text-end">
                    Grand Total
                  </td>
                  <td>{calculateTotals().totalCount}</td>
                  <td>{calculateTotals().totalBudget}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>

          {user.departmentId && (
            <div className="mt-4">
              <label>Principal's Remarks:</label>
              <textarea
                className="form-control"
                value={principalRemark}
                onChange={(e) => setPrincipalRemark(e.target.value)}
              />
              <button
                className="btn btn-success mt-2"
                onClick={handleSaveRemark}
              >
                Save Remarks
              </button>
              {remarkSaved && (
                <div className="text-success mt-2">✅ Remarks saved.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
