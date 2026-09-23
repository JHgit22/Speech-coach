import { Ticket, RefreshCw, Loader2 } from 'lucide-react';

interface Props {
  topic: string | null;
  loading: boolean;
  onGenerate: () => void;
}

export default function TopicRoulette({ topic, loading, onGenerate }: Props) {
  return (
    <section className="rounded-2xl bg-stone-200/60 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Ticket className="h-5 w-5 text-amber-600" />
        <h2 className="font-display text-xl font-bold text-stone-900">Topic Roulette</h2>
      </div>

      <div className="relative mb-4 rounded-xl bg-stone-50 px-8 py-6 text-center">
        <span className="absolute left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-stone-800" />
        <span className="absolute right-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-stone-800" />
        <p className="font-display text-xl text-stone-900">
          {topic ?? 'Click below to get your first topic'}
        </p>
      </div>

      <button
        onClick={onGenerate}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 py-3 font-medium text-amber-400 transition hover:bg-stone-800 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {topic ? 'Spin Again' : 'Generate Topic'}
      </button>
    </section>
  );
}