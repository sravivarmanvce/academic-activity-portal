// src/components/ManageAcademicYearsDeadlines.jsx
import React, { useEffect, useState } from "react";
import Datetime from "react-datetime";
import "react-datetime/css/react-datetime.css";
import API from "../Api";
import { Tabs, Tab } from "react-bootstrap";
import moment from "moment";

const ManageAcademicYears = ({ userRole }) => {
  const [academicYears, setAcademicYears] = useState([]);
  const [deadlines, setDeadlines] = useState({});
  const [loading, setLoading] = useState(true);
  const [newYear, setNewYear] = useState("");

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    setLoading(true);
    try {
      const res = await API.get("/academic-years");
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
      await API.patch(`/academic-years/${yearId}`, {
        is_enabled: !isEnabled,
      });
      fetchAcademicYears();
    } catch (err) {
      console.error("Failed to toggle academic year", err);
    }
  };

  const addAcademicYear = async () => {
    if (!newYear.trim()) return;
    try {
      await API.post("/academic-years", {
        year: newYear,
        is_enabled: true,
      });
      setNewYear("");
      fetchAcademicYears();
    } catch (err) {
      console.error("Failed to add academic year", err);
    }
  };

  const isPast = (date) => moment(date).isBefore(moment());

  if (loading) return <p>Loading academic years...</p>;

  const enabledYears = academicYears.filter((y) => y.is_enabled);

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Manage Academic Years & Deadlines</h2>

      {/* Add New Academic Year */}
      <div className="mb-4">
        <label>Add New Academic Year:</label>
        <div className="input-group">
          <input
            type="text"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            className="form-control"
            placeholder="e.g. 2025–2026"
          />
          <button className="btn btn-primary" onClick={addAcademicYear}>
            Add
          </button>
        </div>
      </div>

      {/* Tabs for each enabled year */}
      <Tabs defaultActiveKey={enabledYears[0]?.id} id="academic-year-tabs" className="mb-3">
        {enabledYears.map((year) => (
          <Tab eventKey={year.id} title={year.year} key={year.id}>
            <div className="mb-3 d-flex justify-content-between">
              <h5>Module Deadlines</h5>
              <button
                className={`btn btn-sm ${
                  year.is_enabled ? "btn-success" : "btn-outline-secondary"
                }`}
                onClick={() => toggleEnabled(year.id, year.is_enabled)}
              >
                {year.is_enabled ? "Enabled" : "Enable"}
              </button>
            </div>
            <div className="card p-3">
              {(deadlines[year.id] || []).map((dl) => {
                const deadlinePassed = isPast(dl.deadline);
                const canEdit = !deadlinePassed || userRole === "principal" || userRole === "admin";

                return (
                  <div key={dl.module} className="mb-3">
                    <label>
                      <strong>{dl.module} Deadline:</strong>
                    </label>
                    <Datetime
                      value={moment(dl.deadline)}
                      onChange={(date) =>
                        canEdit && updateDeadline(year.id, dl.module, date.toISOString())
                      }
                      inputProps={{
                        className: `form-control ${deadlinePassed ? "border-danger text-danger" : ""}`,
                        disabled: !canEdit,
                      }}
                    />
                    {deadlinePassed && !canEdit && (
                      <small className="text-danger">Deadline has passed. Only Principal can extend.</small>
                    )}
                  </div>
                );
              })}
            </div>
          </Tab>
        ))}
      </Tabs>
    </div>
  );
};

export default ManageAcademicYears;
