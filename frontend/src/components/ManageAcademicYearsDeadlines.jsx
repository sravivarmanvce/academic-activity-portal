// src/components/ManageAcademicYearsDeadlines.jsx
import React, { useEffect, useState } from "react";
import Datetime from "react-datetime";
import "react-datetime/css/react-datetime.css";
import API from "../Api";
import { Tabs, Tab } from "react-bootstrap";
import moment from "moment";
import "../App.css";

const moduleDisplayNames = {
  program_entry: "Budget Proposal for Student Activities",
  // Add other module keys and readable names here
};

const ManageAcademicYears = ({ userRole }) => {
  const [academicYears, setAcademicYears] = useState([]);
  const [deadlines, setDeadlines] = useState({});
  const [tempDeadlines, setTempDeadlines] = useState({});
  const [editingDeadlines, setEditingDeadlines] = useState({});
  const [loading, setLoading] = useState(true);
  const [newYear, setNewYear] = useState("");

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/academic-years");
      setAcademicYears(res.data);
      for (const year of res.data) {
        fetchDeadlines(year.id);
      }
    } catch (err) {
      console.error("Failed to fetch academic years", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeadlines = async (yearId) => {
    try {
      const res = await API.get(`/module-deadlines/${yearId}`);
      setDeadlines((prev) => ({
        ...prev,
        [yearId]: res.data,
      }));
    } catch (err) {
      console.error(`Failed to fetch deadlines for year ${yearId}`, err);
    }
  };

  const updateDeadline = async (yearId, module, newDeadline) => {
    try {
      await API.post("/module-deadlines", {
        academic_year_id: yearId,
        module,
        deadline: newDeadline,
      });
      fetchDeadlines(yearId); // refresh
    } catch (err) {
      console.error("Failed to update deadline", err);
    }
  };

  const toggleEnabled = async (yearId, isEnabled) => {
    try {
      await API.patch(`/api/academic-years/${yearId}`, {
        is_enabled: !isEnabled,
      });
      fetchAcademicYears();
    } catch (err) {
      console.error("Failed to toggle academic year", err);
    }
  };

  const initializeDefaultDeadlines = async (yearId) => {
    const defaultModules = [
      "program_entry", // Budget Proposal for Student Activities
      // Add other default modules here if needed
    ];
    
    const defaultDeadline = moment().add(6, 'months').toISOString();
    
    for (const module of defaultModules) {
      try {
        await API.post("/module-deadlines", {
          academic_year_id: yearId,
          module: module,
          deadline: defaultDeadline,
        });
        console.log(`Initialized default deadline for module: ${module} in year: ${yearId}`);
      } catch (moduleErr) {
        console.error(`Failed to initialize default deadline for module ${module}`, moduleErr);
      }
    }
    
    // Refresh deadlines for this year
    fetchDeadlines(yearId);
  };

  const addAcademicYear = async () => {
    if (!newYear.trim()) return;
    try {
      // Create the academic year
      const response = await API.post("/api/academic-years", {
        year: newYear,
        is_enabled: true,
      });
      
      const newYearId = response.data.id;
      console.log(`Created new academic year with ID: ${newYearId}`);
      
      // Create default module deadlines for the new academic year
      const defaultModules = [
        "program_entry", // Budget Proposal for Student Activities
        // Add other default modules here if needed
      ];
      
      // Create default deadline (e.g., end of the academic year)
      const defaultDeadline = moment().add(6, 'months').toISOString(); // 6 months from now as default
      
      // Create module deadlines for each default module
      for (const module of defaultModules) {
        try {
          console.log(`Creating default deadline for module: ${module}`);
          await API.post("/module-deadlines", {
            academic_year_id: newYearId,
            module: module,
            deadline: defaultDeadline,
          });
          console.log(`Successfully created deadline for module: ${module}`);
        } catch (moduleErr) {
          console.error(`Failed to create default deadline for module ${module}`, moduleErr);
        }
      }
      
      setNewYear("");
      fetchAcademicYears(); // This will also fetch deadlines for all years including the new one
    } catch (err) {
      console.error("Failed to add academic year", err);
      alert("Failed to add academic year. Please try again.");
    }
  };

  const toggleEnableYear = async (id) => {
    try {
      await API.patch(`/api/academic-years/${id}/toggle`);
      fetchAcademicYears();
    } catch (err) {
      console.error("Failed to toggle academic year", err);
    }
  };

  const deleteAcademicYear = async (id) => {
    if (!window.confirm("Are you sure you want to delete this academic year?")) return;
    try {
      await API.delete(`/api/academic-years/${id}`);
      fetchAcademicYears();
    } catch (err) {
      console.error("Failed to delete academic year", err);
      if (err.response?.status === 400) {
        alert(err.response.data.detail);
      } else {
        alert("Failed to delete academic year.");
      }
    }
  };

  const isPast = (date) => moment(date).isBefore(moment());

  if (loading) return <p>Loading academic years...</p>;

  const enabledYears = academicYears.filter((y) => y.is_enabled);

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Manage Academic Years & Deadlines</h2>

      <div className="mb-4">
        <h5 className="mb-3">Academic Years</h5>
        <div className="table-responsive">
          <table className="table table-bordered table-striped table-hover align-middle shadow-sm">
            <thead className="table-light">
              <tr>
                <th style={{ width: "40%" }}>Academic Year</th>
                <th style={{ width: "20%" }}>Status</th>
                <th style={{ width: "40%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Add new year row */}
              <tr>
                <td>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="form-control"
                    placeholder="e.g. 2025–2026"
                  />
                </td>
                <td>
                  <span className="badge bg-success px-3 py-2">Enabled</span>
                </td>
                <td>
                  <button className="btn btn-primary btn-sm" onClick={addAcademicYear}>
                    Add
                  </button>
                </td>
              </tr>

              {/* Existing academic years */}
              {academicYears.map((year) => (
                <tr key={year.id}>
                  <td className="fw-semibold">{year.year}</td>
                  <td>
                    <span className={`badge px-3 py-2 ${year.is_enabled ? "bg-success" : "bg-secondary"}`}>
                      {year.is_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className={`btn btn-sm ${year.is_enabled ? "btn-outline-danger" : "btn-outline-success"}`}
                        onClick={() => toggleEnableYear(year.id)}
                      >
                        {year.is_enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteAcademicYear(year.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Tabs */}
      <h5 className="mb-3">Module Deadlines</h5>
      <Tabs defaultActiveKey={enabledYears[0]?.id} id="academic-year-tabs" variant="pills" className="mb-3 custom-tabs-scroll">
        {enabledYears.map((year) => (
          <Tab eventKey={year.id} title={year.year} key={year.id}>

            <div className="card p-3">
              {(deadlines[year.id] || []).length === 0 ? (
                // Show message and initialize button when no deadlines exist
                <div className="text-center py-4">
                  <p className="text-muted mb-3">No module deadlines found for this academic year.</p>
                  {(userRole === "admin" || userRole === "principal") && (
                    <button 
                      className="btn btn-primary" 
                      onClick={() => initializeDefaultDeadlines(year.id)}
                    >
                      Initialize Default Deadlines
                    </button>
                  )}
                </div>
              ) : (
                // Show existing deadlines
                (deadlines[year.id] || []).map((dl) => {
                  const deadlinePassed = isPast(dl.deadline);
                  const canEdit = userRole === "admin" || userRole === "principal";

                  const fieldKey = `${year.id}_${dl.module}`;
                  const isEditing = editingDeadlines[fieldKey] || false;
                  const tempDate = tempDeadlines[fieldKey] || moment(dl.deadline);

                  return (
                    <div key={dl.module} className="mb-3 d-flex align-items-center gap-3 flex-wrap">
                      <label className="mb-0 fw-semibold" style={{ minWidth: "160px" }}>
                        {moduleDisplayNames[dl.module] || dl.module} Deadline:
                      </label>

                      <div style={{ minWidth: "250px" }}>
                        <Datetime
                          value={tempDate}
                          onChange={(date) => {
                            if (isEditing) {
                              setTempDeadlines((prev) => ({ ...prev, [fieldKey]: date }));
                            }
                          }}
                          inputProps={{
                            className: `form-control ${deadlinePassed ? "border-danger text-danger" : ""}`,
                            disabled: !isEditing,
                          }}
                        />
                      </div>

                      {!isEditing && canEdit && (
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => {
                            setEditingDeadlines((prev) => ({ ...prev, [fieldKey]: true }));
                            setTempDeadlines((prev) => ({ ...prev, [fieldKey]: moment(dl.deadline) }));
                          }}
                        >
                          Edit
                        </button>
                      )}

                      {isEditing && (
                        <>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => {
                              updateDeadline(year.id, dl.module, tempDate.toISOString());
                              setEditingDeadlines((prev) => ({ ...prev, [fieldKey]: false }));
                            }}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingDeadlines((prev) => ({ ...prev, [fieldKey]: false }));
                              setTempDeadlines((prev) => ({ ...prev, [fieldKey]: moment(dl.deadline) }));
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {!canEdit && deadlinePassed && (
                        <small className="text-danger">Deadline has passed. Only Principal can extend.</small>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Tab>
        ))}
      </Tabs>
      <div style={{ height: "100px" }}></div>
    </div>
  );
};

export default ManageAcademicYears;
