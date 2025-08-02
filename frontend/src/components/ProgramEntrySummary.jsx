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
  const [overrides, setOverrides] = useState({});
  const [deadlineInfo, setDeadlineInfo] = useState(null);

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
        setStatuses(statusRes.data);
        
        // Fetch deadline info
        try {
          const deadlineRes = await API.get(`/deadlines?academic_year_id=${selectedAcademicYearId}`);
          setDeadlineInfo(deadlineRes.data.program_entry);
        } catch (e) {
          console.log("No deadline info found");
          setDeadlineInfo(null);
        }
        
        // Fetch overrides for all departments
        const overridePromises = deptRes.data.map(async (dept) => {
          try {
            const overrideRes = await API.get(
              `/deadline-override?department_id=${dept.id}&academic_year_id=${selectedAcademicYearId}&module_name=program_entry`
            );
            return { [dept.id]: overrideRes.data };
          } catch (e) {
            return { [dept.id]: null };
          }
        });
        
        const overrideResults = await Promise.all(overridePromises);
        const overridesMap = overrideResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setOverrides(overridesMap);
        
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

  // Enhanced status logic
  const getEnhancedStatus = (dept) => {
    const status = statuses[dept.id];
    const override = overrides[dept.id];
    const now = new Date();
    const isDeadlinePassed = deadlineInfo && new Date(deadlineInfo.deadline) < now;
    
    if (!status || status.status === "Not Submitted") {
      if (isDeadlinePassed && !override?.has_override) {
        return { 
          stage: "deadline_missed", 
          label: "Deadline Missed", 
          variant: "danger",
          icon: "fas fa-clock"
        };
      }
      return { 
        stage: "not_started", 
        label: "Not Started", 
        variant: "secondary",
        icon: "fas fa-edit"
      };
    }
    
    switch(status.workflow_status || status.status) {
      case 'draft':
        if (isDeadlinePassed && !override?.has_override) {
          return { 
            stage: "draft_overdue", 
            label: "Draft (Overdue)", 
            variant: "warning",
            icon: "fas fa-exclamation-triangle"
          };
        }
        return { 
          stage: "drafting", 
          label: "In Progress", 
          variant: "info",
          icon: "fas fa-pencil-alt"
        };
        
      case 'submitted':
      case 'Submitted':
        return { 
          stage: "submitted", 
          label: "Awaiting Approval", 
          variant: "primary",
          icon: "fas fa-paper-plane"
        };
        
      case 'approved':
        return { 
          stage: "approved", 
          label: "Approved", 
          variant: "success",
          icon: "fas fa-check-circle"
        };
        
      case 'events_planned':
        return { 
          stage: "events_planned", 
          label: "Events Planned", 
          variant: "success",
          icon: "fas fa-calendar-check"
        };
        
      case 'completed':
        return { 
          stage: "completed", 
          label: "Completed", 
          variant: "success",
          icon: "fas fa-trophy"
        };
        
      default:
        return { 
          stage: "unknown", 
          label: status.status || "Unknown", 
          variant: "secondary",
          icon: "fas fa-question-circle"
        };
    }
  };

  // Get summary statistics
  const getSummaryStats = () => {
    return departments.reduce((acc, dept) => {
      const statusInfo = getEnhancedStatus(dept);
      acc[statusInfo.stage] = (acc[statusInfo.stage] || 0) + 1;
      return acc;
    }, {});
  };

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

  const handleCreateOverride = async (deptId) => {
    const hours = prompt("Enter override duration in hours:", "24");
    if (!hours) return;
    
    try {
      await API.post('/deadline-override', {
        department_id: deptId,
        academic_year_id: selectedAcademicYearId,
        module_name: 'program_entry',
        duration_hours: parseInt(hours),
        enabled_by_principal: true,
        reason: `Principal override - ${hours} hours extension`
      });
      
      // Refresh data
      const deptName = departments.find(d => d.id === deptId)?.name || 'Department';
      alert(`Override created for ${deptName} - ${hours} hours extension granted`);
      
      // Refresh overrides
      try {
        const overrideRes = await API.get(
          `/deadline-override?department_id=${deptId}&academic_year_id=${selectedAcademicYearId}&module_name=program_entry`
        );
        setOverrides(prev => ({ ...prev, [deptId]: overrideRes.data }));
      } catch (e) {
        // Refresh all data if individual refresh fails
        const updatedOverrides = { ...overrides };
        delete updatedOverrides[deptId];
        setOverrides(updatedOverrides);
      }
    } catch (error) {
      console.error('Error creating override:', error);
      alert('Failed to create override');
    }
  };

  const handleExtendOverride = async (deptId) => {
    const additionalHours = prompt("Extend by how many hours?", "6");
    if (!additionalHours) return;
    
    try {
      await API.put(`/deadline-override/extend?department_id=${deptId}&academic_year_id=${selectedAcademicYearId}&module_name=program_entry&additional_hours=${additionalHours}`);
      
      const deptName = departments.find(d => d.id === deptId)?.name || 'Department';
      alert(`Override extended for ${deptName} by ${additionalHours} hours`);
      
      // Refresh override info
      try {
        const overrideRes = await API.get(
          `/deadline-override?department_id=${deptId}&academic_year_id=${selectedAcademicYearId}&module_name=program_entry`
        );
        setOverrides(prev => ({ ...prev, [deptId]: overrideRes.data }));
      } catch (e) {
        console.log("Could not refresh override info");
      }
    } catch (error) {
      console.error('Error extending override:', error);
      alert('Failed to extend override');
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

      {/* Summary Statistics */}
      {departments.length > 0 && (
        <div className="row mb-4">
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="h5 mb-0 text-success">{getSummaryStats().completed || 0}</div>
                <small className="text-success"><i className="fas fa-trophy"></i> Completed</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="h5 mb-0 text-success">{getSummaryStats().approved || 0}</div>
                <small className="text-success"><i className="fas fa-check-circle"></i> Approved</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="h5 mb-0 text-primary">{getSummaryStats().submitted || 0}</div>
                <small className="text-primary"><i className="fas fa-paper-plane"></i> Pending Approval</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="h5 mb-0 text-info">{getSummaryStats().drafting || 0}</div>
                <small className="text-info"><i className="fas fa-pencil-alt"></i> In Progress</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="h5 mb-0 text-danger">{getSummaryStats().deadline_missed || 0}</div>
                <small className="text-danger"><i className="fas fa-clock"></i> Missed Deadline</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="h5 mb-0 text-warning">{Object.values(overrides).filter(o => o?.has_override).length}</div>
                <small className="text-warning"><i className="fas fa-unlock"></i> Active Overrides</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deadline Information */}
      {deadlineInfo && (
        <div className="alert alert-info mb-3">
          <div className="row">
            <div className="col-md-8">
              <strong><i className="fas fa-calendar-alt"></i> Submission Deadline:</strong> {new Date(deadlineInfo.deadline).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="col-md-4 text-end">
              <small>
                Active Extensions: {Object.values(overrides).filter(o => o?.has_override).length} departments
              </small>
            </div>
          </div>
        </div>
      )}
      
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
            <th style={{ textAlign: "center" }}>Proposed Budget</th>
            <th style={{ textAlign: "center" }}>Workflow Status</th>
            <th style={{ textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept, index) => {
            const statusInfo = getEnhancedStatus(dept);
            return (
              <tr key={dept.id}>
                <td style={{ textAlign: "center" }}>{index + 1}</td>
                <td>{dept.full_name}</td>
                <td style={{ textAlign: "right" }}>
                  {statuses[dept.id]?.grand_total_budget !== undefined
                    ? `₹${statuses[dept.id].grand_total_budget.toLocaleString()}`
                    : <span className="text-muted">₹0</span>}
                </td>
                <td style={{ textAlign: "center" }}>
                  <div>
                    <span className={`badge bg-${statusInfo.variant} mb-1`}>
                      <i className={statusInfo.icon}></i> {statusInfo.label}
                    </span>
                    
                    {/* Override indicator */}
                    {overrides[dept.id]?.has_override && overrides[dept.id]?.expires_at && (
                      <div className="mt-1">
                        <span className="badge bg-warning text-dark small">
                          <i className="fas fa-unlock"></i> Extended until {new Date(overrides[dept.id].expires_at).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    )}
                    
                    {/* Expired override */}
                    {overrides[dept.id]?.expired && (
                      <div className="mt-1">
                        <span className="badge bg-danger small">
                          <i className="fas fa-clock"></i> Extension Expired
                        </span>
                      </div>
                    )}
                    
                    {/* Last activity */}
                    {statuses[dept.id]?.last_updated && (
                      <div className="small text-muted mt-1">
                        Updated: {new Date(statuses[dept.id].last_updated).toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div>
                    {/* Reminder action */}
                    {['not_started', 'drafting', 'draft_overdue', 'deadline_missed'].includes(statusInfo.stage) && (
                      <button
                        className="btn btn-warning btn-sm me-1 mb-1"
                        onClick={() => handleSendReminder(dept.id)}
                        disabled={sending[dept.id]}
                      >
                        {sending[dept.id] ? "Sending..." : <><i className="fas fa-envelope"></i> Remind</>}
                      </button>
                    )}
                    
                    {/* Override actions for Principals */}
                    {userRole === "principal" && (
                      <>
                        {!overrides[dept.id]?.has_override && statusInfo.stage === 'deadline_missed' && (
                          <button
                            className="btn btn-outline-warning btn-sm me-1 mb-1"
                            onClick={() => handleCreateOverride(dept.id)}
                            title="Enable submission after deadline"
                          >
                            <i className="fas fa-unlock"></i> Enable
                          </button>
                        )}
                        
                        {overrides[dept.id]?.has_override && (
                          <button
                            className="btn btn-outline-secondary btn-sm me-1 mb-1"
                            onClick={() => handleExtendOverride(dept.id)}
                            title="Extend current override"
                          >
                            <i className="fas fa-clock"></i> Extend
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
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
