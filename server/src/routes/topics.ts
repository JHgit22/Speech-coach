import { Router } from 'express';
import { TOPICS } from '../data/topics';

const router = Router();

router.get('/random', (_req, res) => {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  res.json({ topic });
});

export default router;