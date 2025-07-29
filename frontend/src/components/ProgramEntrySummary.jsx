import React, { useEffect, useState } from "react";
import API from "../Api";
import { exportSummaryToExcel } from "../utils/exportSummaryToExcel";
import { exportSummaryToPDF } from "../utils/exportSummaryToPDF";

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

  const handleExportExcel = async () => {
    try {
      await exportSummaryToExcel(departments, statuses, selectedAcademicYear);
    } catch (error) {
      console.error("Failed to export Excel:", error);
      alert("Failed to export Excel file.");
    }
  };

  const handleExportPDF = () => {
    try {
      exportSummaryToPDF(departments, statuses, selectedAcademicYear);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("Failed to export PDF file.");
    }
  };

  // Calculate total budget
  const totalBudget = departments.reduce((total, dept) => {
    return total + (statuses[dept.id]?.grand_total_budget || 0);
  }, 0);

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
      
      <div className="d-flex justify-content-end mb-3">
        <button 
          className="btn btn-outline-danger me-2" 
          onClick={handleExportPDF}
          disabled={departments.length === 0}
        >
          Export PDF
        </button>
        <button 
          className="btn btn-outline-success" 
          onClick={handleExportExcel}
          disabled={departments.length === 0}
        >
          Export Excel
        </button>
      </div>
      <table className="table table-bordered mt-3">
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>Sl. No</th>
            <th>Department</th>
            <th style={{ textAlign: "center" }}>Budget Proposed</th>
            <th style={{ textAlign: "center" }}>Status</th>
            <th style={{ textAlign: "center" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept, index) => (
            <tr key={dept.id}>
              <td style={{ textAlign: "center" }}>{index + 1}</td>
              <td>{dept.full_name}</td>
              <td style={{ textAlign: "right" }}>
                {statuses[dept.id]?.grand_total_budget !== undefined
                  ? `₹${statuses[dept.id].grand_total_budget.toLocaleString()}`
                  : <span className="text-muted">₹0</span>}
              </td>
              <td style={{ textAlign: "center" }}>{statuses[dept.id]?.status || "Not Submitted"}</td>
              <td style={{ textAlign: "center" }}>
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
          {/* Total Row */}
          <tr className="table-warning fw-bold">
            <td></td>
            <td style={{ textAlign: "right" }}>Total Budget</td>
            <td style={{ textAlign: "right" }}>₹{totalBudget.toLocaleString()}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div className="my-5"></div>
      <div className="my-5"></div>
    </div>
  );
}

export default ProgramEntrySummary;
