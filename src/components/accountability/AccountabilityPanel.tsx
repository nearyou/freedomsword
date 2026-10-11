'use client';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { CandidateView } from '@/lib/contracts';
import { promiseSummary } from '@/lib/promises';
import Avatar from '../ui/Avatar';
import PromiseTracker from '../PromiseTracker';
export default function AccountabilityPanel({ candidates }: { candidates: CandidateView[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <div className="accountability-cards">
      {candidates.map((candidate) => {
        const promises = candidate.platform?.promises ?? [];
        const summary = promiseSummary(promises);
        const expanded = expandedId === candidate.id;
        return (
          <article className="panel" key={candidate.id}>
            <button
              className="accountability-row"
              type="button"
              aria-expanded={expanded}
              aria-controls={`promises-${candidate.id}`}
              onClick={() => setExpandedId(expanded ? null : candidate.id)}
            >
              <Avatar name={candidate.fullName} color={candidate.color} />
              <span>
                <strong>{candidate.fullName}</strong>
                <small>
                  {summary.total
                    ? `${summary.delivered} of ${summary.total} delivered`
                    : 'No promises published'}
                </small>
              </span>
              <span className="accountability-action">
                {expanded ? 'Hide' : 'View promises'} <ChevronRight size={18} aria-hidden="true" />
              </span>
            </button>
            <div id={`promises-${candidate.id}`} hidden={!expanded}>
              {expanded && <PromiseTracker promises={promises} compact />}
            </div>
          </article>
        );
      })}
      {!candidates.length && (
        <div className="panel empty-state">
          <h3>No accountability records yet</h3>
          <p>Published candidate promises will appear here.</p>
        </div>
      )}
    </div>
  );
}
