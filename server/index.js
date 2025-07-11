import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post('/api/program-counts', (req, res) => {
  const data = req.body;
  console.log('📥 Received data from frontend:', data);
  res.json({ message: '✅ Data received successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
