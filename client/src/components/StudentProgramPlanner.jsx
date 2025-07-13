import React, { useEffect, useState } from 'react';
import './StudentProgramPlanner.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function StudentProgramPlanner() {
  const [programs, setPrograms] = useState([]);
  const [formData, setFormData] = useState({});
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const [loading, setLoading] = useState(false);

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

        // Prefill all entries with count = 0
        const initialData = {};
        normalized.forEach(item => {
          const key = item.programType + (item.subProgramType || '');
          initialData[key] = { count: 0, totalBudget: 0, remarks: '' };
        });
        setFormData(initialData);
      });
  }, []);

  const handleChange = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === 'remarks' ? value : Number(value)
      }
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

  const handleSubmit = async () => {
    setLoading(true);
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
        remarks: entry.remarks || '',
      };
    });

    try {
      const res = await fetch('/api/program-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionArray),
      });

      if (res.ok) {
        setSubmissionStatus('success');
        setShowDownloads(true);
      } else {
        throw new Error();
      }
    } catch {
      setSubmissionStatus('error');
    }
    setLoading(false);
  };

  const grouped = programs.reduce((acc, item) => {
    if (!acc[item.activityCategory]) acc[item.activityCategory] = [];
    acc[item.activityCategory].push(item);
    return acc;
  }, {});

  const renderTableRows = () => {
    const rows = [];
    Object.entries(grouped).forEach(([category, items]) => {
      let firstRow = true;
      let categoryTotal = 0;
      let categoryCount = 0;

      items.forEach(item => {
        const key = item.programType + (item.subProgramType || '');
        const entry = formData[key] || {};
        const count = entry.count || 0;
        const total = calculateTotal(key, item);

        categoryTotal += total;
        categoryCount += count;

        const isSub = item.subProgramType !== null;

        rows.push(
          <tr key={key}>
            {firstRow && (
              <td rowSpan={items.length} className="category-cell">
                {category}
              </td>
            )}
            <td className={isSub ? 'sub-program' : ''}>
              {isSub ? item.subProgramType : item.programType}
            </td>
            <td className="center">
              <input
                type="number"
                min="0"
                value={entry.count ?? 0}
                onChange={(e) => handleChange(key, 'count', e.target.value)}
              />
            </td>
            <td className="right">
              {item.budgetMode === 'Variable' ? (
                <input
                  type="number"
                  min="0"
                  value={entry.totalBudget ?? 0}
                  onChange={(e) => handleChange(key, 'totalBudget', e.target.value)}
                />
              ) : (
                item.budgetPerEvent.toLocaleString()
              )}
            </td>
            <td className="right">{total.toLocaleString()}</td>
            <td>
              <input
                type="text"
                value={entry.remarks || ''}
                onChange={(e) => handleChange(key, 'remarks', e.target.value)}
              />
            </td>
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
          <td></td>
        </tr>
      );
    });

    const grandCount = Object.keys(formData).reduce((sum, key) => sum + (formData[key]?.count || 0), 0);
    const grandTotal = Object.keys(formData).reduce((sum, key) => {
      const item = programs.find(p => p.programType + (p.subProgramType || '') === key);
      return sum + (item ? calculateTotal(key, item) : 0);
    }, 0);

    rows.push(
      <tr key="grand-total" className="bold highlight">
        <td colSpan={2} align="right">Grand Total</td>
        <td className="center">{grandCount}</td>
        <td></td>
        <td className="right">{grandTotal.toLocaleString()}</td>
        <td></td>
      </tr>
    );

    return rows;
  };

  const downloadExcel = () => {
    const headers = ["Activity Category", "Program Type", "Count", "Budget Per Event", "Total Budget", "Remarks"];
    const data = [];

    Object.entries(grouped).forEach(([category, items]) => {
      let categoryCount = 0;
      let categoryTotal = 0;
      items.forEach(item => {
        const key = item.programType + (item.subProgramType || '');
        const entry = formData[key] || {};
        const count = entry.count || 0;
        const total = calculateTotal(key, item);
        categoryCount += count;
        categoryTotal += total;

        data.push([
          category,
          item.subProgramType || item.programType,
          count,
          item.budgetMode === 'Variable' ? '' : item.budgetPerEvent,
          total,
          entry.remarks || ''
        ]);
      });
      data.push([`Total for ${category}`, "", categoryCount, "", categoryTotal, ""]);
    });

    const grandCount = Object.values(formData).reduce((sum, entry) => sum + (entry.count || 0), 0);
    const grandTotal = Object.keys(formData).reduce((sum, key) => {
      const item = programs.find(p => p.programType + (p.subProgramType || '') === key);
      return sum + (item ? calculateTotal(key, item) : 0);
    }, 0);

    data.push(["Grand Total", "", grandCount, "", grandTotal, ""]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'Student Programs');
    XLSX.writeFile(wb, 'Student_Program_Planner.xlsx');
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const tableData = [];

    Object.entries(grouped).forEach(([category, items]) => {
      let categoryCount = 0;
      let categoryTotal = 0;

      items.forEach(item => {
        const key = item.programType + (item.subProgramType || '');
        const entry = formData[key] || {};
        const count = entry.count || 0;
        const total = calculateTotal(key, item);
        categoryCount += count;
        categoryTotal += total;

        tableData.push([
          category,
          item.subProgramType || item.programType,
          count,
          item.budgetMode === 'Variable' ? '' : item.budgetPerEvent,
          total,
          entry.remarks || ''
        ]);
      });

      tableData.push([`Total for ${category}`, "", categoryCount, "", categoryTotal, ""]);
    });

    const grandCount = Object.values(formData).reduce((sum, entry) => sum + (entry.count || 0), 0);
    const grandTotal = Object.keys(formData).reduce((sum, key) => {
      const item = programs.find(p => p.programType + (p.subProgramType || '') === key);
      return sum + (item ? calculateTotal(key, item) : 0);
    }, 0);
    tableData.push(["Grand Total", "", grandCount, "", grandTotal, ""]);

    doc.text('Student Program Planner', 14, 15);
    doc.autoTable({
      head: [["Category", "Program Type", "Count", "Budget Per Event", "Total Budget", "Remarks"]],
      body: tableData,
      startY: 20
    });

    doc.save('Student_Program_Planner.pdf');
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
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>{renderTableRows()}</tbody>
      </table>

      <div className="submit-button-container">
        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </div>

      {submissionStatus === 'success' && (
        <div className="modal success-modal">
          ✅ Submission Successful!
          <button className="close-btn" onClick={() => setSubmissionStatus(null)}>Close</button>
        </div>
      )}

      {submissionStatus === 'error' && (
        <div className="modal error-modal">
          ❌ Submission Failed. Try Again.
          <button className="close-btn" onClick={() => setSubmissionStatus(null)}>Close</button>
        </div>
      )}

      {showDownloads && (
        <div className="download-buttons">
          <button onClick={downloadExcel}>⬇️ Download Excel</button>
          <button onClick={downloadPDF}>⬇️ Download PDF</button>
        </div>
      )}
    </div>
  );
}

export default StudentProgramPlanner;
