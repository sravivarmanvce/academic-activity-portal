// src/ProgramEntryForm.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ProgramEntryForm.css";

function ProgramEntryForm({ departmentId = 1, academicYearId = 2 }) {
  const [programTypes, setProgramTypes] = useState([]);
  const [programCounts, setProgramCounts] = useState([]);
  const [mergedData, setMergedData] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [departmentName, setDepartmentName] = useState("");

  useEffect(() => {
    if (!departmentId || !academicYearId) return;

    const fetchData = async () => {
      try {
        // Fetch department name from ID
        const deptRes = await axios.get("http://127.0.0.1:8000/departments");
        const dept = deptRes.data.find((d) => d.id === departmentId);
        const deptName = dept?.name || "";
        setDepartmentName(deptName);

        // Fetch program types and counts
        const [typesRes, countsRes] = await Promise.all([
          axios.get("http://127.0.0.1:8000/program-types"),
          axios.get(
            `http://127.0.0.1:8000/program-counts?department_id=${departmentId}&academic_year_id=${academicYearId}`
          ),
        ]);

        // Filter program types based on department
        const filteredProgramTypes = typesRes.data.filter((p) => {
          const allowed = p.departments
            .split(",")
            .map((d) => d.trim().toLowerCase());
          return allowed.includes("all") || allowed.includes(deptName.toLowerCase());
        });

        const programCounts = countsRes.data;

        // Merge with saved data
        const merged = filteredProgramTypes.map((type) => {
          const match = programCounts.find(
            (c) =>
              c.program_type === type.program_type &&
              c.sub_program_type === type.sub_program_type
          );

          return {
            ...type,
            count: match?.count || 0,
            total_budget: match?.total_budget || 0,
            remarks: match?.remarks || "",
          };
        });

        setProgramTypes(filteredProgramTypes);
        setProgramCounts(programCounts);
        setMergedData(merged);

        // Group by category
        const grouped = {};
        merged.forEach((item) => {
          if (!grouped[item.activity_category]) {
            grouped[item.activity_category] = [];
          }
          grouped[item.activity_category].push(item);
        });
        setGrouped(grouped);
      } catch (error) {
        console.error("Error loading program data", error);
      }
    };

    fetchData();
  }, [departmentId, academicYearId]);

  return (
    <div className="container mt-4">
      <h3>Program Entry Form (HoD)</h3>
      <p><strong>Department:</strong> {departmentName}</p>
      <table className="table table-bordered table-striped">
        <thead className="table-dark">
          <tr>
            <th>Activity Category</th>
            <th>Program Type</th>
            <th>Sub Type</th>
            <th>Budget Mode</th>
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
            Object.entries(grouped).map(([category, items]) => (
              <React.Fragment key={category}>
                {items.map((item, index) => (
                  <tr key={item.program_type + (item.sub_program_type || "")}>
                    {index === 0 && (
                      <td rowSpan={items.length}>{category}</td>
                    )}
                    <td>{item.program_type}</td>
                    <td>{item.sub_program_type || "-"}</td>
                    <td>{item.budget_mode}</td>
                    <td>{item.count}</td>
                    <td>{item.total_budget}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProgramEntryForm;
