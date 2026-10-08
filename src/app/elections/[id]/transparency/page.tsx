import Link from 'next/link';
import { notFound } from 'next/navigation';
import { electionTransparency } from '@/server/transparency';
import { ApiError } from '@/server/errors';
import ThemeControl from '@/components/ThemeControl';
export const dynamic = 'force-dynamic';
export default async function TransparencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof electionTransparency>>;
  try { data = await electionTransparency(id); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  return <main className="admin-page transparency-page">
    <div className="admin-heading"><div><p className="eyebrow">PUBLIC ELECTION RECORD</p><h1>{data.election.title}</h1></div><div className="admin-actions"><ThemeControl /><Link href="/">Back to app</Link></div></div>
    <p>{data.election.description}</p>
    <div className="transparency-stats">
      <div className="admin-card"><strong>{data.totals.participation}</strong><span>Ballots cast</span></div>
      <div className="admin-card"><strong>{data.totals.voteUnitsCast}</strong><span>Units cast</span></div>
      <div className="admin-card"><strong>{data.totals.recalledUnits}</strong><span>Units recalled</span></div>
      <div className="admin-card"><strong>{data.totals.activeUnits}</strong><span>Active units</span></div>
    </div>
    <section className="admin-card"><h2>Election configuration</h2>
      <p>{data.election.type} · {data.election.status} · {new Date(data.election.opensAt).toLocaleString()} – {new Date(data.election.closesAt).toLocaleString()}</p>
      <p>Recall: {data.election.recallPolicy.enabled ? 'enabled' : 'disabled'} · Partial {data.election.recallPolicy.partialAmount} units · First delay {data.election.recallPolicy.firstDelaySeconds}s · Cooldown {data.election.recallPolicy.cooldownSeconds}s · Maximum {data.election.recallPolicy.maxOperations ?? 'unlimited'}</p>
    </section>
    <section className="admin-card"><h2>Candidates and platforms</h2>
      {data.candidates.map((candidate) => <div className="transparency-candidate" key={candidate.id}>
        <div><strong>{candidate.fullName}</strong><span>{candidate.party} · {candidate.ideology}{candidate.withdrawn ? ' · Withdrawn' : ''}</span></div>
        <div><strong>{candidate.activeUnits} units</strong><span>{candidate.ballotCount} ballots</span></div>
        <div className="transparency-bar"><div style={{ width: `${data.totals.activeUnits ? 100 * candidate.activeUnits / data.totals.activeUnits : 0}%`, background: candidate.color }} /></div>
        <p>{candidate.bio}</p>
        {candidate.platforms.map((platform) => <p key={platform.version}>Platform v{platform.version}: {platform.title}<br /><code>SHA-256 {platform.contentHash}</code></p>)}
      </div>)}
    </section>
    <section className="admin-card"><h2>Public audit commitments</h2><p>{data.audit.note}</p>
      <p><Link href={`/api/elections/${encodeURIComponent(id)}/transparency`}>Read public JSON</Link> · <Link href={`/api/elections/${encodeURIComponent(id)}/audit-export`}>Download audit bundle</Link> · <Link href="/api/audit">Global audit chain</Link></p>
      {data.audit.recentEvents.map((event) => <div className="transparency-event" key={event.sequence}>
        <strong>#{event.sequence} · {event.blockchain?.status ?? 'NO RECORD'}</strong>
        <code>{event.commitment}</code>
      </div>)}
    </section>
  </main>;
}
