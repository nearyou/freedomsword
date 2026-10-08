import type { PromiseView } from '@/lib/contracts';
import { promiseSummary } from '@/lib/promises';
import PromiseCard from './accountability/PromiseCard';
export default function PromiseTracker({ promises }: { promises: PromiseView[] }) {
  const summary = promiseSummary(promises);
  const percent = summary.total ? Math.round((summary.delivered / summary.total) * 100) : 0;
  return (
    <section className="promise-tracker" aria-label="Candidate promise progress">
      <div className="promise-heading">
        <h3>Promise tracker</h3>
        <span>
          {summary.delivered} of {summary.total} delivered · {percent}%
        </span>
      </div>
      <p className="promise-disclaimer">
        Reported progress · fictional milestones, not independently verified.
      </p>
      {promises.map((promise) => (
        <PromiseCard key={promise.id} promise={promise} />
      ))}
      {!promises.length && (
        <div className="empty-state compact">
          <p>No promises have been published yet.</p>
        </div>
      )}
    </section>
  );
}
