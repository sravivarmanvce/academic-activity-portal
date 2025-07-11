import React, { useEffect, useState } from 'react';
import programsData from '../data/programs.json';
import deptMap from '../data/departmentMapping.json';

const StudentProgramPlanner = () => {
  const [email, setEmail] = useState('hod.cse@college.edu'); // You can later make this dynamic
  const [academicYear, setAcademicYear] = useState('2024–2025');
  const [formData, setFormData] = useState({});
  const [visiblePrograms, setVisiblePrograms] = useState([]);

  useEffect(() => {
    console.log("✅ StudentProgramPlanner loaded");
    const dept = getDeptFromEmail(email);
    const allowed = deptMap[dept] || [];

    const filtered = programsData.filter(p => allowed.includes(p.programType));
    setVisiblePrograms(filtered);
  }, [email]);

  const getDeptFromEmail = (email) => {
    const parts = email.split('@')[0].split('.');
    return parts.length > 1 ? parts[1].toUpperCase() : 'CSE';
  };

  const handleChange = (programType, field, value) => {
    setFormData(prev => ({
      ...prev,
      [programType]: {
        ...prev[programType],
        [field]: field === 'count' ? Math.max(0, parseInt(value || 0)) : value.slice(0, 100)
      }
    }));
  };

  const calculateTotals = () => {
    const categoryTotals = {};
    let grandTotal = 0;

    visiblePrograms.forEach(p => {
      const count = formData[p.programType]?.count || 0;
      const subtotal = count * p.budget;
      if (!categoryTotals[p.category]) categoryTotals[p.category] = 0;
      categoryTotals[p.category] += subtotal;
      grandTotal += subtotal;
    });

    return { categoryTotals, grandTotal };
  };

  const { categoryTotals, grandTotal } = calculateTotals();

  const handleSubmit = async () => {
    const submission = visiblePrograms.map(p => ({
      email,
      academicYear,
      category: p.category,
      programType: p.programType,
      budget: p.budget,
      count: formData[p.programType]?.count || 0,
      total: (formData[p.programType]?.count || 0) * p.budget,
      remarks: formData[p.programType]?.remarks || ''
    }));

    try {
      const res = await fetch('http://localhost:5000/api/program-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });

      if (res.ok) {
        alert('Submitted successfully!');
      } else {
        alert('Submission failed.');
      }
    } catch (error) {
      alert('Error: Could not submit data.');
    }
  };

  const grouped = visiblePrograms.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div style={{ padding: 20 }}>
      <div>
        <label><strong>Email:</strong></label>
        <input value={email} disabled style={{ marginLeft: 10, width: '300px' }} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label><strong>Academic Year:</strong></label>
        <input value={academicYear} disabled style={{ marginLeft: 10, width: '150px' }} />
      </div>

      {Object.keys(grouped).map(category => (
        <div key={category} style={{ marginTop: 30 }}>
          <h3>{category}</h3>
          <table border="1" cellPadding="8" cellSpacing="0" width="100%">
            <thead>
              <tr>
                <th>Program Type</th>
                <th>Budget/Event (₹)</th>
                <th>Count</th>
                <th>Total Amount (₹)</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {grouped[category].map(p => {
                const count = formData[p.programType]?.count || 0;
                const remarks = formData[p.programType]?.remarks || '';
                return (
                  <tr key={p.programType}>
                    <td>{p.programType}</td>
                    <td>{p.budget}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={count}
                        onChange={e => handleChange(p.programType, 'count', e.target.value)}
                        style={{ width: 60 }}
                      />
                    </td>
                    <td>{count * p.budget}</td>
                    <td>
                      <input
                        type="text"
                        value={remarks}
                        maxLength="100"
                        onChange={e => handleChange(p.programType, 'remarks', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan="3"><strong>Subtotal</strong></td>
                <td colSpan="2"><strong>₹{categoryTotals[category]}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <h3>Grand Total: ₹{grandTotal}</h3>
        <button onClick={handleSubmit} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Submit
        </button>
      </div>
    </div>
  );
};

export default StudentProgramPlanner;
