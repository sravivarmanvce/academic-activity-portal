// src/ProgramEntryForm.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ProgramEntryForm.css";

function ProgramEntryForm({ departmentId = 1, academicYearId = 2 }) {
  const [programTypes, setProgramTypes] = useState([]);
  const [mergedData, setMergedData] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!departmentId || !academicYearId) return;

    const fetchData = async () => {
      try {
        const [typesRes, countsRes, deptRes] = await Promise.all([
          axios.get("http://127.0.0.1:8000/program-types"),
          axios
            .get(`http://127.0.0.1:8000/program-counts?department_id=${departmentId}&academic_year_id=${academicYearId}`)
            .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err))),
          axios.get("http://127.0.0.1:8000/departments")
        ]);

        const department = deptRes.data.find((d) => d.id === departmentId)?.name;

        const filteredTypes = typesRes.data.filter(
          (p) =>
            p.departments === "ALL" ||
            p.departments.split(",").map((d) => d.trim()).includes(department)
        );

        const merged = filteredTypes.map((type) => {
          const match = countsRes.data.find(
            (c) =>
              c.program_type === type.program_type &&
              c.sub_program_type === type.sub_program_type
          );
          return {
            ...type,
            count: match?.count ?? 0,
            total_budget: match?.total_budget ?? 0,
            remarks: match?.remarks ?? "",
            id: match?.id || null
          };
        });

        setProgramTypes(filteredTypes);
        setMergedData(merged);

        const groupedObj = {};
        merged.forEach((item) => {
          if (!groupedObj[item.activity_category]) {
            groupedObj[item.activity_category] = [];
          }
          groupedObj[item.activity_category].push(item);
        });
        setGrouped(groupedObj);
      } catch (error) {
        console.error("Error loading program data", error);
      }
    };

    fetchData();
  }, [departmentId, academicYearId]);

  const handleChange = (index, field, value) => {
    setMergedData((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "count" || field === "total_budget" ? Number(value) : value
      };
      return updated;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatus(null);

    try {
      const payload = mergedData.map((entry) => ({
        department_id: departmentId,
        academic_year_id: academicYearId,
        program_type: entry.program_type,
        sub_program_type: entry.sub_program_type,
        activity_category: entry.activity_category,
        budget_mode: entry.budget_mode,
        count: entry.count || 0,
        total_budget:
          entry.budget_mode === "Fixed"
            ? (entry.count || 0) * (entry.budget_per_event || 0)
            : entry.total_budget || 0,
        remarks: entry.remarks || ""
      }));

      await axios.post("http://127.0.0.1:8000/program-counts", { entries: payload });

      setStatus("success");
    } catch (error) {
      console.error("Submission failed", error);
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mt-4">
      <h3>Program Entry Form (HoD)</h3>
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
              <td colSpan="7" className="text-center">No program types found for your department.</td>
            </tr>
          ) : (
            Object.entries(grouped).map(([category, items]) =>
              items.map((item, idx) => {
                const globalIndex = mergedData.findIndex(
                  (d) => d.program_type === item.program_type && d.sub_program_type === item.sub_program_type
                );
                return (
                  <tr key={item.program_type + (item.sub_program_type || "")}>
                    {idx === 0 && <td rowSpan={items.length}>{category}</td>}
                    <td>{item.program_type}</td>
                    <td>{item.sub_program_type || "-"}</td>
                    <td>{item.budget_mode}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={mergedData[globalIndex].count}
                        onChange={(e) => handleChange(globalIndex, "count", e.target.value)}
                      />
                    </td>
                    <td>
                      {item.budget_mode === "Fixed" ? (
                        (mergedData[globalIndex].count || 0) * (item.budget_per_event || 0)
                      ) : (
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          value={mergedData[globalIndex].total_budget}
                          onChange={(e) => handleChange(globalIndex, "total_budget", e.target.value)}
                        />
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        value={mergedData[globalIndex].remarks}
                        onChange={(e) => handleChange(globalIndex, "remarks", e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })
            )
          )}
        </tbody>
      </table>

      <div className="text-center">
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Program Counts"}
        </button>
      </div>

      {status === "success" && <div className="alert alert-success mt-3 text-center">✅ Submission successful!</div>}
      {status === "error" && <div className="alert alert-danger mt-3 text-center">❌ Submission failed.</div>}
    </div>
  );
}

export default ProgramEntryForm;
