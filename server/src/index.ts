import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import topicsRouter from './routes/topics';
import gradeRouter from './routes/grades';

const app = express();

// CORS: allow the origins configured via CORS_ORIGIN (comma-separated list),
// plus the local Vite dev ports (5173 is the default; Vite bumps to 5174/5175
// when 5173 is occupied, which previously caused CORS rejections after a stale
// CORS_ORIGIN pointed at the wrong port).
const configuredOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const devOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];

const allowedOrigins = new Set([
  ...configuredOrigins,
  ...(process.env.NODE_ENV === 'production' ? [] : devOrigins),
]);

app.use(
  cors({
    origin(origin, callback) {
      // Requests with no Origin header (curl, same-origin) are always allowed.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        // Deny silently: the request proceeds without CORS headers and the
        // browser blocks it, instead of the server throwing a 500.
        callback(null, false);
      }
    },
  }),
);
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