import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import topicsRouter from './routes/topics';
import gradeRouter from './routes/grade';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/topics', topicsRouter);
app.use('/api/speech', gradeRouter);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'speech-coach-server' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Speech Coach server running on port ${PORT}`);
});