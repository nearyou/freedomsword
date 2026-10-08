import { CheckCircle2, Clock3 } from 'lucide-react';
import type { PromiseView } from '@/lib/contracts';
import ProgressBar from '../ui/ProgressBar';
export type PromiseHistoryEntry = {
  date: string;
  oldProgress: number;
  newProgress: number;
  evidence: string;
  source?: string;
};
const labels: Record<string, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In progress',
  DELIVERED: 'Delivered',
  DELAYED: 'Delayed',
};
export default function PromiseCard({
  promise,
  history,
}: {
  promise: PromiseView;
  history?: PromiseHistoryEntry[];
}) {
  const color =
    promise.status === 'DELIVERED'
      ? 'var(--success)'
      : promise.status === 'DELAYED'
        ? 'var(--warning)'
        : 'var(--primary)';
  return (
    <article className="promise-item">
      <div className="promise-title">
        <span>{promise.title}</span>
        <strong>{promise.progress}%</strong>
      </div>
      <ProgressBar value={promise.progress} color={color} label={promise.title} />
      <div className="promise-status" data-status={promise.status}>
        {promise.status === 'DELIVERED' ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
        {labels[promise.status] ?? promise.status}
      </div>
      <details className="promise-evidence">
        <summary>Evidence & milestones</summary>
        <p>{promise.evidence || 'No evidence has been published for this milestone.'}</p>
        {history?.map((entry, index) => (
          <div className="history-entry" key={`${entry.date}:${index}`}>
            <time dateTime={entry.date}>{new Date(entry.date).toLocaleDateString()}</time>
            <strong>
              {entry.oldProgress}% → {entry.newProgress}%
            </strong>
            <p>{entry.evidence}</p>
            {entry.source && <span>Source: {entry.source}</span>}
          </div>
        ))}
      </details>
    </article>
  );
}
