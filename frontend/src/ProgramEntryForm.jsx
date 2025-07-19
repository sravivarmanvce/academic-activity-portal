// SAME IMPORTS
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./ProgramEntryForm.css";

function ProgramEntryForm({ departmentId, academicYearId, userRole }) {
  const [mergedData, setMergedData] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [principalRemarks, setPrincipalRemarks] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  const [hodRemarks, setHodRemarks] = useState("");
  const [hodRemarksSaved, setHodRemarksSaved] = useState(false);

  const [isEditable, setIsEditable] = useState(userRole === "hod");

  const printRef = useRef();

  useEffect(() => {
    if (!departmentId || !academicYearId) return;

    const fetchData = async () => {
      try {
        const [typesRes, countsRes, deptRes, principalRes, hodRes] = await Promise.all([
          axios.get("http://127.0.0.1:8000/program-types"),
          axios.get(`http://127.0.0.1:8000/program-counts?department_id=${departmentId}&academic_year_id=${academicYearId}`)
            .catch((err) => {
              if (err.response?.status === 404) return { data: [] };
              throw err;
            }),
          axios.get("http://127.0.0.1:8000/departments"),
          axios.get(`http://127.0.0.1:8000/principal-remarks?department_id=${departmentId}&academic_year_id=${academicYearId}`)
            .catch(() => ({ data: { remarks: "" } })),
          axios.get(`http://127.0.0.1:8000/hod-remarks?department_id=${departmentId}&academic_year_id=${academicYearId}`)
            .catch(() => ({ data: { remarks: "" } })),
        ]);

        const department = deptRes.data.find((d) => d.id === departmentId)?.name;
        setDepartmentName(department || "");
        setPrincipalRemarks(principalRes.data.remarks || "");
        setHodRemarks(hodRes.data.remarks || "");

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

    const invalidRows = mergedData.filter(
      (entry) =>
        entry.budget_mode === "Variable" &&
        ((entry.count > 0 && entry.total_budget <= 0) ||
          (entry.count <= 0 && entry.total_budget > 0))
    );

    if (invalidRows.length > 0) {
      const errors = invalidRows.map((entry) => {
        return `${entry.program_type}${entry.sub_program_type ? ' - ' + entry.sub_program_type : ''}`;
      });
      setValidationErrors(errors);
      setShowValidationModal(true);
      setSubmitting(false);
      return;
    }

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

      if (userRole === "hod") {
        await axios.post("http://127.0.0.1:8000/hod-remarks", {
          department_id: departmentId,
          academic_year_id: academicYearId,
          remarks: hodRemarks,
        });
        setHodRemarksSaved(true);
        setTimeout(() => setHodRemarksSaved(false), 2500);
      }

      if (userRole === "principal") {
        await axios.post("http://127.0.0.1:8000/principal-remarks", {
          department_id: departmentId,
          academic_year_id: academicYearId,
          remarks: principalRemarks,
        });
      }

      setIsEditable(false);
      setStatus("success");
    } catch (error) {
      console.error("Submission failed", error);
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const options = {
      margin: 0.5,
      filename: "program_entry.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(options).from(printRef.current).save();
  };

  const handleDownloadExcel = () => {
    const table = printRef.current.querySelector("table");
    const wb = XLSX.utils.table_to_book(table, { sheet: "Program Data" });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "program_entry.xlsx");
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
      <div className="d-flex justify-content-between align-items-center">
        <h4>Program Entry Form ({departmentName})</h4>
        <div>
          <button className="btn btn-outline-danger me-2" onClick={handleDownloadPDF}>
            Download PDF
          </button>
          <button className="btn btn-outline-success" onClick={handleDownloadExcel}>
            Download Excel
          </button>
        </div>
      </div>

      <div ref={printRef}>
        <h5 className="text-center mt-3">Department: {departmentName}</h5>

        <table className="table table-bordered table-striped mt-3">
          <thead className="table-dark">
            <tr>
              <th>Activity Category</th>
              <th>Program Type</th>
              <th>Sub Type</th>
              <th>Budget / Event</th>
              <th>Count</th>
              <th>Total Budget</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">
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

                      const isVariableAndPrincipal = userRole === "principal" && item.budget_mode === "Variable";

                      return (
                        <tr key={item.program_type + (item.sub_program_type || "")}>
                          {idx === 0 && <td rowSpan={items.length}>{category}</td>}
                          <td>{item.program_type}</td>
                          <td>{item.sub_program_type || "-"}</td>
                          <td>{item.budget_per_event || "-"}</td>
                          <td>
                            {renderInput(
                              globalIndex,
                              "count",
                              mergedData[globalIndex].count,
                              userRole === "hod" && isEditable
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
                                isEditable && (userRole === "hod" || isVariableAndPrincipal)
                              )
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
              </tr>
            </tfoot>
          )}
        </table>

        {/* HoD Final Remarks */}
        <div className="mt-4">
          <label><strong>HoD Final Remarks:</strong></label>
          {userRole === "hod" ? (
            <textarea
              rows={4}
              className="form-control"
              value={hodRemarks}
              onChange={(e) => setHodRemarks(e.target.value)}
              readOnly={!isEditable}
            />
          ) : (
            <div className="form-control bg-light">{hodRemarks}</div>
          )}
        </div>

        {/* Principal Final Remarks */}
        <div className="mt-4">
          <label><strong>Principal Final Remarks:</strong></label>
          {userRole === "principal" ? (
            <textarea
              rows={4}
              className="form-control"
              value={principalRemarks}
              onChange={(e) => setPrincipalRemarks(e.target.value)}
              readOnly={!isEditable}
            />
          ) : (
            <div className="form-control bg-light">{principalRemarks}</div>
          )}
        </div>

        {/* Edit / Save Button */}
        <div className="text-center mt-4">
          <button
            className={`btn ${isEditable ? "btn-primary" : "btn-warning"}`}
            onClick={isEditable ? handleSubmit : () => setIsEditable(true)}
          >
            {isEditable ? "Save" : "Edit"}
          </button>
        </div>

        {/* Signature Area */}
        <div className="row mt-5 text-center">
          <div className="col">
            <p><strong>HoD, {departmentName}</strong></p>
          </div>
          <div className="col">
            <p><strong>Principal</strong></p>
          </div>
        </div>
      </div>

      {/* Submission Status */}
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

      {/* Validation Modal */}
      {showValidationModal && (
        <>
          <div className="custom-modal-backdrop"></div>
          <div className="custom-modal-container bg-white border rounded shadow">
            <div className="modal-header border-bottom">
              <h5 className="modal-title text-danger">Validation Error</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowValidationModal(false)}
              ></button>
            </div>
            <div className="modal-body text-center">
              <p className="mb-3">
                The following entries have inconsistent <br />
                <strong>Count / Budget</strong>:
              </p>
              <ul className="text-start">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>
                    <strong>{err}</strong>
                  </li>
                ))}
              </ul>
              <p className="text-muted mt-3">
                Both <span className="text-primary">Count</span> and{" "}
                <span className="text-danger">Total Budget</span> must be either non-zero or both zero.
              </p>
            </div>
            <div className="modal-footer border-top text-end">
              <button
                className="btn btn-secondary"
                onClick={() => setShowValidationModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProgramEntryForm;
