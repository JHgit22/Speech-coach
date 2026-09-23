import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CATEGORY_NAMES = [
  'Relevance to Topic',
  'Structure & Organization',
  'Clarity & Fluency',
  'Vocabulary',
  'Filler Words',
  'Confidence & Tone',
];

// JSON Schema describing the exact shape the client expects back.
export const gradingSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    transcript: { type: 'string' },
    overallScore: { type: 'number' },
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          score: { type: 'number' },
          feedback: { type: 'string' },
        },
        required: ['name', 'score', 'feedback'],
      },
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
    },
    improvements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          point: { type: 'string' },
          reason: { type: 'string' },
          tip: { type: 'string' },
        },
        required: ['point', 'reason', 'tip'],
      },
    },
  },
  required: ['topic', 'transcript', 'overallScore', 'categories', 'strengths', 'improvements'],
};

function buildPrompt(topic: string): string {
  return `You are an expert speech coach grading a practice speech.

The speaker was given this topic: "${topic}"

First, transcribe the audio as accurately as possible. Then grade the speech
against these categories: ${CATEGORY_NAMES.join(', ')}. Score each category
from 0 to 100.

Also provide:
- An overall score from 0 to 100
- 2 to 4 genuine strengths, specific to what was actually said (not generic praise)
- 2 to 4 improvement points, each with:
  - "point": what to improve
  - "reason": why it matters
  - "tip": a concrete, actionable suggestion for next time

Be specific and reference details from the actual speech rather than generic
advice. Set "topic" in your response to the exact topic given above.
Respond only with data matching the required JSON schema.`;
}

/**
 * Sends the recorded audio to Gemini for transcription + grading in one call.
 * Returns the raw JSON text from the model — parsing/retry logic lives in the route.
 */
export async function gradeSpeech(
  topic: string,
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  const interaction = await ai.interactions.create({
    model: 'gemini-3.8-flash',
    input: [
      { type: 'text', text: buildPrompt(topic) },
      { type: 'audio', data: audioBase64, mime_type: mimeType },
    ],
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: gradingSchema,
    },
  });

  if (!interaction.output_text) {
    throw new Error('Gemini returned no output text for the speech grading request.');
  }

  return interaction.output_text;
}