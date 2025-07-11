import React, { useState } from 'react';
function StudentProgramPlanForm() {
  const [category, setCategory] = useState('');
  const [programType, setProgramType] = useState('');
  const [count, setCount] = useState(0);

  const handleSubmit = async () => {
    if (!category || !programType || count <= 0) {
      alert('Please fill all fields correctly');
      return;
    }
    await fetch('http://localhost:5000/api/program-counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, programType, count })
    });
    alert('Submitted');
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Student Program Planning Form (HoD Only)</h2>
      <div>
        <label>Activity Category:</label><br/>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value=''>-- Select --</option>
          <option value='FDP'>FDP</option>
          <option value='Seminar'>Seminar</option>
          <option value='Workshop'>Workshop</option>
        </select>
      </div>
      <div>
        <label>Program Type:</label><br/>
        <select value={programType} onChange={e => setProgramType(e.target.value)}>
          <option value=''>-- Select --</option>
          <option value='Online'>Online</option>
          <option value='Offline'>Offline</option>
        </select>
      </div>
      <div>
        <label>Count:</label><br/>
        <input type='number' value={count} onChange={e => setCount(Number(e.target.value))} />
      </div>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
export default StudentProgramPlanForm;