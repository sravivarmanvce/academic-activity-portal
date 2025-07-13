import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import './StudentProgramPlanner.css';

function StudentProgramPlanner() {
  const [programs, setPrograms] = useState([]);
  const [formData, setFormData] = useState({});
  const [remarks, setRemarks] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/programs')
      .then((res) => res.json())
      .then((data) => {
        const normalized = data.map((item) => ({
          activityCategory: item['Activity Category'],
          programType: item['Program Type'],
          subProgramType: item['Sub-Program Type'],
          departments: item['Departments'],
          budgetMode: item['Budget Mode'],
          budgetPerEvent: item['Budget Per Event ₹'] || 0,
        }));
        setPrograms(normalized);

        // Initialize form data with count = 0
        const initial = {};
        normalized.forEach((item) => {
          const key = item.programType + (item.subProgramType || '');
          initial[key] = { count: 0 };
        });
        setFormData(initial);
      });
  }, []);

  const handleChange = (key, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === 'remarks' ? value : Number(value),
      },
    }));
  };

  const calculateTotal = (key, item) => {
    const entry = formData[key] || {};
    if (item.budgetMode === 'Fixed') {
      return (entry.count || 0) * (item.budgetPerEvent || 0);
    } else {
      return entry.totalBudget || 0;
    }
  };

  const grouped = programs.reduce((acc, item) => {
    if (!acc[item.activityCategory]) acc[item.activityCategory] = [];
    acc[item.activityCategory].push(item);
    return acc;
  }, {});

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionStatus(null);

    const invalidEntry = programs.find((item) => {
      const key = item.programType + (item.subProgramType || '');
      const entry = formData[key] || {};
      return (
        item.budgetMode === 'Variable' &&
        (
          (entry.count > 0 && !entry.totalBudget) ||
          (entry.totalBudget > 0 && !entry.count)
        )
      );
    });

    if (invalidEntry) {
      alert(`Please ensure both count and total amount are filled for: ${invalidEntry.programType}${invalidEntry.subProgramType ? ' - ' + invalidEntry.subProgramType : ''}`);
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
        body: JSON.stringify({ data: submissionArray, remarks }),
      });

      if (res.ok) {
        setSubmissionStatus('success');
        setShowModal(true);
        setIsSubmitted(true);
      } else {
        throw new Error();
      }
    } catch {
      setSubmissionStatus('error');
      setShowModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [['Activity Category', 'Program Type', 'Count', 'Budget Per Event ₹', 'Total Budget ₹']];
    let grandTotal = 0;
    let grandCount = 0;

    Object.entries(grouped).forEach(([category, items]) => {
      let catCount = 0;
      let catTotal = 0;
      items.forEach((item) => {
        const key = item.programType + (item.subProgramType || '');
        const entry = formData[key] || { count: 0 };
        const total = calculateTotal(key, item);
        wsData.push([
          category,
          item.subProgramType ? `${item.programType} → ${item.subProgramType}` : item.programType,
          entry.count || 0,
          item.budgetMode === 'Fixed' ? item.budgetPerEvent : '',
          total
        ]);
        catCount += entry.count || 0;
        catTotal += total;
        grandCount += entry.count || 0;
        grandTotal += total;
      });

      wsData.push([`Total for ${category}`, '', catCount, '', catTotal]);
    });

    wsData.push(['Grand Total', '', grandCount, '', grandTotal]);
    wsData.push(['Remarks:', remarks]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Student Program Plan');
    XLSX.writeFile(wb, 'StudentProgramPlannerExport.xlsx');
  };

  const renderTableRows = () => {
    const rows = [];
    let grandTotal = 0;
    let grandCount = 0;

    Object.entries(grouped).forEach(([category, items]) => {
      let categoryTotal = 0;
      let categoryCount = 0;
      let firstRow = true;

      items.forEach((item) => {
        const key = item.programType + (item.subProgramType || '');
        const entry = formData[key] || {};
        const count = entry.count || 0;
        const total = calculateTotal(key, item);
        categoryTotal += total;
        categoryCount += count;
        grandTotal += total;
        grandCount += count;

        const isSub = item.subProgramType !== null;

        rows.push(
          <tr key={key}>
            {firstRow ? (
              <td rowSpan={items.length} className="category-cell">{category}</td>
            ) : null}
            <td className={isSub ? 'sub-program' : ''}>
              {isSub ? item.subProgramType : item.programType}
            </td>
            <td className="center">
              <input
                type="number"
                min="0"
                value={entry.count}
                onChange={(e) => handleChange(key, 'count', e.target.value)}
              />
            </td>
            <td className="right">
              {item.budgetMode === 'Variable' ? (
                <input
                  type="number"
                  min="0"
                  value={entry.totalBudget || ''}
                  onChange={(e) => handleChange(key, 'totalBudget', e.target.value)}
                />
              ) : item.budgetPerEvent.toLocaleString()}
            </td>
            <td className="right">{total.toLocaleString()}</td>
          </tr>
        );

        firstRow = false;
      });

      rows.push(
        <tr key={category + '-total'} className="bold highlight">
          <td colSpan={2} align="right">Total for {category}</td>
          <td className="center">{categoryCount}</td>
          <td></td>
          <td className="right">{categoryTotal.toLocaleString()}</td>
        </tr>
      );
    });

    rows.push(
      <tr key="grand-total" className="bold highlight">
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
		  <label htmlFor="remarks">Remarks:</label>
		  <textarea
			id="remarks"
			value={remarks}
			onChange={(e) => setRemarks(e.target.value)}
			rows={3}
			className="editable-remarks"
		  />
		  <div className="print-remarks">{remarks}</div>
		</div>


      <div className="submit-button-container">
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>
              {submissionStatus === 'success'
                ? '✅ Submission Successful'
                : '❌ Submission Failed'}
            </h3>
            <button onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}

      {isSubmitted && (
        <div className="submit-button-container">
          <button className="submit-btn" onClick={() => window.print()}>
            🖨️ Print / Save as PDF
          </button>
          <button className="submit-btn" onClick={downloadExcel}>
            📥 Download Excel
          </button>
        </div>
      )}
    </div>
  );
}

export default StudentProgramPlanner;
