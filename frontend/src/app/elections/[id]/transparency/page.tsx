import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, FileJson, Link2 } from 'lucide-react';
import { fetchTransparency } from '@frontend/lib/transparency';
import ThemeControl from '@frontend/components/ThemeControl';
import BrandMark from '@frontend/components/ui/BrandMark';
export const dynamic = 'force-dynamic';
export default async function TransparencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchTransparency(id);
  if (!data) notFound();
  const policy = data.election.recallPolicy;
  return (
    <main className="admin-page transparency-page">
      <div className="admin-heading">
        <div className="admin-title">
          <BrandMark />
          <div>
            <p className="eyebrow">PUBLIC ELECTION RECORD</p>
            <h1>{data.election.title}</h1>
          </div>
        </div>
        <div className="admin-actions">
          <ThemeControl />
          <Link href="/">
            <ArrowLeft size={15} aria-hidden="true" /> Back to app
          </Link>
        </div>
      </div>
      <p className="transparency-description">{data.election.description}</p>
      <div className="transparency-stats">
        <div>
          <strong>{data.totals.participation}</strong>
          <span>Ballots cast</span>
        </div>
        <div>
          <strong>{data.totals.voteUnitsCast}</strong>
          <span>Units cast</span>
        </div>
        <div>
          <strong>{data.totals.recalledUnits}</strong>
          <span>Units recalled</span>
        </div>
        <div>
          <strong>{data.totals.activeUnits}</strong>
          <span>Active units</span>
        </div>
      </div>
      <section className="admin-card" aria-labelledby="configuration-title">
        <h2 id="configuration-title">Election configuration</h2>
        <dl className="meta-list">
          <div>
            <dt>Type</dt>
            <dd>{data.election.type}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{data.election.status}</dd>
          </div>
          <div>
            <dt>Opens</dt>
            <dd>{new Date(data.election.opensAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Closes</dt>
            <dd>{new Date(data.election.closesAt).toLocaleString()}</dd>
          </div>
        </dl>
        <p className="transparency-section-label">Recall policy</p>
        <dl className="meta-list">
          <div>
            <dt>Recall</dt>
            <dd>{policy.enabled ? 'Enabled' : 'Disabled'}</dd>
          </div>
          <div>
            <dt>Partial recall</dt>
            <dd>{policy.partialAmount} units</dd>
          </div>
          <div>
            <dt>First delay</dt>
            <dd>{policy.firstDelaySeconds}s</dd>
          </div>
          <div>
            <dt>Cooldown</dt>
            <dd>{policy.cooldownSeconds}s</dd>
          </div>
          <div>
            <dt>Maximum</dt>
            <dd>{policy.maxOperations ?? 'Unlimited'}</dd>
          </div>
        </dl>
      </section>
      <section className="admin-card" aria-labelledby="candidates-title">
        <h2 id="candidates-title">Candidates and platforms</h2>
        {data.candidates.map((candidate) => (
          <div className="transparency-candidate" key={candidate.id}>
            <div>
              <strong>{candidate.fullName}</strong>
              <span>
                {candidate.party} · {candidate.ideology}
                {candidate.withdrawn ? ' · Withdrawn' : ''}
              </span>
            </div>
            <div>
              <strong>{candidate.activeUnits} units</strong>
              <span>{candidate.ballotCount} ballots</span>
            </div>
            <div className="transparency-bar" aria-hidden="true">
              <div
                style={{
                  width: `${data.totals.activeUnits ? (100 * candidate.activeUnits) / data.totals.activeUnits : 0}%`,
                  background: candidate.color,
                }}
              />
            </div>
            <p>{candidate.bio}</p>
            {candidate.platforms.map((platform) => (
              <p className="transparency-platform" key={platform.version}>
                <span>
                  Platform v{platform.version}: {platform.title}
                </span>
                <code>SHA-256 {platform.contentHash}</code>
              </p>
            ))}
          </div>
        ))}
      </section>
      <section className="admin-card" aria-labelledby="audit-title">
        <h2 id="audit-title">Public audit commitments</h2>
        <p>{data.audit.note}</p>
        <div className="transparency-links">
          <Link href={`/api/elections/${encodeURIComponent(id)}/transparency`}>
            <FileJson size={15} aria-hidden="true" /> Read public JSON
          </Link>
          <Link href={`/api/elections/${encodeURIComponent(id)}/audit-export`}>
            <Download size={15} aria-hidden="true" /> Download audit bundle
          </Link>
          <Link href="/api/audit">
            <Link2 size={15} aria-hidden="true" /> Global audit chain
          </Link>
        </div>
        {!!data.audit.recentEvents.length && (
          <div className="transparency-events">
            {data.audit.recentEvents.map((event) => (
              <div className="transparency-event" key={event.sequence}>
                <strong>#{event.sequence}</strong>
                <span className="state-badge">{event.blockchain?.status ?? 'NO RECORD'}</span>
                <code>{event.commitment}</code>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
