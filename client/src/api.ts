import type { GradingReport } from './types';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchRandomTopic(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/topics/random`);
  if (!res.ok) {
    throw new Error('Could not fetch a topic. Is the server running?');
  }
  const data = await res.json();
  return data.topic as string;
}

export async function gradeSpeech(topic: string, audioBlob: Blob): Promise<GradingReport> {
  const formData = new FormData();
  formData.append('topic', topic);

  const extension = audioBlob.type.split('/')[1]?.split(';')[0] || 'webm';
  formData.append('audio', audioBlob, `speech.${extension}`);

  const res = await fetch(`${API_BASE}/api/speech/grade`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Grading failed. Please try again.');
  }

  return res.json();
}