// server/index.js

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Program data path
const programDataPath = path.join('data', 'academic_programs_data.json');

// 🔹 GET: Program List (Loaded from JSON file)
app.get('/api/programs', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(programDataPath, 'utf-8'));
    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error reading program data:", error);
    res.status(500).json({ error: "Unable to load programs data" });
  }
});

// 🔸 POST: Save HoD Submissions
const submissionPath = path.join('data', 'program-submissions.json');

// Ensure submission data file exists
const ensureSubmissionFile = () => {
  const dir = path.dirname(submissionPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(submissionPath)) fs.writeFileSync(submissionPath, '[]');
};

app.post('/api/program-counts', (req, res) => {
  const submission = req.body;
  ensureSubmissionFile();

  try {
    const allData = JSON.parse(fs.readFileSync(submissionPath));
    const entry = {
      timestamp: new Date().toISOString(),
      ...submission
    };
    allData.push(entry);
    fs.writeFileSync(submissionPath, JSON.stringify(allData, null, 2));
    res.status(200).json({ message: '✅ Submission saved successfully' });
  } catch (error) {
    console.error("❌ Submission error:", error);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// Server Start
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
