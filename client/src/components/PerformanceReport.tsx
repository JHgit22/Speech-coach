import { Download, TrendingUp, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import type { GradingReport } from '../types';

interface Props {
  report: GradingReport | null;
  loading: boolean;
  onReset: () => void;
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent Delivery';
  if (score >= 70) return 'Good Delivery';
  if (score >= 50) return 'Solid Start';
  return 'Needs Work';
}

function exportPdf(report: GradingReport) {
  const doc = new jsPDF();
  const marginX = 14;
  const pageBottom = 280;
  let y = 20;

  function ensureSpace(lines: number) {
    if (y + lines * 6 > pageBottom) {
      doc.addPage();
      y = 20;
    }
  }

  function writeParagraph(text: string, fontSize = 11) {
    doc.setFontSize(fontSize);
    const lines: string[] = doc.splitTextToSize(text, 180);
    ensureSpace(lines.length);
    doc.text(lines, marginX, y);
    y += lines.length * (fontSize / 2) + 4;
  }

  doc.setFontSize(18);
  doc.text('Speech Coach Report', marginX, y);
  y += 10;

  doc.setFontSize(12);
  doc.text(`Topic: ${report.topic}`, marginX, y);
  y += 8;
  doc.text(`Overall Score: ${report.overallScore} / 100`, marginX, y);
  y += 10;

  doc.setFontSize(14);
  ensureSpace(2);
  doc.text('Category Breakdown', marginX, y);
  y += 8;
  report.categories.forEach((c) => {
    writeParagraph(`${c.name}: ${c.score}/100 - ${c.feedback}`);
  });

  y += 4;
  doc.setFontSize(14);
  ensureSpace(2);
  doc.text('Strengths', marginX, y);
  y += 8;
  report.strengths.forEach((s) => writeParagraph(`- ${s}`));

  y += 4;
  doc.setFontSize(14);
  ensureSpace(2);
  doc.text('Improvements', marginX, y);
  y += 8;
  report.improvements.forEach((imp) => {
    writeParagraph(imp.point, 12);
    writeParagraph(`Why: ${imp.reason}`, 10);
    writeParagraph(`Tip: ${imp.tip}`, 10);
    y += 2;
  });

  doc.save('speech-report.pdf');
}

export default function PerformanceReport({ report, loading, onReset }: Props) {
  return (
    <section className="rounded-2xl bg-stone-200/60 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-stone-900">Performance Report</h2>
        {report && (
          <button
            onClick={() => exportPdf(report)}
            className="flex items-center gap-2 rounded-full border border-stone-400 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100"
          >
            <Download className="h-4 w-4" />
            PDF Report
          </button>
        )}
      </div>

      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="h-20 rounded-xl bg-stone-50" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 rounded-xl bg-stone-50" />
            <div className="h-20 rounded-xl bg-stone-50" />
          </div>
        </div>
      )}

      {!loading && !report && (
        <p className="rounded-xl bg-stone-50 px-6 py-10 text-center text-stone-500">
          Your graded report will appear here after you submit a recording.
        </p>
      )}

      {!loading && report && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 rounded-xl bg-stone-50 p-4">
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-amber-500">
              <span className="text-2xl font-bold text-stone-900">{report.overallScore}</span>
              <span className="text-[10px] uppercase tracking-wider text-stone-500">Score</span>
            </div>
            <div>
              <p className="font-display text-lg font-bold text-stone-900">
                {scoreLabel(report.overallScore)}
              </p>
              <p className="text-sm text-stone-600">{report.categories[0]?.feedback}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {report.categories.map((cat) => (
              <div key={cat.name} className="rounded-xl bg-stone-50 p-4">
                <p className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wider text-stone-500">
                  <TrendingUp className="h-3 w-3" />
                  {cat.name}
                </p>
                <p className="text-2xl font-bold text-stone-900">{cat.score}</p>
                <p className="truncate text-xs text-stone-500">{cat.feedback}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-stone-50 p-6">
            <p className="mb-3 flex items-center gap-2 font-display text-base font-bold text-stone-900">
              <FileText className="h-4 w-4 text-amber-600" />
              Strengths
            </p>
            <ul className="space-y-2 text-sm text-stone-700">
              {report.strengths.map((s, i) => (
                <li key={i}>
                  <span className="rounded bg-amber-100 px-1">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="font-display text-base font-bold text-stone-900">Improvements</p>
            {report.improvements.map((imp, i) => (
              <div key={i} className="rounded-xl bg-stone-50 p-4">
                <p className="font-display font-semibold text-stone-900">{imp.point}</p>
                <p className="mb-2 text-sm text-stone-600">{imp.reason}</p>
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-stone-800">
                  {imp.tip}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={onReset}
            className="text-sm font-medium text-stone-600 underline hover:text-stone-900"
          >
            Practice Again
          </button>
        </div>
      )}
    </section>
  );
}