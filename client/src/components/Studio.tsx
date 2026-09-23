import { useEffect, useRef, useState } from 'react';
import { Radio, Mic, Square, RotateCcw, Check } from 'lucide-react';
import type { RecordingState } from '../types';

interface Props {
  topic: string | null;
  recordingState: RecordingState;
  onRecordingStateChange: (state: RecordingState) => void;
  onSubmit: (blob: Blob) => void;
}

const MAX_SECONDS = 180;

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  return '';
}

export default function Studio({ topic, recordingState, onRecordingStateChange, onSubmit }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Keep the playback URL in sync with the captured blob, revoking old URLs.
  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  // Stop any live mic stream / timer if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleStart() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      onRecordingStateChange('recording');

      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (prev + 1 >= MAX_SECONDS) {
            handleStop();
            return MAX_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setMicError('Microphone permission was denied. Please allow mic access and try again.');
    }
  }

  function handleStop() {
    mediaRecorderRef.current?.stop();
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    onRecordingStateChange('stopped');
  }

  function handleDiscard() {
    setAudioBlob(null);
    setSeconds(0);
    onRecordingStateChange('idle');
  }

  function handleConfirm() {
    if (audioBlob) onSubmit(audioBlob);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const capMm = String(Math.floor(MAX_SECONDS / 60)).padStart(2, '0');
  const capSs = String(MAX_SECONDS % 60).padStart(2, '0');

  return (
    <section className="rounded-2xl bg-stone-200/60 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-amber-600" />
          <h2 className="font-display text-xl font-bold text-stone-900">Studio</h2>
        </div>
        {recordingState === 'recording' && (
          <span className="flex items-center gap-1 text-sm text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            {mm}:{ss} / {capMm}:{capSs}
          </span>
        )}
      </div>

      <div className="mb-4 rounded-xl bg-stone-50 px-6 py-8 text-center">
        <p className="mb-2 text-xs uppercase tracking-wider text-stone-500">Current Topic</p>
        <p className="mb-4 truncate text-stone-800">{topic ?? 'Generate a topic to begin'}</p>

        {recordingState === 'recording' && (
          <>
            <div className="mb-2 flex h-8 items-center justify-center gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1 animate-pulse rounded-full bg-amber-500"
                  style={{ height: `${8 + ((i * 7) % 24)}px`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
            <p className="text-sm italic text-stone-500">Capturing High-Fidelity Audio...</p>
          </>
        )}

        {micError && <p className="text-sm text-red-700">{micError}</p>}
      </div>

      <div className="flex items-center justify-center gap-4">
        {recordingState === 'idle' && (
          <button
            onClick={handleStart}
            disabled={!topic}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-800 text-white transition hover:bg-red-700 disabled:opacity-40"
            aria-label="Start recording"
          >
            <Mic className="h-6 w-6" />
          </button>
        )}

        {recordingState === 'recording' && (
          <button
            onClick={handleStop}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-800 text-white transition hover:bg-red-700"
            aria-label="Stop recording"
          >
            <Square className="h-5 w-5" />
          </button>
        )}

        {(recordingState === 'stopped' || recordingState === 'grading') && (
          <>
            <button
              onClick={handleDiscard}
              disabled={recordingState === 'grading'}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-50 text-stone-700 transition hover:bg-stone-100 disabled:opacity-40"
              aria-label="Discard and re-record"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            {audioUrl && <audio src={audioUrl} controls className="h-10" />}

            <button
              onClick={handleConfirm}
              disabled={recordingState === 'grading'}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-amber-400 transition hover:bg-stone-800 disabled:opacity-60"
              aria-label="Submit for grading"
            >
              <Check className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {recordingState === 'grading' && (
        <p className="mt-4 text-center text-sm text-stone-500">
          Grading your speech — this can take up to 30 seconds.
        </p>
      )}
    </section>
  );
}