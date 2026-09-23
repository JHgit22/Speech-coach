export interface Category {
  name: string;
  score: number;
  feedback: string;
}

export interface Improvement {
  point: string;
  reason: string;
  tip: string;
}

export interface GradingReport {
  topic: string;
  transcript: string;
  overallScore: number;
  categories: Category[];
  strengths: string[];
  improvements: Improvement[];
}

export type RecordingState = 'idle' | 'recording' | 'stopped' | 'grading';