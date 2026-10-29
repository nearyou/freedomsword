'use client';
import { useState } from 'react';
import { ArrowDownLeft } from 'lucide-react';
import type { ElectionView } from '@frontend/lib/contracts';
import { timeLabel, type BallotView } from '@frontend/lib/ui';
import { recallAvailability } from '@frontend/lib/ballot-ui';
import { legacyRecallSelection } from '@frontend/lib/support-adjustment';
import SupportSlider from './SupportSlider';
export default function RecallPanel({
  election,
  ballot,
  now,
  ready,
  busy,
  privateError,
  onRecall,
}: {
  election: ElectionView;
  ballot: BallotView;
  now: number;
  ready: boolean;
  busy: boolean;
  privateError: boolean;
  onRecall: (mode: 'partial' | 'full', units?: number) => void;
}) {
  const policy = election.recallPolicy;
  const availability = recallAvailability(election, ballot, now);
  const [draft, setDraft] = useState<{ balance: number; target: number } | null>(null);
  const target = draft?.balance === ballot.balance ? draft.target : ballot.balance;
  const amount = ballot.balance - target;
  const selection = legacyRecallSelection(ballot.balance, target, policy);
  const reason = busy
    ? 'An action is being recorded.'
    : privateError
      ? 'Refresh your private ballot state before recalling.'
      : !ready
        ? 'Complete or renew your Citizen Passport before recalling.'
        : '';
  const selectedReason = reason || availability.common || (amount === 0
    ? 'Move the slider left to choose how much support to recall.'
    : !selection ? 'Choose an amount permitted by this election’s recall rules.'
      : selection.mode === 'full' ? availability.fullReason : availability.partialReason);
  const remainingDays = Math.max(
    0,
    Math.ceil((new Date(election.closesAt).getTime() - now) / 86400000),
  );
  return (
    <section className="recall-panel" aria-label="Recall support">
      <SupportSlider key={`${election.id}-${ballot.candidateId}`} current={ballot.balance} maximum={ballot.balance}
        value={target} disabled={busy || ballot.balance === 0}
        onChange={(value) => setDraft({ balance: ballot.balance, target: value })} />
      <p className="fine-print">Recall {amount} units · Keep {target} units supporting this candidate.</p>
      <button className="button recall-partial full" disabled={!!selectedReason}
        aria-describedby={selectedReason ? 'recall-reason' : undefined}
        onClick={() => { if (selection && !selectedReason) onRecall(selection.mode, 'units' in selection ? selection.units : undefined); }}>
        <ArrowDownLeft size={17} /> {amount ? `Recall ${amount} units` : 'Choose a recall amount'}
      </button>
      <button className="button secondary full" disabled={!!reason || !!availability.fullReason}
        onClick={() => onRecall('full')}>Recall all {ballot.balance} units</button>
      {selectedReason && <p className="disabled-reason" id="recall-reason">{selectedReason}</p>}
      <p className="fine-print">Recalled support cannot be reassigned.</p>
      <details className="recall-policy-details">
        <summary>Recall rules</summary>
        <dl className="recall-rules">
          {ballot.recallCount !== undefined && (
            <>
              <dt>Recalls used</dt>
              <dd>{ballot.recallCount}</dd>
            </>
          )}
          {policy && (
            <>
              <dt>Maximum recalls</dt>
              <dd>{policy.maxOperations ?? 'Unlimited'}</dd>
              <dt>First recall delay</dt>
              <dd>{policy.firstDelaySeconds}s</dd>
              <dt>Cooldown</dt>
              <dd>{policy.cooldownSeconds}s</dd>
            </>
          )}
          {availability.nextAt !== undefined && (
            <>
              <dt>Next recall availability</dt>
              <dd>
                {availability.common &&
                availability.common !== 'The recall delay or cooldown has not elapsed.'
                  ? 'Unavailable'
                  : availability.nextAt <= now
                    ? 'Available now'
                    : timeLabel(new Date(availability.nextAt).toISOString())}
              </dd>
            </>
          )}
          <dt>Recall window</dt>
          <dd>{timeLabel(election.opensAt)} – {timeLabel(election.closesAt)}</dd>
          <dt>Election time remaining</dt>
          <dd>
            {now >= new Date(election.closesAt).getTime() ||
            ['FINISHED', 'ARCHIVED'].includes(election.status)
              ? 'Election ended'
              : `${remainingDays} days until scheduled close`}
          </dd>
        </dl>
        {ballot.recallCount === undefined && (
          <p className="fine-print">Personal timing is unavailable; the server enforces recall limits.</p>
        )}
      </details>
    </section>
  );
}
