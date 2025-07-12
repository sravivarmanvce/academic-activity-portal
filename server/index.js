// server/index.js
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const dataFile = path.join('data', 'program-submissions.json');

// Ensure file and folder exist
const ensureDataFile = () => {
  const dir = path.dirname(dataFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]');
};

app.post('/api/program-counts', (req, res) => {
  const submission = req.body;
  console.log('✅ Received:', submission);

  ensureDataFile();

  const allData = JSON.parse(fs.readFileSync(dataFile));
  const entry = {
    timestamp: new Date().toISOString(),
    ...submission
  };
  allData.push(entry);

  fs.writeFileSync(dataFile, JSON.stringify(allData, null, 2));

  res.status(200).json({ message: '✅ Submission saved successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
