// src/components/ManageAcademicYearsDeadlines.jsx
import React, { useEffect, useState } from "react";
import Datetime from "react-datetime";
import "react-datetime/css/react-datetime.css";
import API from "../Api";

const ManageAcademicYears = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [deadlines, setDeadlines] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
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

  if (loading) return <p>Loading academic years...</p>;

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Manage Academic Years & Deadlines</h2>
      {academicYears.map((year) => (
        <div key={year.id} className="card mb-3">
          <div className="card-header d-flex justify-content-between">
            <strong>{year.year}</strong>
            <button
              className={`btn btn-sm ${year.is_enabled ? "btn-success" : "btn-outline-secondary"}`}
              onClick={() => toggleEnabled(year.id, year.is_enabled)}
            >
              {year.is_enabled ? "Enabled" : "Enable"}
            </button>
          </div>
          <div className="card-body">
            {(deadlines[year.id] || []).map((dl) => (
              <div key={dl.module} className="mb-3">
                <label><strong>{dl.module} Deadline:</strong></label>
                <Datetime
                  value={dl.deadline}
                  onChange={(date) =>
                    updateDeadline(year.id, dl.module, date.toISOString())
                  }
                  inputProps={{ placeholder: "Set deadline" }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ManageAcademicYears;
