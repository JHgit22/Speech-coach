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

// Short per-device reason, used in the aggregated error list.
function shortReason(name: string | undefined): string {
  switch (name) {
    case 'NotReadableError':
    case 'TrackStartError':
      return 'busy or unreadable';
    case 'NotAllowedError':
    case 'SecurityError':
      return 'permission denied';
    case 'NotFoundError':
      return 'not found';
    case 'OverconstrainedError':
      return 'could not be opened';
    default:
      return `error (${name ?? 'unknown'})`;
  }
}

// Advice shown when no microphone could be opened at all.
function busyMicAdvice(): string {
  return (
    'On Windows, this usually means another program holds the mic: check the system ' +
    'tray for Zoom / Teams / Discord / voice recorders and quit them, and check other ' +
    'open tabs or windows (including this one). If it persists: Settings → System → ' +
    'Sound → Input → your mic → Device properties → turn off "Audio enhancements" ' +
    'and disable "Allow applications to take exclusive control". As a last resort, ' +
    'restart the browser (or Windows).'
  );
}

interface MicAttempt {
  device: string;
  errorName?: string;
}

// Translate getUserMedia failures into actionable messages.
function micErrorMessage(name: string | undefined): string {
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone permission was denied. Allow mic access in your browser and try again.';
    case 'NotFoundError':
      return 'No microphone was found. Please connect one and try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your microphone seems busy. ' + busyMicAdvice();
    case 'OverconstrainedError':
      return 'The selected microphone could not be opened. Try a different input device.';
    default:
      return 'Could not access the microphone. Please check your device and try again.';
  }
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
  const [activeMicLabel, setActiveMicLabel] = useState<string | null>(null);
  const startingRef = useRef(false);

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

  // Auto-stop at the duration cap. Runs as an effect (not inside the state
  // updater) so the stop path executes once, outside of React's render cycle.
  useEffect(() => {
    if (seconds >= MAX_SECONDS && recordingState === 'recording') {
      handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recordingState]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // Try to open a specific device (or the OS default when deviceId is empty).
  async function openMic(deviceId?: string): Promise<MediaStream> {
    const audio = deviceId ? { deviceId: { exact: deviceId } } : true;
    return navigator.mediaDevices.getUserMedia({ audio });
  }

  async function handleStart() {
    // Guard against overlapping starts (e.g. double-click), which could grab a
    // second stream and keep the mic locked after the first one is abandoned.
    if (startingRef.current) return;
    startingRef.current = true;
    setMicError(null);

    // Release any stale stream from a previous session first — an unreleased
    // stream is itself a common reason the mic later reports as busy.
    stopStream();

    const attempts: MicAttempt[] = [];

    // Step 1: open the mic, falling back device-by-device if the default input
    // cannot be opened (NotReadableError is usually a per-device OS lock, so a
    // different physical input often still works).
    let stream: MediaStream | null = null;
    try {
      // The default-device attempt also serves as the permission prompt.
      stream = await openMic();
      setActiveMicLabel(stream.getAudioTracks()[0]?.label || 'System default microphone');
    } catch (err) {
      const name = (err as DOMException)?.name;
      console.error('getUserMedia (default device) failed:', err);
      attempts.push({ device: 'System default microphone', errorName: name });

      // Permission problems won't be fixed by switching devices — bail early.
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setMicError(micErrorMessage(name));
        startingRef.current = false;
        return;
      }
    }

    if (!stream) {
      // Enumerate the remaining inputs and try each one. After a failed default
      // request the permission state may still be 'granted' from a previous
      // session, in which case labels are available; otherwise labels come back
      // empty and we surface generic names.
      let inputs: MediaDeviceInfo[] = [];
      try {
        inputs = await navigator.mediaDevices.enumerateDevices();
      } catch {
        // Enumeration itself failing is unusual; fall through with no candidates.
      }

      // Small pause: some OS audio stacks release a just-closed device lazily.
      await new Promise((resolve) => setTimeout(resolve, 400));

      const candidates = inputs.filter((d) => d.kind === 'audioinput' && d.deviceId);
      for (const device of candidates) {
        try {
          console.info(`Trying alternate microphone: ${device.label || device.deviceId}`);
          stream = await openMic(device.deviceId);
          setActiveMicLabel(device.label || 'Alternate microphone');
          console.info(`Using alternate microphone: ${device.label || device.deviceId}`);
          break;
        } catch (err) {
          const name = (err as DOMException)?.name;
          console.error(`getUserMedia failed for "${device.label || device.deviceId}":`, err);
          attempts.push({ device: device.label || 'Unnamed microphone', errorName: name });
        }
      }
    }

    if (!stream) {
      const tried = attempts.length
        ? `Tried ${attempts.length} input device(s): ` +
          attempts.map((a) => `${a.device} (${shortReason(a.errorName)})`).join(', ') +
          '. '
        : '';
      setMicError(
        "Couldn't open any microphone — every input reported as busy or unavailable. " +
          tried +
          busyMicAdvice(),
      );
      startingRef.current = false;
      return;
    }

    streamRef.current = stream;

    // Step 2: set up the recorder. Failures here are unrelated to permission,
    // so they get their own message instead of falsely blaming access.
    try {
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        stopStream();
        mediaRecorderRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      onRecordingStateChange('recording');

      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('MediaRecorder setup failed:', err);
      setMicError('Recording could not start on this device/browser.');
      stopStream();
      setActiveMicLabel(null);
      mediaRecorderRef.current = null;
      onRecordingStateChange('idle');
    } finally {
      startingRef.current = false;
    }
  }

  function handleStop() {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // stop() is idempotent-safe here: calling it on an inactive recorder throws,
    // so only stop when one is actually active.
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      // Recorder never got started (or already stopped): still release the mic
      // and surface whatever was captured so the UI doesn't get stuck.
      stopStream();
      onRecordingStateChange('stopped');
    }
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
            {activeMicLabel && <p className="mt-1 text-xs text-stone-400">Mic: {activeMicLabel}</p>}
          </>
        )}

        {micError && (
          <div className="mx-auto max-w-md text-left">
            <p className="text-sm text-red-700">{micError}</p>
          </div>
        )}
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