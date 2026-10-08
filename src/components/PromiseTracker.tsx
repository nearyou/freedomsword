import { CheckCircle2, Clock3 } from 'lucide-react';
import type { PromiseView } from '@/lib/contracts';
import { promiseSummary } from '@/lib/promises';
const statusLabels: Record<string, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In progress',
  DELIVERED: 'Delivered',
  DELAYED: 'Delayed',
};
export default function PromiseTracker({ promises }: { promises: PromiseView[] }) {
  const summary = promiseSummary(promises);
  return (
    <section className="promise-tracker" aria-label="Candidate promise progress">
      <div className="promise-heading">
        <h3>Promise tracker</h3>
        <span>
          {summary.delivered}/{summary.total} delivered
        </span>
      </div>
      <p className="promise-disclaimer">
        Fictional milestones · reported progress, not independently verified
      </p>
      {promises.map((promise) => (
        <div className="promise-item" key={promise.id}>
          <div className="promise-title">
            <span>{promise.title}</span>
            <strong>{promise.progress}%</strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={promise.title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={promise.progress}
          >
            <span
              style={{
                width: `${promise.progress}%`,
                background:
                  promise.status === 'DELIVERED'
                    ? '#6bcfa7'
                    : promise.status === 'DELAYED'
                      ? '#e7a572'
                      : '#6899ec',
              }}
            />
          </div>
          <div className="promise-status" data-status={promise.status}>
            {promise.status === 'DELIVERED' ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}{' '}
            {statusLabels[promise.status] ?? promise.status}
          </div>
          <details className="promise-evidence">
            <summary>Milestone note</summary>
            <p>{promise.evidence}</p>
          </details>
        </div>
      ))}
      {!promises.length && (
        <p className="promise-disclaimer">No promises have been published yet.</p>
      )}
    </section>
  );
}
