import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
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
  const [departmentFullName, setDepartmentFullName] = useState("");
  const [hodRemarks, setHodRemarks] = useState("");
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [deadlineDisplay, setDeadlineDisplay] = useState("Invalid Date");
  const [isEditable, setIsEditable] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");

  const printRef = useRef();

  useEffect(() => {
    if (!departmentId || !academicYearId) return;

    const fetchAll = async () => {
      try {
        const [
          typesRes,
          countsRes,
          deptRes,
          principalRes,
          hodRes,
          yearsRes
        ] = await Promise.all([
          axios.get("http://127.0.0.1:8000/program-types"),
          axios.get(`http://127.0.0.1:8000/program-counts?department_id=${departmentId}&academic_year_id=${academicYearId}`)
            .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err))),
          axios.get("http://127.0.0.1:8000/departments"),
          axios.get(`http://127.0.0.1:8000/principal-remarks?department_id=${departmentId}&academic_year_id=${academicYearId}`)
            .catch(() => ({ data: { remarks: "" } })),
          axios.get(`http://127.0.0.1:8000/hod-remarks?department_id=${departmentId}&academic_year_id=${academicYearId}`)
            .catch(() => ({ data: { remarks: "" } })),
          axios.get("http://127.0.0.1:8000/academic-years")
        ]);

const departmentObj = deptRes.data.find((d) => d.id === departmentId);
if (departmentObj) {
  setDepartmentName(departmentObj.name || "");         // short name
  setDepartmentFullName(departmentObj.full_name || ""); // full name
}
        setPrincipalRemarks(principalRes.data.remarks || "");
        setHodRemarks(hodRes.data.remarks || "");

        const filteredTypes = typesRes.data.filter(
          (p) =>
            p.departments === "ALL" ||
            p.departments.split(",").map((d) => d.trim()).includes(departmentObj.name)
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

        // Deadline logic
        const yearObj = yearsRes.data.find((y) => y.id === academicYearId);
        if (yearObj) {
          const deadline = new Date(yearObj.deadline);
          const today = new Date();
          const isBeforeDeadline = today <= deadline;

          setDeadlineDisplay(
            deadline instanceof Date && !isNaN(deadline)
              ? deadline.toLocaleDateString("en-GB")
              : "Invalid Date"
          );

          setSelectedAcademicYear(yearObj.year);

          if (userRole === "principal") {
            setIsEditable(true); // Principal can always edit
          } else if (userRole === "hod") {
            setIsEditable(yearObj.is_enabled && isBeforeDeadline);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchAll();
  }, [departmentId, academicYearId, userRole]);

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
      const errors = invalidRows.map((entry) =>
        `${entry.program_type}${entry.sub_program_type ? ' - ' + entry.sub_program_type : ''}`
      );
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
      }

      if (userRole === "principal") {
        await axios.post("http://127.0.0.1:8000/principal-remarks", {
          department_id: departmentId,
          academic_year_id: academicYearId,
          remarks: principalRemarks,
        });
      }

      setStatus("success");
    } catch (error) {
      console.error("Submission failed", error);
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=600");

    printWindow.document.write(`
    <html>
      <head>
        <title>Program Entry PDF</title>
        <style>
          body {
            font-family: 'Aptos', 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            margin: 15px;
            padding: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 11pt;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px;
            word-wrap: break-word;
          }

          td input[type="number"] {
            width: 80px;           /* or 60px if tighter */
            text-align: center;
            font-size: 11pt;
            padding: 4px;
            box-sizing: border-box;
          }

          input[type="number"] {
            border: none;
            outline: none;
            background-color: transparent;
            width: 70px;
            text-align: center;
            font-size: 11pt;
          }

          th {
            background-color: #f2f2f2;
            font-size: 12pt;
            font-weight: bold;
            text-align: center;
          }

          tr.table-warning td {
            font-weight: bold;
            background-color: #fff3cd; /* Light yellow like Bootstrap */
          }

          tr.table-info td {
            font-weight: bold;
            background-color: #d1ecf1; /* Light blue like Bootstrap */
          }

          /* Chrome, Safari, Edge, Opera */
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          /* Firefox */
          input[type="number"] {
            -moz-appearance: textfield;
          }

          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .logo {
            display: block;
            margin: 0 auto 10px;
            max-height: 100px;
          }
          .remarks {
            white-space: pre-wrap;
            text-align: left;
            margin-top: 10px;
            border: 1px solid #ccc;
            padding: 10px;
            font-size: 11pt;
          }
          .no-print {
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="assets/logo.png" alt="College Logo" class="logo" />
          <div>
            <strong>Department of ${departmentFullName} - Budget Proposals for Student Activities</strong><br/>
            Academic Year: ${selectedAcademicYear}
          </div>
        </div>
        ${printContents}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
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
        <div className="alert alert-info text-center mt-3">
        <strong>Submission Deadline:</strong> {deadlineDisplay}
      </div>
        <div>
          <button className="btn btn-outline-danger me-2" onClick={handleDownloadPDF}>
            Download PDF
          </button>
          <button className="btn btn-outline-success" onClick={handleDownloadExcel}>
            Download Excel
          </button>
        </div>
      </div>

      <h5 className="text-center mt-3">Department of {departmentName} - Budget Proposals for Student Activities</h5>
      <div ref={printRef}>
        <table className="table table-bordered table-striped mt-3">
          <thead className="table-dark">
            <tr>
              <th>Activity Category</th>
              <th>Program Type</th>
              <th>Sub Type</th>
              <th className="text-center">Budget / Event</th>
              <th className="text-center">Count</th>
              <th className="text-center">Total Budget</th>
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

                      const isVariableAndPrincipal =
                        userRole === "principal" && item.budget_mode === "Variable";

                      return (
                        <tr key={item.program_type + (item.sub_program_type || "")}>
                          {idx === 0 && <td className="bold" rowSpan={items.length}>{category}</td>}
                          <td>{item.program_type}</td>
                          <td>{item.sub_program_type || "-"}</td>
                          <td align="center">{item.budget_per_event || "-"}</td>
                          <td align="center">
                            {renderInput(
                              globalIndex,
                              "count",
                              mergedData[globalIndex].count,
                              userRole === "hod" && isEditable
                            )}
                          </td>
                          <td align="center">
                            {item.budget_mode === "Fixed" ? (
                              budget
                            ) : (
                              renderInput(
                                globalIndex,
                                "total_budget",
                                mergedData[globalIndex].total_budget,
                                isEditable &&
                                (userRole === "hod" || isVariableAndPrincipal)
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
                      <td align="center">{subtotal.count}</td>
                      <td align="center">{subtotal.budget}</td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}


            {/* Grand Total Row */}
            {Object.entries(grouped).length > 0 && (
              <>
                {/* Grand Total Row */}
                <tr className="table-warning fw-bold">
                  <td colSpan="4" className="text-end">Grand Total</td>
                  <td align="center">{grandTotal.count}</td>
                  <td align="center">{grandTotal.budget}</td>
                </tr>

                {/* Empty row for spacing */}
                <tr>
                  <td colSpan="6" className="text-center">
                    <div style={{ height: "10px" }}></div>
                  </td>
                </tr>


                {/* HoD Remarks Row */}
                {hodRemarks && (
                  <tr>
                    <td colSpan="6" style={{ whiteSpace: "pre-wrap", fontWeight: "bold" }}>
                      HoD Remarks:<br />
                      <span style={{ fontWeight: "normal" }}>{hodRemarks}</span>
                    </td>
                  </tr>
                )}

                {/* Empty row for spacing */}
                <tr>
                  <td colSpan="6" className="text-center">
                    <div style={{ height: "10px" }}></div>
                  </td>
                </tr>

                {/* Principal Remarks Row */}
                {principalRemarks && (
                  <tr>
                    <td colSpan="6" style={{ whiteSpace: "pre-wrap", fontWeight: "bold" }}>
                      Principal Remarks:<br />
                      <span style={{ fontWeight: "normal" }}>{principalRemarks}</span>
                    </td>
                  </tr>
                )}
              </>
            )}


          </tbody>
          <tr>
            <td colSpan="6">
              {/* Signature Area */}
              <div className="row mt-5 text-center">
                <div className="col">
                  <p><strong>HoD, {departmentName}</strong></p>
                </div>
                <div className="col">
                  <p><strong>Principal</strong></p>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </div>
        {/* HoD Final Remarks */}
        <div className="mt-4">
          <label><strong>HoD Remarks Entry:</strong></label>
          {userRole === "hod" ? (
            <>
              <textarea
                rows={4}
                className="form-control"
                value={hodRemarks}
                onChange={(e) => setHodRemarks(e.target.value)}
                readOnly={!isEditable}
                style={{ whiteSpace: "pre-wrap" }}
              />
              {/* Printable version for PDF */}
              <div
                className="d-none d-print-block mt-2"
                style={{
                  whiteSpace: "pre-wrap",
                  border: "1px solid #ccc",
                  padding: "10px",
                  marginTop: "10px",
                }}
              >
                {hodRemarks}
              </div>
            </>
          ) : (
            <div
              className="form-control bg-light"
              style={{ whiteSpace: "pre-wrap", minHeight: "100px" }}
            >
              {hodRemarks}
            </div>
          )}
        </div>


        {/* Principal Final Remarks */}
        <div className="mt-4">
          <label><strong>Principal Remarks Entry:</strong></label>
          {userRole === "principal" ? (
            <textarea
              rows={4}
              className="form-control"
              value={principalRemarks}
              onChange={(e) => setPrincipalRemarks(e.target.value)}
              readOnly={!isEditable}
              style={{ whiteSpace: "pre-wrap" }}
            />
          ) : (
            <div
              className="form-control bg-light"
              style={{ whiteSpace: "pre-wrap", minHeight: "100px" }}>
              {principalRemarks}
            </div>
          )}
        </div>


        {/* Submit */}
        <div className="text-center mt-4">
          {isEditable && (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </button>
          )}
        </div>

      {/* Submission Status Modal */}
      {status === "success" || status === "error" ? (
        <>
          <div className="custom-modal-backdrop"></div>
          <div className="custom-modal-container bg-white border rounded shadow">
            <div className="modal-header border-bottom">
              <h5 className={`modal-title ${status === "success" ? "text-success" : "text-danger"}`}>
                {status === "success" ? "Success" : "Error"}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setStatus(null)}
              ></button>
            </div>
            <div className="modal-body text-center">
              <p>
                {status === "success"
                  ? "✅ Submission successful!"
                  : "❌ Submission failed. Please try again."}
              </p>
            </div>
            <div className="modal-footer border-top text-end">
              <button
                className="btn btn-secondary"
                onClick={() => setStatus(null)}
              >
                Close
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* Add white space at the bottom of the page */}
      <div style={{ height: "100px" }}></div>

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
