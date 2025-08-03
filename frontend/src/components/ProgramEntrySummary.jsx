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
          const deadlineRes = await API.get(`/module-deadlines/${selectedAcademicYearId}`);
          
          // Find the program_entry deadline from the array
          const programEntryDeadline = deadlineRes.data.find(dl => dl.module === 'program_entry');
          setDeadlineInfo(programEntryDeadline);
        } catch (e) {
          console.error("Error fetching deadline info:", e);
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
    
    // Enhanced deadline logic - now uses actual deadline from database
    let isDeadlinePassed;
    if (deadlineInfo && deadlineInfo.deadline) {
      isDeadlinePassed = new Date(deadlineInfo.deadline) < now;
    } else {
      // No deadline set - assume deadline has not passed
      isDeadlinePassed = false;
    }
    
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
    const deptName = departments.find(d => d.id === deptId)?.name || 'Department';
    
    // Show options for override duration
    const options = [
      { label: "6 hours", value: 6 },
      { label: "12 hours", value: 12 },
      { label: "24 hours (1 day)", value: 24 },
      { label: "48 hours (2 days)", value: 48 },
      { label: "72 hours (3 days)", value: 72 },
      { label: "Custom", value: "custom" }
    ];
    
    const optionText = options.map((opt, idx) => `${idx + 1}. ${opt.label}`).join('\n');
    const choice = prompt(`Select override duration for ${deptName}:\n\n${optionText}\n\nEnter option number (1-6):`);
    
    if (!choice) return;
    
    const choiceNum = parseInt(choice);
    let hours;
    
    if (choiceNum >= 1 && choiceNum <= 5) {
      hours = options[choiceNum - 1].value;
    } else if (choiceNum === 6) {
      hours = prompt("Enter custom duration in hours:", "24");
      if (!hours) return;
      hours = parseInt(hours);
    } else {
      alert("Invalid selection");
      return;
    }
    
    if (isNaN(hours) || hours <= 0) {
      alert("Invalid duration");
      return;
    }
    
    const reason = prompt("Enter reason for override (optional):", `Principal override - ${hours} hours extension for ${deptName}`);
    
    try {
      await API.post('/deadline-override', {
        department_id: deptId,
        academic_year_id: selectedAcademicYearId,
        module_name: 'program_entry',
        duration_hours: hours,
        enabled_by_principal: true,
        reason: reason || `Principal override - ${hours} hours extension`
      });
      
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
        // Failed to refresh override info
      }
    } catch (error) {
      console.error('Error extending override:', error);
      alert('Failed to extend override');
    }
  };

  const handleRevokeOverride = async (deptId) => {
    const deptName = departments.find(d => d.id === deptId)?.name || 'Department';
    const confirmed = window.confirm(`Are you sure you want to revoke the deadline override for ${deptName}? This will immediately disable their ability to submit after the deadline.`);
    
    if (!confirmed) return;
    
    try {
      await API.delete(`/deadline-override?department_id=${deptId}&academic_year_id=${selectedAcademicYearId}&module_name=program_entry`);
      
      alert(`Override revoked for ${deptName}`);
      
      // Remove override from state
      setOverrides(prev => {
        const updated = { ...prev };
        delete updated[deptId];
        return updated;
      });
    } catch (error) {
      console.error('Error revoking override:', error);
      alert('Failed to revoke override');
    }
  };

  // Bulk Actions
  const handleGrantOverrideToAllMissed = async () => {
    const missedDepartments = departments.filter(dept => {
      const statusInfo = getEnhancedStatus(dept);
      return statusInfo.stage === 'deadline_missed' && !overrides[dept.id]?.has_override;
    });

    if (missedDepartments.length === 0) {
      alert('No departments have missed the deadline or all missed departments already have overrides.');
      return;
    }

    const deptNames = missedDepartments.map(d => d.name).join(', ');
    const confirmed = window.confirm(`Grant deadline override to ${missedDepartments.length} departments that missed the deadline?\n\nDepartments: ${deptNames}`);
    
    if (!confirmed) return;

    // Get override duration
    const options = [
      { label: "6 hours", value: 6 },
      { label: "12 hours", value: 12 },
      { label: "24 hours (1 day)", value: 24 },
      { label: "48 hours (2 days)", value: 48 },
      { label: "72 hours (3 days)", value: 72 },
      { label: "Custom", value: "custom" }
    ];

    const optionText = options.map((opt, idx) => `${idx + 1}. ${opt.label}`).join('\n');
    const choice = prompt(`Select override duration for all missed departments:\n\n${optionText}\n\nEnter option number (1-6):`);
    
    if (!choice) return;

    const choiceNum = parseInt(choice);
    let hours;
    
    if (choiceNum >= 1 && choiceNum <= 5) {
      hours = options[choiceNum - 1].value;
    } else if (choiceNum === 6) {
      hours = prompt("Enter custom duration in hours:", "24");
      if (!hours) return;
      hours = parseInt(hours);
    } else {
      alert("Invalid selection");
      return;
    }

    if (isNaN(hours) || hours <= 0) {
      alert("Invalid duration");
      return;
    }

    const reason = prompt("Enter reason for bulk override (optional):", `Principal bulk override - ${hours} hours extension for missed deadlines`);

    try {
      // Process overrides for all missed departments
      const promises = missedDepartments.map(dept => 
        API.post('/deadline-override', {
          department_id: dept.id,
          academic_year_id: selectedAcademicYearId,
          module_name: 'program_entry',
          duration_hours: hours,
          enabled_by_principal: true,
          reason: reason || `Principal bulk override - ${hours} hours extension`
        })
      );

      await Promise.all(promises);
      
      alert(`Successfully granted ${hours}-hour override to ${missedDepartments.length} departments!`);
      
      // Refresh all override data
      window.location.reload();
      
    } catch (error) {
      console.error('Error granting bulk overrides:', error);
      alert('Some overrides failed to create. Please try again or create them individually.');
    }
  };

  const handleSendReminderToAllPending = async () => {
    const pendingDepartments = departments.filter(dept => {
      const statusInfo = getEnhancedStatus(dept);
      return ['not_started', 'drafting', 'draft_overdue', 'deadline_missed'].includes(statusInfo.stage);
    });

    if (pendingDepartments.length === 0) {
      alert('No departments are pending submission.');
      return;
    }

    const deptNames = pendingDepartments.map(d => d.name).join(', ');
    const confirmed = window.confirm(`Send reminder emails to ${pendingDepartments.length} departments?\n\nDepartments: ${deptNames}`);
    
    if (!confirmed) return;

    try {
      // Send reminders to all pending departments
      const promises = pendingDepartments.map(dept => 
        API.post("/reminder/send", {
          dept_id: dept.id,
          academic_year_id: selectedAcademicYearId,
          bulk_action: true
        })
      );

      await Promise.all(promises);
      
      alert(`Successfully sent reminder emails to ${pendingDepartments.length} departments!`);
      
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      alert('Some reminders failed to send. Please try again or send them individually.');
    }
  };

  const handleScheduleAutomaticReminders = async () => {
    if (!deadlineInfo) {
      alert('No deadline set for this academic year. Please set a deadline first.');
      return;
    }

    const reminderOptions = [
      { label: "24 hours before deadline", hours: 24 },
      { label: "12 hours before deadline", hours: 12 },
      { label: "6 hours before deadline", hours: 6 },
      { label: "3 hours before deadline", hours: 3 },
      { label: "1 hour before deadline", hours: 1 }
    ];

    const optionText = reminderOptions.map((opt, idx) => `${idx + 1}. ${opt.label}`).join('\n');
    const choice = prompt(`Schedule automatic deadline reminder emails:\n\n${optionText}\n\nEnter option number (1-5) or multiple numbers separated by commas:`);
    
    if (!choice) return;

    try {
      const selectedOptions = choice.split(',').map(num => parseInt(num.trim()));
      const validOptions = selectedOptions.filter(num => num >= 1 && num <= 5);
      
      if (validOptions.length === 0) {
        alert('Invalid selection');
        return;
      }

      const reminderTimes = validOptions.map(num => reminderOptions[num - 1].hours);
      
      await API.post('/reminder/schedule-automatic', {
        academic_year_id: selectedAcademicYearId,
        module_name: 'program_entry',
        reminder_hours_before: reminderTimes
      });

      const selectedLabels = validOptions.map(num => reminderOptions[num - 1].label).join(', ');
      alert(`Automatic reminders scheduled: ${selectedLabels}`);
      
    } catch (error) {
      console.error('Error scheduling automatic reminders:', error);
      alert('Failed to schedule automatic reminders. Please try again.');
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">Program Entry Summary</h4>
          <p className="text-muted mb-0">
            Monitor and manage program entry submissions across all departments
          </p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-danger btn-sm" 
            onClick={handleExportPDF}
            disabled={departments.length === 0}
          >
            <i className="fas fa-file-pdf"></i> Export PDF
          </button>
          <button 
            className="btn btn-outline-success btn-sm" 
            onClick={handleExportExcel}
            disabled={departments.length === 0}
          >
            <i className="fas fa-file-excel"></i> Export Excel
          </button>
        </div>
      </div>

      {/* Academic Year Selection */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body py-3">
              <label className="form-label mb-2">
                <strong><i className="fas fa-graduation-cap"></i> Academic Year:</strong>
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
          </div>
        </div>
        
        {/* Deadline Information */}
        {deadlineInfo && (
          <div className="col-md-6">
            <div className="card bg-light">
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <label className="form-label mb-1">
                      <strong><i className="fas fa-calendar-alt"></i> Submission Deadline:</strong>
                    </label>
                    <div className="text-primary fw-semibold">
                      {new Date(deadlineInfo.deadline).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="text-end">
                    <small className="text-muted">Active Extensions:</small>
                    <div className="badge bg-warning text-dark ms-1">
                      {Object.values(overrides).filter(o => o?.has_override).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Statistics Dashboard */}
      {departments.length > 0 && (
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0"><i className="fas fa-chart-pie"></i> Submission Overview</h6>
          </div>
          <div className="card-body p-3">
            <div className="row g-3">
              <div className="col-lg-2 col-md-4 col-6">
                <div className="text-center p-2 bg-success bg-opacity-10 rounded">
                  <div className="h4 mb-1 text-success">{getSummaryStats().completed || 0}</div>
                  <small className="text-success fw-semibold"><i className="fas fa-trophy"></i> Completed</small>
                </div>
              </div>
              <div className="col-lg-2 col-md-4 col-6">
                <div className="text-center p-2 bg-success bg-opacity-10 rounded">
                  <div className="h4 mb-1 text-success">{getSummaryStats().approved || 0}</div>
                  <small className="text-success fw-semibold"><i className="fas fa-check-circle"></i> Approved</small>
                </div>
              </div>
              <div className="col-lg-2 col-md-4 col-6">
                <div className="text-center p-2 bg-primary bg-opacity-10 rounded">
                  <div className="h4 mb-1 text-primary">{getSummaryStats().submitted || 0}</div>
                  <small className="text-primary fw-semibold"><i className="fas fa-paper-plane"></i> Pending</small>
                </div>
              </div>
              <div className="col-lg-2 col-md-4 col-6">
                <div className="text-center p-2 bg-info bg-opacity-10 rounded">
                  <div className="h4 mb-1 text-info">{getSummaryStats().drafting || 0}</div>
                  <small className="text-info fw-semibold"><i className="fas fa-pencil-alt"></i> In Progress</small>
                </div>
              </div>
              <div className="col-lg-2 col-md-4 col-6">
                <div className="text-center p-2 bg-danger bg-opacity-10 rounded">
                  <div className="h4 mb-1 text-danger">{getSummaryStats().deadline_missed || 0}</div>
                  <small className="text-danger fw-semibold"><i className="fas fa-clock"></i> Missed</small>
                </div>
              </div>
              <div className="col-lg-2 col-md-4 col-6">
                <div className="text-center p-2 bg-warning bg-opacity-10 rounded">
                  <div className="h4 mb-1 text-warning">{Object.values(overrides).filter(o => o?.has_override).length}</div>
                  <small className="text-warning fw-semibold"><i className="fas fa-unlock"></i> Extended</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Management Sections - Only show when there are departments */}
      {departments.length > 0 && (
        <>
          {/* Principal Deadline Management */}
          {userRole === "principal" && (
            <div className="card mb-3">
              <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                <h6 className="mb-0"><i className="fas fa-shield-alt"></i> Principal Deadline Management</h6>
                <button 
                  className="btn btn-outline-dark btn-sm"
                  onClick={() => {
                    const missedDepartments = departments.filter(dept => {
                      const statusInfo = getEnhancedStatus(dept);
                      return statusInfo.stage === 'deadline_missed';
                    });
                    if (missedDepartments.length === 0) {
                      alert('No departments have missed the deadline.');
                      return;
                    }
                    const deptNames = missedDepartments.map(d => d.name).join(', ');
                    alert(`Departments that missed deadline: ${deptNames}`);
                  }}
                >
                  <i className="fas fa-list"></i> View Missed ({getSummaryStats().deadline_missed || 0})
                </button>
              </div>
              <div className="card-body p-3">
                <div className="row mb-3">
                  <div className="col-md-12">
                    <p className="mb-2 small text-muted">
                      Manage deadline overrides and send bulk reminders to departments. 
                      Use these tools to efficiently handle multiple departments that need assistance.
                    </p>
                    <div className="d-flex gap-2 align-items-center flex-wrap mb-3">
                      <span className="badge bg-danger px-2 py-1">
                        <i className="fas fa-clock"></i> {getSummaryStats().deadline_missed || 0} Missed Deadline
                      </span>
                      <span className="badge bg-warning text-dark px-2 py-1">
                        <i className="fas fa-unlock"></i> {Object.values(overrides).filter(o => o?.has_override).length} Active Extensions
                      </span>
                      <span className="badge bg-info px-2 py-1">
                        <i className="fas fa-envelope"></i> {departments.filter(dept => {
                          const statusInfo = getEnhancedStatus(dept);
                          return ['not_started', 'drafting', 'draft_overdue', 'deadline_missed'].includes(statusInfo.stage);
                        }).length} Need Reminders
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Bulk Action Buttons */}
                <div className="border-top pt-3">
                  <h6 className="mb-2 text-muted">Quick Actions</h6>
                  <div className="d-flex gap-2 flex-wrap">
                    <button 
                      className="btn btn-warning btn-sm"
                      onClick={handleGrantOverrideToAllMissed}
                      disabled={departments.filter(dept => {
                        const statusInfo = getEnhancedStatus(dept);
                        return statusInfo.stage === 'deadline_missed' && !overrides[dept.id]?.has_override;
                      }).length === 0}
                      title="Grant deadline override to all departments that missed the deadline"
                    >
                      <i className="fas fa-unlock-alt"></i> Grant Override to All Missed 
                      <span className="badge bg-light text-dark ms-1">
                        {departments.filter(dept => {
                          const statusInfo = getEnhancedStatus(dept);
                          return statusInfo.stage === 'deadline_missed' && !overrides[dept.id]?.has_override;
                        }).length}
                      </span>
                    </button>
                    
                    <button 
                      className="btn btn-info btn-sm"
                      onClick={handleSendReminderToAllPending}
                      disabled={departments.filter(dept => {
                        const statusInfo = getEnhancedStatus(dept);
                        return ['not_started', 'drafting', 'draft_overdue', 'deadline_missed'].includes(statusInfo.stage);
                      }).length === 0}
                      title="Send reminder emails to all departments that haven't submitted"
                    >
                      <i className="fas fa-envelope-open-text"></i> Send Reminder to All Pending 
                      <span className="badge bg-light text-dark ms-1">
                        {departments.filter(dept => {
                          const statusInfo = getEnhancedStatus(dept);
                          return ['not_started', 'drafting', 'draft_overdue', 'deadline_missed'].includes(statusInfo.stage);
                        }).length}
                      </span>
                    </button>
                    
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={handleScheduleAutomaticReminders}
                      title="Schedule automatic reminder emails before deadline"
                    >
                      <i className="fas fa-clock"></i> Schedule Auto Reminders
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Automation Section for Admins/Principals */}
          {(userRole === "admin" || userRole === "principal") && deadlineInfo && (
            <div className="card mb-3">
              <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                <h6 className="mb-0"><i className="fas fa-robot"></i> Automatic Email Reminders</h6>
                <button 
                  className="btn btn-light btn-sm"
                  onClick={handleScheduleAutomaticReminders}
                  title="Configure automatic reminder schedule"
                >
                  <i className="fas fa-cog"></i> Configure
                </button>
              </div>
              <div className="card-body p-3">
                <div className="row">
                  <div className="col-md-8">
                    <p className="mb-2 small text-muted">
                      Set up automatic reminder emails that will be sent to departments before the submission deadline.
                      These reminders help ensure departments don't miss important deadlines.
                    </p>
                    <div className="small text-muted">
                      <i className="fas fa-lightbulb"></i> 
                      <strong>Tip:</strong> Automatic reminders will only be sent to departments that haven't submitted yet.
                      Set multiple reminder times (e.g., 24h, 6h, 1h before deadline) for better coverage.
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-end">
                      <small className="text-muted d-block">Next deadline in:</small>
                      <div className="fw-semibold text-primary">
                        {deadlineInfo && (() => {
                          const now = new Date();
                          const deadline = new Date(deadlineInfo.deadline);
                          const diffMs = deadline - now;
                          const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
                          
                          if (diffMs < 0) return "Deadline passed";
                          if (diffHours < 24) return `${diffHours} hours`;
                          return `${Math.ceil(diffHours / 24)} days`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* Department Status Table */}
      <div className="card">
        <div className="card-header bg-light">
          <h6 className="mb-0"><i className="fas fa-table"></i> Department Status Details</h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-dark">
                <tr>
                  <th style={{ textAlign: "center", width: "8%" }}>Sl. No</th>
                  <th style={{ width: "35%" }}>Department</th>
                  <th style={{ textAlign: "center", width: "15%" }}>Proposed Budget</th>
                  <th style={{ textAlign: "center", width: "20%" }}>Workflow Status</th>
                  <th style={{ textAlign: "center", width: "22%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept, index) => {
                  const statusInfo = getEnhancedStatus(dept);
                  return (
                    <tr key={dept.id}>
                      <td style={{ textAlign: "center" }}>{index + 1}</td>
                      <td className="fw-semibold">{dept.full_name}</td>
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
                        <div className="d-flex flex-wrap gap-1 justify-content-center">
                          {/* Reminder action */}
                          {['not_started', 'drafting', 'draft_overdue', 'deadline_missed'].includes(statusInfo.stage) && (
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => handleSendReminder(dept.id)}
                              disabled={sending[dept.id]}
                              title="Send reminder email"
                            >
                              {sending[dept.id] ? (
                                <><i className="fas fa-spinner fa-spin"></i> Sending...</>
                              ) : (
                                <><i className="fas fa-envelope"></i> Remind</>
                              )}
                            </button>
                          )}
                          
                          {/* Override actions for Principals */}
                          {userRole === "principal" && (
                            <>
                              {!overrides[dept.id]?.has_override && statusInfo.stage === 'deadline_missed' && (
                                <button
                                  className="btn btn-warning btn-sm"
                                  onClick={() => handleCreateOverride(dept.id)}
                                  title="Grant deadline override - allow submission after deadline"
                                >
                                  <i className="fas fa-unlock"></i> Grant Override
                                </button>
                              )}
                              
                              {!overrides[dept.id]?.has_override && ['not_started', 'drafting'].includes(statusInfo.stage) && deadlineInfo && new Date(deadlineInfo.deadline) < new Date() && (
                                <button
                                  className="btn btn-outline-warning btn-sm"
                                  onClick={() => handleCreateOverride(dept.id)}
                                  title="Grant deadline override - extend submission deadline"
                                >
                                  <i className="fas fa-clock-o"></i> Extend
                                </button>
                              )}
                              
                              {overrides[dept.id]?.has_override && (
                                <>
                                  <button
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => handleExtendOverride(dept.id)}
                                    title="Add more time to current override"
                                  >
                                    <i className="fas fa-plus-circle"></i> Add Time
                                  </button>
                                  <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => handleRevokeOverride(dept.id)}
                                    title="Revoke the current override"
                                  >
                                    <i className="fas fa-times-circle"></i> Revoke
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="table-warning">
                  <td></td>
                  <td className="fw-bold text-end">Total Budget</td>
                  <td className="fw-bold text-end">₹{totalBudget.toLocaleString()}</td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}export default ProgramEntrySummary;
