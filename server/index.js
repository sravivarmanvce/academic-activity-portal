const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.post('/api/program-counts', (req, res) => {
  const { category, programType, count } = req.body;
  console.log('Received:', { category, programType, count });
  res.json({ status: 'success' });
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));