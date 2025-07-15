import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import "./StudentProgramPlanner.css"; // Optional CSS

function ProgramEntryForm() {
  const userDepartmentId = 2; // EEE
  const userRole = "hod"; // or "principal"

  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [programTypes, setProgramTypes] = useState([]);
  const [existingCounts, setExistingCounts] = useState([]);
  const [formData, setFormData] = useState({});
  const [remarks, setRemarks] = useState("");
  const [isEditable, setIsEditable] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Fetch academic years
  useEffect(() => {
    fetch("http://127.0.0.1:8000/academic-years")
      .then((res) => res.json())
      .then((data) => setAcademicYears(data));
  }, []);

  // Fetch program types
  useEffect(() => {
    if (userDepartmentId) {
      fetch("http://127.0.0.1:8000/program-types")
        .then((res) => res.json())
        .then((data) => {
          const filtered = data.filter((p) => {
            return (
              p.departments === "ALL" ||
              p.departments.split(",").map((d) => d.trim()).includes("EEE")
            );
          });
          setProgramTypes(filtered);
        });
    }
  }, [userDepartmentId]);

  // Fetch existing counts
  useEffect(() => {
    if (selectedYearId && userDepartmentId) {
      setLoading(true);
      fetch(
        `http://127.0.0.1:8000/program-counts?department_id=${userDepartmentId}&academic_year_id=${selectedYearId}`
      )
        .then((res) => res.json())
        .then((data) => {
          setExistingCounts(data);
          setIsSubmitted(data.length > 0);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedYearId]);

  // Set editable based on academic year status
  useEffect(() => {
    const selected = academicYears.find((y) => y.id === Number(selectedYearId));
    setIsEditable(selected?.is_enabled ?? false);
  }, [selectedYearId, academicYears]);

  // Build merged form data
  useEffect(() => {
    const merged = {};
    programTypes.forEach((item) => {
      const key = item.program_type + (item.sub_program_type || "");
      const match = existingCounts.find(
        (e) =>
          e.program_type === item.program_type &&
          e.sub_program_type === item.sub_program_type
      );
      merged[key] = {
        count: match?.count || 0,
        total_budget: match?.total_budget || 0,
        remarks: match?.remarks || "",
        budget_mode: item.budget_mode,
        budget_per_event: item.budget_per_event || 0,
        activity_category: item.activity_category,
        program_type: item.program_type,
        sub_program_type: item.sub_program_type,
      };
    });
    setFormData(merged);
  }, [programTypes, existingCounts]);

  const handleChange = (key, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: Number(value),
      },
    }));
  };

  const handleSubmit = async () => {
    const dataToSend = Object.values(formData).map((item) => ({
      department_id: userDepartmentId,
      academic_year_id: Number(selectedYearId),
      program_type: item.program_type,
      sub_program_type: item.sub_program_type,
      activity_category: item.activity_category,
      budget_mode: item.budget_mode,
      count: item.count || 0,
      total_budget:
        item.budget_mode === "Fixed"
          ? (item.count || 0) * (item.budget_per_event || 0)
          : item.total_budget || 0,
      remarks: item.remarks || "",
    }));

    try {
      const res = await fetch("http://127.0.0.1:8000/program-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (!res.ok) throw new Error();
      setSubmitStatus("success");
      setIsSubmitted(true);
      setIsEditable(false);
    } catch {
      setSubmitStatus("error");
    }
  };

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      [
        "Activity Category",
        "Program Type",
        "Sub Type",
        "Count",
        "Budget Per Event ₹",
        "Total Budget ₹",
      ],
    ];

    Object.entries(formData).forEach(([key, item]) => {
      const total =
        item.budget_mode === "Fixed"
          ? item.count * item.budget_per_event
          : item.total_budget;
      wsData.push([
        item.activity_category,
        item.program_type,
        item.sub_program_type || "-",
        item.count,
        item.budget_mode === "Fixed" ? item.budget_per_event : "",
        total,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Programs");
    XLSX.writeFile(wb, `ProgramPlanner_${selectedYearId}_EEE.xlsx`);
  };

  return (
    <div className="container">
      <h4>📋 Program Entry Form</h4>

      <div className="row mb-3">
        <div className="col-md-4">
          <label>Academic Year</label>
          <select
            className="form-select"
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
          >
            <option value="">-- Select --</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.year}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-8">
          <label>Remarks</label>
          <textarea
            className="form-control"
            value={remarks}
            disabled={!isEditable}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div>Loading data...</div>
      ) : (
        <table className="table table-bordered">
          <thead className="table-light">
            <tr>
              <th>Activity Category</th>
              <th>Program Type</th>
              <th>Sub Type</th>
              <th>Count</th>
              <th>Total Budget ₹</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(formData).map(([key, item]) => {
              const total =
                item.budget_mode === "Fixed"
                  ? item.count * item.budget_per_event
                  : item.total_budget;

              return (
                <tr key={key}>
                  <td>{item.activity_category}</td>
                  <td>{item.program_type}</td>
                  <td>{item.sub_program_type || "-"}</td>
                  <td>
                    <input
                      type="number"
                      value={item.count}
                      min={0}
                      className="form-control"
                      onChange={(e) =>
                        handleChange(key, "count", e.target.value)
                      }
                      disabled={!isEditable}
                    />
                  </td>
                  <td>
                    {item.budget_mode === "Fixed" ? (
                      total
                    ) : (
                      <input
                        type="number"
                        value={item.total_budget || ""}
                        className="form-control"
                        onChange={(e) =>
                          handleChange(key, "total_budget", e.target.value)
                        }
                        disabled={!isEditable}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {isEditable && (
        <button className="btn btn-primary" onClick={handleSubmit}>
          Submit
        </button>
      )}

      {isSubmitted && (
        <>
          <button
            className="btn btn-outline-secondary ms-2"
            onClick={() => window.print()}
          >
            🖨️ Print / PDF
          </button>
          <button className="btn btn-outline-success ms-2" onClick={downloadExcel}>
            📥 Download Excel
          </button>
        </>
      )}

      {submitStatus === "success" && (
        <div className="alert alert-success mt-3">Submitted Successfully!</div>
      )}
      {submitStatus === "error" && (
        <div className="alert alert-danger mt-3">Submission Failed!</div>
      )}
    </div>
  );
}

export default ProgramEntryForm;
