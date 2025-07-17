// src/ProgramEntryForm.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ProgramEntryForm.css";

function ProgramEntryForm({ departmentId, academicYearId, userRole }) {
  const [mergedData, setMergedData] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [principalRemarks, setPrincipalRemarks] = useState("");

  useEffect(() => {
    if (!departmentId || !academicYearId) return;

    const fetchData = async () => {
      try {
        const [typesRes, countsRes, deptRes, remarksRes] = await Promise.all([
          axios.get("http://127.0.0.1:8000/program-types"),
          axios
            .get(
              `http://127.0.0.1:8000/program-counts?department_id=${departmentId}&academic_year_id=${academicYearId}`
            )
            .catch((err) => {
              if (err.response?.status === 404) return { data: [] };
              throw err;
            }),
          axios.get("http://127.0.0.1:8000/departments"),
          axios
            .get(
              `http://127.0.0.1:8000/principal-remarks?department_id=${departmentId}&academic_year_id=${academicYearId}`
            )
            .catch(() => ({ data: { remarks: "" } })),
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
            id: match?.id || null,
          };
        });

        const groupedObj = {};
        merged.forEach((item) => {
          if (!groupedObj[item.activity_category]) {
            groupedObj[item.activity_category] = [];
          }
          groupedObj[item.activity_category].push(item);
        });

        setMergedData(merged);
        setGrouped(groupedObj);
        setPrincipalRemarks(remarksRes.data.remarks || "");
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
        [field]: field === "count" || field === "total_budget" ? Number(value) : value,
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
        remarks: entry.remarks || "",
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

  const renderInput = (index, field, value, editable, type = "number") => {
    return editable ? (
      <input
        type={type}
        min="0"
        className="form-control"
        value={value}
        onChange={(e) => handleChange(index, field, e.target.value)}
      />
    ) : (
      <span>{value}</span>
    );
  };

  const grandTotal = { count: 0, budget: 0 };

  return (
    <div className="container mt-4">
      <h4>Program Entry Form ({userRole.toUpperCase()})</h4>

      <table className="table table-bordered table-striped">
        <thead className="table-dark">
          <tr>
            <th>Activity Category</th>
            <th>Program Type</th>
            <th>Sub Type</th>
            <th>Budget / Event</th>
            <th>Count</th>
            <th>Total Budget</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center">
                No program types found for your department.
              </td>
            </tr>
          ) : (
            Object.entries(grouped).map(([category, items]) => {
              const subtotal = { count: 0, budget: 0 };

              return (
                <React.Fragment key={category}>
                  {items.map((item, idx) => {
                    const globalIndex = mergedData.findIndex(
                      (d) =>
                        d.program_type === item.program_type &&
                        d.sub_program_type === item.sub_program_type
                    );

                    const count = mergedData[globalIndex].count || 0;
                    const budget =
                      item.budget_mode === "Fixed"
                        ? count * (item.budget_per_event || 0)
                        : mergedData[globalIndex].total_budget || 0;

                    subtotal.count += count;
                    subtotal.budget += budget;
                    grandTotal.count += count;
                    grandTotal.budget += budget;

                    return (
                      <tr key={item.program_type + (item.sub_program_type || "")}>
                        {idx === 0 && (
                          <td rowSpan={items.length}>{category}</td>
                        )}
                        <td>{item.program_type}</td>
                        <td>{item.sub_program_type || "-"}</td>
                        <td>{item.budget_per_event || "-"}</td>
                        <td>
                          {renderInput(
                            globalIndex,
                            "count",
                            mergedData[globalIndex].count,
                            userRole === "hod"
                          )}
                        </td>
                        <td>
                          {item.budget_mode === "Fixed" ? (
                            budget
                          ) : (
                            renderInput(
                              globalIndex,
                              "total_budget",
                              mergedData[globalIndex].total_budget,
                              userRole === "hod"
                            )
                          )}
                        </td>
                        <td>
                          {renderInput(
                            globalIndex,
                            "remarks",
                            mergedData[globalIndex].remarks,
                            userRole === "hod",
                            "text"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="table-info fw-bold">
                    <td colSpan="4" className="text-end">
                      Subtotal for {category}
                    </td>
                    <td>{subtotal.count}</td>
                    <td>{subtotal.budget}</td>
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
              <td colSpan="4" className="text-end">Grand Total</td>
              <td>{grandTotal.count}</td>
              <td>{grandTotal.budget}</td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Submit for HoD */}
      {userRole === "hod" && (
        <div className="text-center">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Program Counts"}
          </button>
        </div>
      )}

      {status === "success" && (
        <div className="alert alert-success mt-3 text-center">
          ✅ Submission successful!
        </div>
      )}
      {status === "error" && (
        <div className="alert alert-danger mt-3 text-center">
          ❌ Submission failed.
        </div>
      )}

        {userRole === "hod" && (
        <div style={{ marginBottom: "80px" }}></div>
        )}

        {/* Principal Remarks (readonly for HoD) */}
        {userRole === "hod" && principalRemarks && (
          <div className="mt-4">
          <label><strong>Principal Final Remarks:</strong></label>
          <div className="form-control bg-light">{principalRemarks}</div>
          </div>
        )}
    </div>
  );
}

export default ProgramEntryForm;
