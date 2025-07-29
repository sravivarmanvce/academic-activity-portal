import React, { useEffect, useState } from "react";
import API from "../Api";

function ProgramEntrySummary({ userRole }) {
  const [departments, setDepartments] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");

  useEffect(() => {
    API.get("/academic-years")
      .then((res) => {
        setAcademicYears(res.data);
        if (res.data.length > 0) {
          setSelectedAcademicYearId(res.data[0].id);
          setSelectedAcademicYear(res.data[0].year);
        }
      })
      .catch((err) => console.error("Failed to load academic years", err));
  }, []);

  useEffect(() => {
    if (!selectedAcademicYearId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const deptRes = await API.get("/departments");
        setDepartments(deptRes.data);
        // Fetch submission status for each department for selected year
        const statusRes = await API.get(
          `/program-counts/status-summary?academic_year_id=${selectedAcademicYearId}`
        );
        setStatuses(statusRes.data); // { [deptId]: "Submitted" | "Not Submitted" }
        const yearObj = academicYears.find(
          (y) => y.id === selectedAcademicYearId
        );
        setSelectedAcademicYear(yearObj ? yearObj.year : "");
      } catch (err) {
        console.error("Failed to fetch summary data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedAcademicYearId, academicYears]);

  const handleSendReminder = async (deptId) => {
    setSending((prev) => ({ ...prev, [deptId]: true }));
    try {
      // Make sure this is a POST request
      await API.post("/reminder/send", {
        dept_id: deptId,
        academic_year_id: selectedAcademicYearId,
      });
      alert("Reminder sent successfully!");
    } catch (error) {
      console.error("Failed to send reminder:", error);
      alert("Failed to send reminder.");
    } finally {
      setSending((prev) => ({ ...prev, [deptId]: false }));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mt-4">
      <h4>Program Entry Summary</h4>
      <p className="text-muted">
        This page shows the status of program entry submissions for all departments.
        You can send reminder emails to departments that have not submitted.
      </p>
      <div className="mb-3">
        <label>
          <strong>Select Academic Year:</strong>
        </label>
        <select
          className="form-select"
          value={selectedAcademicYearId}
          onChange={(e) => setSelectedAcademicYearId(Number(e.target.value))}
        >
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.year}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-2">
        <strong>Academic Year:</strong> {selectedAcademicYear}
      </div>
      <table className="table table-bordered mt-3">
        <thead>
          <tr>
            <th>Department</th>
            <th>Status</th>
            <th>Grand Total Budget</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id}>
              <td>{dept.name}</td>
              <td>{statuses[dept.id]?.status || "Not Submitted"}</td>
              <td>
                {statuses[dept.id]?.grand_total_budget !== undefined
                  ? `₹${statuses[dept.id].grand_total_budget.toLocaleString()}`
                  : <span className="text-muted">₹0</span>}
              </td>
              <td>
                {statuses[dept.id]?.status !== "Submitted" && (
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => handleSendReminder(dept.id)}
                    disabled={sending[dept.id]}
                  >
                    {sending[dept.id] ? "Sending..." : "Send Reminder"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProgramEntrySummary;
