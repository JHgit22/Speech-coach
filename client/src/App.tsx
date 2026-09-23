import { useState } from 'react';
import TopicRoulette from './components/TopicRoulette.tsx';
import Studio from './components/Studio.tsx';
import PerformanceReport from './components/PerformanceReport.tsx';
import { fetchRandomTopic, gradeSpeech } from './api';
import type { GradingReport, RecordingState } from './types';

export default function App() {
  const [topic, setTopic] = useState<string | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [report, setReport] = useState<GradingReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGenerateTopic() {
    setErrorMessage(null);
    setTopicLoading(true);
    try {
      const newTopic = await fetchRandomTopic();
      setTopic(newTopic);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not fetch a topic.');
    } finally {
      setTopicLoading(false);
    }
  }

  async function handleSubmitRecording(blob: Blob) {
    if (!topic) return;
    setErrorMessage(null);
    setRecordingState('grading');
    try {
      const result = await gradeSpeech(topic, blob);
      setReport(result);
      setRecordingState('idle');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Grading failed. Please try again.');
      setRecordingState('stopped');
    }
  }

  function handleReset() {
    setTopic(null);
    setReport(null);
    setRecordingState('idle');
    setErrorMessage(null);
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-300 py-6 text-center">
        <h1 className="font-display text-3xl font-bold text-stone-900">VoxCoach</h1>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
            <button onClick={() => setErrorMessage(null)} className="ml-3 underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-8">
            <TopicRoulette topic={topic} loading={topicLoading} onGenerate={handleGenerateTopic} />
            <Studio
              topic={topic}
              recordingState={recordingState}
              onRecordingStateChange={setRecordingState}
              onSubmit={handleSubmitRecording}
            />
          </div>

          <PerformanceReport
            report={report}
            loading={recordingState === 'grading'}
            onReset={handleReset}
          />
        </div>
      </main>
    </div>
  );
}