'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import Dialog from './ui/Dialog';
import type { AuditView } from '@/lib/contracts';
interface AuditPage {
  events: AuditView[];
  hasMore: boolean;
  total: number;
  verifiedRange: boolean;
  nextAfter: number;
}
export default function AuditExplorer({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState<AuditPage | null>(null);
  const [events, setEvents] = useState<AuditView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load(after: number) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/audit?after=${after}&limit=20`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Audit unavailable');
      setPage(data);
      setEvents((previous) => (after === 0 ? data.events : [...previous, ...data.events]));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Audit unavailable');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const timer = setTimeout(() => void load(0), 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Dialog titleId="audit-title" onClose={onClose} className="audit-modal">
      <div className="modal-symbol">
        <LockKeyhole size={26} />
      </div>
      <div className="eyebrow">PUBLIC COMMITMENTS ONLY</div>
      <h2 id="audit-title">A record you can inspect.</h2>
      <p className="modal-copy">
        Append-only, salted SHA-256 commitments. No identities or individual ballot details are
        published. Mock receipts provide no independent blockchain evidence.
      </p>
      {page && (
        <div className="audit-summary">
          <span>{page.total} commitments</span>
          <span className="signed-badge">
            <CheckCircle2 size={14} />
            {page.verifiedRange ? 'Page links verified' : 'Integrity check failed'}
          </span>
        </div>
      )}
      {events.map((event) => (
        <details className="audit-row" key={event.sequence}>
          <summary>
            <span>Commitment #{event.sequence}</span>
            <span>{event.blockchain?.status ?? 'PENDING'}</span>
          </summary>
          <dl>
            <dt>Commitment</dt>
            <dd>{event.commitment}</dd>
            <dt>Previous hash</dt>
            <dd>{event.previousHash}</dd>
            <dt>Chain hash</dt>
            <dd>{event.hash}</dd>
            <dt>Mock receipt</dt>
            <dd>{event.blockchain?.receipt ?? 'Awaiting mock adapter'}</dd>
          </dl>
        </details>
      ))}
      {page?.total === 0 && (
        <p className="fine-print">
          No commitments yet. Verified participation creates the first record.
        </p>
      )}
      {error && (
        <p className="fine-print" role="alert">
          {error}
        </p>
      )}
      {page?.hasMore && (
        <button
          className="button secondary full"
          disabled={busy}
          onClick={() => void load(page.nextAfter)}
        >
          Load more commitments
        </button>
      )}
      {error && (
        <button
          className="button secondary full"
          disabled={busy}
          onClick={() => void load(page?.nextAfter ?? 0)}
        >
          Retry
        </button>
      )}
      {busy && (
        <p className="fine-print" role="status">
          Loading commitments…
        </p>
      )}
    </Dialog>
  );
}
