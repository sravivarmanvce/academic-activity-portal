import React, { useEffect, useState } from 'react';
import './StudentProgramPlanner.css';
import * as XLSX from 'xlsx';

function StudentProgramPlanner() {
  const [programs, setPrograms] = useState([]);
  const [formData, setFormData] = useState({});
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditable, setIsEditable] = useState(true);

  const [academicYear, setAcademicYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [department, setDepartment] = useState('');
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false);

  useEffect(() => {
    fetch('/api/user-info')
      .then((res) => res.json())
      .then((user) => {
        setDepartment(user.department || '');
        return fetch('/api/academic-years');
      })
      .then((res) => res.json())
      .then((years) => {
        setAvailableYears(years);
      });
  }, []);

  useEffect(() => {
    if (department && academicYear) {
      fetch(`/api/programs?dept=${department}`)
        .then((res) => res.json())
        .then((data) => {
          const normalized = data.map((item) => ({
            activityCategory: item['Activity Category'],
            programType: item['Program Type'],
            subProgramType: item['Sub-Program Type'],
            budgetMode: item['Budget Mode'],
            budgetPerEvent: item['Budget Per Event ₹'] || 0,
          }));
          setPrograms(normalized);

          const initial = {};
          normalized.forEach((item) => {
            const key = item.programType + (item.subProgramType || '');
            initial[key] = { count: 0 };
          });
          setFormData(initial);
        });

      fetch(`/api/submission-status?dept=${department}&year=${academicYear}`)
        .then((res) => res.json())
        .then((data) => {
          setIsSubmitted(data.isSubmitted);
          setHasSubmittedBefore(data.isSubmitted);
          setIsEditable(data.canEdit);
          if (data.savedData) {
            const savedForm = {};
            data.savedData.forEach((entry) => {
              const key = entry.programType + (entry.subProgramType || '');
              savedForm[key] = {
                count: entry.count || 0,
                totalBudget: entry.totalBudget || 0,
              };
            });
            setFormData(savedForm);
            setRemarks(data.remarks || '');
          }
        });
    }
  }, [department, academicYear]);

  const handleChange = (key, field, value) => {
    if (!isEditable) return;
    setFormData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: Number(value),
      },
    }));
  };

  const calculateTotal = (key, item) => {
    const entry = formData[key] || {};
    return item.budgetMode === 'Fixed'
      ? (entry.count || 0) * (item.budgetPerEvent || 0)
      : entry.totalBudget || 0;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionStatus(null);

    const invalid = programs.find((item) => {
      const key = item.programType + (item.subProgramType || '');
      const entry = formData[key] || {};
      return (
        item.budgetMode === 'Variable' &&
        ((entry.count > 0 && !entry.totalBudget) ||
         (entry.totalBudget > 0 && !entry.count))
      );
    });

    if (invalid) {
      alert(`Fill both count and amount for: ${invalid.programType}${invalid.subProgramType ? ' - ' + invalid.subProgramType : ''}`);
      setIsSubmitting(false);
      return;
    }

    const submissionArray = programs.map((item) => {
      const key = item.programType + (item.subProgramType || '');
      const entry = formData[key] || {};
      return {
        programType: item.programType,
        subProgramType: item.subProgramType,
        activityCategory: item.activityCategory,
        budgetMode: item.budgetMode,
        count: entry.count || 0,
        totalBudget: calculateTotal(key, item),
      };
    });

    try {
      const res = await fetch('/api/program-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department,
          academicYear,
          data: submissionArray,
          remarks,
        }),
      });

      if (res.ok) {
        setSubmissionStatus('success');
        setShowModal(true);
        setIsSubmitted(true);
        setIsEditable(false);
      } else throw new Error();
    } catch {
      setSubmissionStatus('error');
      setShowModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const grouped = programs.reduce((acc, item) => {
    if (!acc[item.activityCategory]) acc[item.activityCategory] = [];
    acc[item.activityCategory].push(item);
    return acc;
  }, {});

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [['Activity Category', 'Program Type', 'Count', 'Budget Per Event ₹', 'Total Budget ₹']];
    let grandTotal = 0, grandCount = 0;

    Object.entries(grouped).forEach(([category, items]) => {
      let catTotal = 0, catCount = 0;

      items.forEach((item) => {
        const key = item.programType + (item.subProgramType || '');
        const entry = formData[key] || {};
        const count = entry.count || 0;
        const total = calculateTotal(key, item);
        const name = item.subProgramType || item.programType;

        wsData.push([category, name, count, item.budgetMode === 'Fixed' ? item.budgetPerEvent : '', total]);

        catTotal += total;
        catCount += count;
        grandTotal += total;
        grandCount += count;
      });

      wsData.push([`Total for ${category}`, '', catCount, '', catTotal]);
    });

    wsData.push(['Grand Total', '', grandCount, '', grandTotal]);
    wsData.push(['Remarks', '', '', '', remarks]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Program Data');
    XLSX.writeFile(wb, `StudentProgramPlanner_${academicYear}_${department}.xlsx`);
  };

  const renderTableRows = () => {
    const rows = [];
    let grandTotal = 0, grandCount = 0;

    Object.entries(grouped).forEach(([category, items]) => {
      let catTotal = 0, catCount = 0;
      let first = true;

      items.forEach((item) => {
        const key = item.programType + (item.subProgramType || '');
        const entry = formData[key] || {};
        const count = entry.count || 0;
        const total = calculateTotal(key, item);
        catTotal += total;
        catCount += count;
        grandTotal += total;
        grandCount += count;

        rows.push(
          <tr key={key}>
            {first && (
              <td rowSpan={items.length} className="category-cell">{category}</td>
            )}
            <td className={item.subProgramType ? 'sub-program' : ''}>
              {item.subProgramType || item.programType}
            </td>
            <td className="center">
              <input
                type="number"
                min="0"
                value={entry.count}
                onChange={(e) => handleChange(key, 'count', e.target.value)}
                disabled={!isEditable}
              />
            </td>
            <td className="right">
              {item.budgetMode === 'Variable' ? (
                <input
                  type="number"
                  min="0"
                  value={entry.totalBudget || ''}
                  onChange={(e) => handleChange(key, 'totalBudget', e.target.value)}
                  disabled={!isEditable}
                />
              ) : (
                item.budgetPerEvent.toLocaleString()
              )}
            </td>
            <td className="right">{total.toLocaleString()}</td>
          </tr>
        );
        first = false;
      });

      rows.push(
        <tr key={`${category}-total`} className="highlight bold">
          <td colSpan={2} align="right">Total for {category}</td>
          <td className="center">{catCount}</td>
          <td></td>
          <td className="right">{catTotal.toLocaleString()}</td>
        </tr>
      );
    });

    rows.push(
      <tr key="grand-total" className="highlight bold">
        <td colSpan={2} align="right">Grand Total</td>
        <td className="center">{grandCount}</td>
        <td></td>
        <td className="right">{grandTotal.toLocaleString()}</td>
      </tr>
    );

    return rows;
  };

  return (
    <div className="planner">
      <h2>🎓 Student Program Planner</h2>

      <div className="filters">
        <label><strong>Department:</strong> {department}</label>
        <label><strong>Academic Year:</strong>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            <option value="">Select</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
      </div>

      {programs.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th>Activity Category</th>
                <th>Program Type</th>
                <th className="center">Count</th>
                <th>Budget Per Event ₹</th>
                <th>Total Budget ₹</th>
              </tr>
            </thead>
            <tbody>{renderTableRows()}</tbody>
          </table>

          <div className="remarks-container">
            <label>Remarks:</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} disabled={!isEditable} />
          </div>

          <div className="submit-button-container">
            {isEditable && (
              <button className="submit-btn" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : hasSubmittedBefore ? 'Update' : 'Submit'}
              </button>
            )}

            {isSubmitted && (
              <>
                <button className="submit-btn" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
                <button className="submit-btn" onClick={downloadExcel}>📥 Download Excel</button>
              </>
            )}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{submissionStatus === 'success' ? '✅ Submission Successful' : '❌ Submission Failed'}</h3>
            <button onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProgramPlanner;
