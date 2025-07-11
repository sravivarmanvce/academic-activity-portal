import React from 'react';
import StudentProgramPlanner from './components/StudentProgramPlanner';

function App() {
  return (
    <div className="App">
      <h1 style={{ textAlign: 'center', margin: '20px 0' }}>
        HoD Student Program Planning
      </h1>
      <StudentProgramPlanner />
    </div>
  );
}

export default App;
