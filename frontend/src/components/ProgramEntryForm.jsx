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
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideDuration, setOverrideDuration] = useState(24);
  const [overrideInfo, setOverrideInfo] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  
  // New workflow states
  const [submissionStatus, setSubmissionStatus] = useState('draft'); // 'draft', 'submitted', 'approved', 'events_planned', 'completed'
  const [canPlanEvents, setCanPlanEvents] = useState(false);
  const [showEventPlanning, setShowEventPlanning] = useState(false);

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

          // Check for deadline override
          let hasOverride = false;
          try {
            const overrideRes = await API.get(
              `/deadline-override?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}&module_name=program_entry`
            );
            hasOverride = overrideRes.data.has_override;
            setOverrideInfo(overrideRes.data); // Store override info including expiration
          } catch (e) {
            console.log("No deadline override found");
            setOverrideInfo(null);
          }

          // Set editability based on role and deadline
          if (userRole === "admin") {
            setIsEditable(true);
          } else if (userRole === "principal") {
            // Principals can edit, but we need to track if deadline passed for override button logic
            setIsEditable(true);
            // Store deadline status for override button logic
            setDeadlinePassed(!isBeforeDeadline && !hasOverride);
          } else if (userRole === "hod") {
            setIsEditable(yearObj?.is_enabled && (isBeforeDeadline || hasOverride));
          }
        } catch (e) {
          console.warn("No module deadline found");
          setDeadlineDisplay("No deadline set");
          setIsEditable(false);
        }

        // 🔁 Fetch submission status
        try {
          const statusRes = await API.get(`/workflow-status?department_id=${departmentId}&academic_year_id=${selectedAcademicYearId}`);
          setSubmissionStatus(statusRes.data.status || 'draft');
          
          // Update canPlanEvents based on status
          if (statusRes.data.status === 'approved') {
            setCanPlanEvents(true);
          }
        } catch (e) {
          console.warn("Could not fetch submission status, defaulting to draft");
          setSubmissionStatus('draft');
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchAll();
  }, [departmentId, selectedAcademicYearId, userRole]);

  // Update time remaining every minute for active overrides
  useEffect(() => {
    if (overrideInfo && overrideInfo.has_override && overrideInfo.expires_at) {
      const updateTimeRemaining = () => {
        const now = new Date();
        const expires = new Date(overrideInfo.expires_at);
        const diff = expires - now;
        
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours > 0) {
            setTimeRemaining(`${hours}h ${minutes}m remaining`);
          } else if (minutes > 0) {
            setTimeRemaining(`${minutes}m remaining`);
          } else {
            setTimeRemaining("Expires in < 1 minute");
          }
        } else {
          setTimeRemaining("Expired");
        }
      };

      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
      
      return () => clearInterval(interval);
    } else {
      setTimeRemaining("");
    }
  }, [overrideInfo]);


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

  // Status Indicator Component
  const StatusIndicator = ({ status, userRole }) => {
    const statusSteps = [
      { key: 'draft', label: 'Entry', icon: '📝', desc: 'HoD enters counts & budgets' },
      { key: 'submitted', label: 'Submitted', icon: '📤', desc: 'Awaiting Principal approval' },
      { key: 'approved', label: 'Approved', icon: '✅', desc: 'Ready for event planning' },
      { key: 'events_planned', label: 'Events Planned', icon: '📅', desc: 'Individual events added' },
      { key: 'completed', label: 'Completed', icon: '🎯', desc: 'All events executed' }
    ];

    const getCurrentStepIndex = () => {
      return statusSteps.findIndex(step => step.key === status);
    };

    return (
      <div className="mb-4">
        <h6 className="text-center mb-3">Workflow Status</h6>
        <div className="d-flex justify-content-center">
          <div className="row text-center" style={{ maxWidth: '800px' }}>
            {statusSteps.map((step, index) => {
              const isActive = step.key === status;
              const isCompleted = getCurrentStepIndex() > index;
              const stepClass = isActive ? 'text-primary fw-bold' : isCompleted ? 'text-success' : 'text-muted';
              
              return (
                <div key={step.key} className="col">
                  <div className={stepClass}>
                    <div style={{ fontSize: '1.5rem' }}>{step.icon}</div>
                    <div className="small fw-bold">{step.label}</div>
                    <div className="small" style={{ fontSize: '0.75rem' }}>{step.desc}</div>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div className="position-absolute" style={{ 
                      top: '50%', 
                      right: '-50%', 
                      transform: 'translateY(-50%)',
                      color: isCompleted ? '#198754' : '#6c757d'
                    }}>
                      →
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Workflow Management Functions
  const handleSubmitForApproval = async () => {
    try {
      // Validate form first
      const isValid = mergedData.every(entry => 
        entry.count >= 0 && entry.total_budget >= 0
      );
      
      if (!isValid) {
        alert('Please ensure all counts and budgets are valid');
        return;
      }

      // Submit data first
      await handleSubmit();
      
      // Update status to 'submitted'
      await API.put(`/workflow-status`, { 
        academic_year_id: selectedAcademicYearId,
        department_id: departmentId,
        status: 'submitted'
      });
      
      setSubmissionStatus('submitted');
      alert('Successfully submitted for Principal approval!');
    } catch (error) {
      console.error('Error submitting for approval:', error);
      alert('Error submitting for approval');
    }
  };

  const handlePrincipalApproval = async () => {
    try {
      // Update status to 'approved'
      await API.put(`/workflow-status`, { 
        academic_year_id: selectedAcademicYearId,
        department_id: departmentId,
        status: 'approved'
      });
      
      setSubmissionStatus('approved');
      setCanPlanEvents(true);
      alert('Successfully approved! Department can now plan individual events.');
    } catch (error) {
      console.error('Error approving submission:', error);
      alert('Error approving submission');
    }
  };

  const handlePlanEvents = () => {
    setShowEventPlanning(true);
  };

  const handleEnableSubmissionOverride = () => {
    // Show modal to select time limit
    setShowOverrideModal(true);
  };

  const confirmEnableOverride = async () => {
    try {
      // Create a deadline override for this department with time limit
      await API.post('/deadline-override', {
        department_id: departmentId,
        academic_year_id: selectedAcademicYearId,
        module_name: 'program_entry',
        enabled_by_principal: true,
        duration_hours: overrideDuration,
        reason: `Principal override - late submission allowed for ${overrideDuration} hours`
      });

      alert(`Deadline override enabled for ${overrideDuration} hours!`);
      // Refresh the page data to reflect the override
      window.location.reload();
      
    } catch (error) {
      console.error('Error enabling submission override:', error);
      alert('Error enabling submission override. Please try again.');
    }
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

      {/* Status Indicator */}
      <StatusIndicator status={submissionStatus} userRole={userRole} />

      {/* Workflow Action Buttons */}
      <div className="mb-3 text-center">
        {submissionStatus === 'draft' && userRole === 'hod' && (
          <button 
            className="btn btn-primary me-2"
            onClick={handleSubmitForApproval}
            disabled={submitting || !isEditable}
            title={!isEditable ? "Submission deadline has passed" : "Submit your budget for Principal approval"}
          >
            {!isEditable ? "Submission Deadline Passed" : "Submit for Principal Approval"}
          </button>
        )}
        
        {submissionStatus === 'submitted' && userRole === 'principal' && (
          <button 
            className="btn btn-success me-2"
            onClick={handlePrincipalApproval}
          >
            Approve Budget
          </button>
        )}

        {submissionStatus === 'submitted' && userRole === 'hod' && (
          <div className="alert alert-warning">
            📤 Submitted for Principal approval. Awaiting approval to plan events.
          </div>
        )}

        {submissionStatus === 'approved' && userRole === 'principal' && (
          <div className="alert alert-success">
            ✅ Budget approved. Department can now plan individual events.
          </div>
        )}

        {submissionStatus === 'events_planned' && userRole === 'principal' && (
          <div className="alert alert-info">
            📅 Events have been planned by the department.
          </div>
        )}

        {submissionStatus === 'draft' && userRole === 'principal' && (
          <div className="alert alert-secondary">
            📝 Department is still drafting their budget proposal.
            
            {/* Show override button for Principals when deadline passed, or for others when not editable */}
            {((userRole === "principal" && deadlinePassed) || (!isEditable && userRole !== "principal")) && (
              <>
                <br/>
                <small className="text-muted">Note: Submission deadline has passed.</small>
                <br/>
                <button 
                  className="btn btn-warning btn-sm mt-2"
                  onClick={handleEnableSubmissionOverride}
                  title="Allow this department to submit after deadline"
                >
                  🔓 Enable Submission for This Department
                </button>
              </>
            )}
            
            {isEditable && (
              <>
                <br/>
                {overrideInfo && overrideInfo.has_override && overrideInfo.expires_at ? (
                  <small className="text-warning">
                    ⏰ Deadline override active until: {new Date(overrideInfo.expires_at).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </small>
                ) : (
                  <small className="text-success">Department can still submit (deadline not passed or override active).</small>
                )}
              </>
            )}
          </div>
        )}
        
        {canPlanEvents && submissionStatus === 'approved' && userRole === 'hod' && (
          <button 
            className="btn btn-info"
            onClick={handlePlanEvents}
          >
            Plan Individual Events
          </button>
        )}

        {submissionStatus === 'events_planned' && userRole === 'hod' && (
          <div className="alert alert-success">
            📅 Events planned successfully. Ready for execution and reporting.
          </div>
        )}

        </div>

      <div className="d-flex justify-content-between align-items-center">
        <div className="alert alert-info text-center mt-3">
          <div><strong>Submission Deadline:</strong> {deadlineDisplay}</div>
          {overrideInfo && overrideInfo.has_override && overrideInfo.expires_at && (
            <div className="mt-2">
              <div className="badge bg-warning text-dark">
                🔓 Override Active {timeRemaining && `(${timeRemaining})`}
              </div>
              <div className="small mt-1">
                Extended until: {new Date(overrideInfo.expires_at).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          )}
          {overrideInfo && overrideInfo.expired && overrideInfo.expired_at && (
            <div className="mt-2">
              <div className="badge bg-danger">
                ⏰ Override Expired
              </div>
              <div className="small mt-1 text-muted">
                Expired on: {new Date(overrideInfo.expired_at).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          )}
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


      {/* Save Draft / Submit for Review */}
      <div className="text-center mt-4">
        {isEditable && submissionStatus === 'draft' && userRole === 'hod' && (
          <button
            className="btn btn-outline-secondary me-2"
            onClick={handleSubmit}
            disabled={submitting}>
            {submitting ? "Saving..." : "Save Draft"}
          </button>
        )}
        
        {isEditable && submissionStatus !== 'draft' && (userRole === 'hod' || userRole === 'principal') && (
          <button
            className="btn btn-outline-primary"
            onClick={handleSubmit}
            disabled={submitting}>
            {submitting ? "Updating..." : "Update Data"}
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

      {/* Event Planning Modal */}
      {showEventPlanning && (
        <>
          <div className="custom-modal-backdrop"></div>
          <div className="custom-modal-container bg-white border rounded shadow" style={{ maxWidth: '90%', maxHeight: '90%' }}>
            <div className="modal-header border-bottom">
              <h5 className="modal-title text-primary">Plan Individual Events</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowEventPlanning(false)}
              ></button>
            </div>
            <div className="modal-body">
              <div className="text-center p-4">
                <h6 className="text-muted mb-3">📅 Event Planning Interface</h6>
                <p className="mb-3">
                  This interface will allow you to plan individual events based on your approved counts.
                </p>
                <div className="alert alert-info">
                  <strong>Coming Soon:</strong> Dynamic forms for each program type with event details including:
                  <ul className="text-start mt-2 mb-0">
                    <li>Event Title</li>
                    <li>Event Date</li>
                    <li>Event Budget</li>
                    <li>Event Description</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEventPlanning(false)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                disabled
              >
                Save Events (Coming Soon)
              </button>
            </div>
          </div>
        </>
      )}

      {/* Time Limit Override Modal */}
      {showOverrideModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🕒 Set Deadline Override Duration</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowOverrideModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  How long should <strong>{departmentName}</strong> be allowed to submit after the deadline?
                </p>
                
                <div className="mb-3">
                  <label className="form-label">Duration (hours)</label>
                  <select 
                    className="form-select" 
                    value={overrideDuration} 
                    onChange={(e) => setOverrideDuration(parseInt(e.target.value))}
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours (1 day)</option>
                    <option value={48}>48 hours (2 days)</option>
                    <option value={72}>72 hours (3 days)</option>
                    <option value={168}>168 hours (1 week)</option>
                  </select>
                </div>

                <div className="alert alert-info">
                  <small>
                    <strong>Note:</strong> This override will automatically expire after the selected duration. 
                    The department will only be able to submit during this extended time window.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowOverrideModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={confirmEnableOverride}
                >
                  🔓 Enable Override for {overrideDuration} hours
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showOverrideModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

export default ProgramEntryForm;
