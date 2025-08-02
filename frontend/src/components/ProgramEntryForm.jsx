import React, { useEffect, useState, useRef } from "react";
import API from "../Api";
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
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");

  const printRef = useRef();

  useEffect(() => {
    // Fetch academic years on mount
    API.get("/academic-years")
      .then((res) => {
        setAcademicYears(res.data);
        if (res.data.length > 0) {
          setSelectedAcademicYearId(res.data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load academic years", err));
  }, []);

  useEffect(() => {
    if (!departmentId || !selectedAcademicYearId) return;

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
          API.get("/program-types"),
          API.get(`/program-counts?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch((err) => (err.response?.status === 404 ? { data: [] } : Promise.reject(err))),
          API.get("/departments"),
          API.get(`/principal-remarks?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch(() => ({ data: { remarks: "" } })),
          API.get(`/hod-remarks?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`)
            .catch(() => ({ data: { remarks: "" } })),
          API.get("/academic-years")
        ]);

        const departmentObj = deptRes.data.find((d) => d.id === departmentId);
        if (departmentObj) {
          setDepartmentName(departmentObj.name || "");
          setDepartmentFullName(departmentObj.full_name || "");
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

        // 🔁 Academic year name
        const yearObj = yearsRes.data.find((y) => y.id === selectedAcademicYearId);
        setSelectedAcademicYear(yearObj?.year || "");

        // 🔁 Fetch deadline from module_deadlines
        try {
          const deadlineRes = await API.get(
            `/module-deadlines?academic_year_id=${selectedAcademicYearId}&module_name=program_entry`
          );
          const deadline = new Date(deadlineRes.data.deadline);
          const today = new Date();
          const isBeforeDeadline = today <= deadline;

          setDeadlineDisplay(
            deadline instanceof Date && !isNaN(deadline)
              ? deadline.toLocaleString("en-IN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Kolkata"
                }).replaceAll("/", "-")
              : "Invalid Date"
          );

          if (userRole === "principal" || userRole === "admin") {
            setIsEditable(true);
          } else if (userRole === "hod") {
            setIsEditable(yearObj?.is_enabled && isBeforeDeadline);
          }
        } catch (e) {
          console.warn("No module deadline found");
          setDeadlineDisplay("No deadline set");
          setIsEditable(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchAll();
  }, [departmentId, selectedAcademicYearId, userRole]);


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
        academic_year_id: selectedAcademicYearId,
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

      await API.post("/program-counts", { entries: payload });

      if (userRole === "hod") {
        await API.post("/hod-remarks", {
          department_id: departmentId,
          academic_year_id: selectedAcademicYearId,
          remarks: hodRemarks,
        });
      }

      if (userRole === "principal") {
        await API.post("/principal-remarks", {
          department_id: departmentId,
          academic_year_id: selectedAcademicYearId,
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
        <title>Budget Proposals for Student Activities - ${departmentName}</title>
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
          tr, td, th {
           page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="assets/logo.png" alt="College Logo" class="logo" />
          <div>
            <strong>Department of ${departmentFullName} - Budget Proposals for Student Activities</strong><br/>
            <strong>Academic Year: ${selectedAcademicYear}</strong>
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
      {/* Academic Year Dropdown - now only in ProgramEntryForm */}
      <div className="mb-3">
        <label><strong>Select Academic Year:</strong></label>
        <select
          className="form-select"
          value={selectedAcademicYearId}
          onChange={(e) => setSelectedAcademicYearId(Number(e.target.value))}
        >
          <option value="">-- Select Academic Year --</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>{year.year}</option>
          ))}
        </select>
      </div>

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
                              (userRole === "hod" || userRole === "principal") && isEditable
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
              </>
            )}
          </tbody>

        </table>
        <div style={{ height: "24px" }}></div>{/* Empty row for spacing */}
        <table className="table table-bordered  mt-3">
          <tbody>
            {/* HoD Remarks Row */}
            {hodRemarks && (
              <tr>
                <td colSpan="6" style={{ whiteSpace: "pre-wrap", fontWeight: "bold" }}>
                  HoD Remarks:<br />
                  <span style={{ fontWeight: "normal" }}>{hodRemarks}</span>
                  <div style={{ height: "14px" }}></div>{/* Empty row for spacing */}
                </td>
              </tr>
            )}

            {/* Principal Remarks Row */}
            {principalRemarks && (
              <tr>
                <td colSpan="6" style={{ whiteSpace: "pre-wrap", fontWeight: "bold" }}>
                  Principal Remarks:<br />
                  <span style={{ fontWeight: "normal" }}>{principalRemarks}</span>
                  <div style={{ height: "14px" }}></div>{/* Empty row for spacing */}
                </td>
              </tr>
            )}

          </tbody>
        </table>
        <div style={{ height: "24px" }}></div>{/* Empty row for spacing */}
        <table border="0">
          <tbody>
          <tr>
            <td align="center"><div style={{ height: "50px" }}></div><strong>HoD, {departmentName}</strong></td>
            <td align="center"><div style={{ height: "50px" }}></div><strong>Principal</strong></td>
          </tr>
          </tbody>
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
