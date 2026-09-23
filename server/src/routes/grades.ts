import { Router } from 'express';
import multer from 'multer';
import { gradeSpeech } from '../services/gemini';

const router = Router();

// Memory storage only — the audio buffer never touches disk and is
// discarded once the response is sent. Nothing is persisted.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB, plenty for a few minutes of compressed audio
});

function tryParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

router.post('/grade', upload.single('audio'), async (req, res) => {
  const topic = typeof req.body.topic === 'string' ? req.body.topic.trim() : '';
  const file = req.file;

  if (!file || !topic) {
    return res.status(400).json({ error: 'Missing audio file or topic.' });
  }

  const audioBase64 = file.buffer.toString('base64');

  try {
    const rawResult = await gradeSpeech(topic, audioBase64, file.mimetype);
    const parsed = tryParse(rawResult);
    if (parsed) return res.json(parsed);

    // Malformed JSON on the first attempt — retry once before giving up.
    const retryResult = await gradeSpeech(topic, audioBase64, file.mimetype);
    const retryParsed = tryParse(retryResult);
    if (retryParsed) return res.json(retryParsed);

    return res
      .status(502)
      .json({ error: 'Grading service returned an invalid response. Please try again.' });
  } catch (err) {
    console.error('Grading error:', err);
    return res.status(502).json({ error: 'Grading failed. Please try again.' });
  }
});

export default router;