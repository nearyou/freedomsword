'use client';
import { useState } from 'react';
import { ArrowDownLeft, ArrowDownUp } from 'lucide-react';
import type { ElectionView } from '@frontend/lib/contracts';
import { timeLabel, type BallotView } from '@frontend/lib/ui';
import { recallAvailability } from '@frontend/lib/ballot-ui';
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
  const [selection, setSelection] = useState('25');
  const step = policy?.partialAmount ?? 25;
  const choices = [...new Set([step, 25, 50, 75])].sort((a, b) => a - b)
    .filter((amount) => amount > 0 && amount <= ballot.balance && amount % step === 0 && policy?.partialEnabled !== false);
  const selected = selection === 'all' || choices.includes(Number(selection)) ? selection : choices[0]?.toString() ?? 'all';
  const all = selected === 'all';
  const amount = all ? ballot.balance : Number(selected);
  const reason = busy
    ? 'An action is being recorded.'
    : privateError
      ? 'Refresh your private ballot state before recalling.'
      : !ready
        ? 'Complete or renew your Citizen Passport before recalling.'
        : '';
  const selectedReason = reason || (all ? availability.fullReason : availability.partialReason);
  const remainingDays = Math.max(
    0,
    Math.ceil((new Date(election.closesAt).getTime() - now) / 86400000),
  );
  return (
    <section className="recall-panel" aria-label="Recall support">
      <label className="recall-amount"><span><ArrowDownUp size={17} aria-hidden="true" /> Choose how much to recall</span>
        <select value={selected} disabled={busy || ballot.balance === 0} onChange={(event) => setSelection(event.target.value)}>
          {choices.map((value) => <option key={value} value={String(value)}>{(value / 100).toFixed(2)} · {value} units</option>)}
          <option value="all" disabled={policy?.fullEnabled === false}>All remaining · {ballot.balance} units</option>
        </select>
      </label>
      <p className="fine-print">Recall {amount} units · Keep {Math.max(0, ballot.balance - amount)} units supporting this candidate.</p>
      <button className="button recall-partial full" disabled={!!selectedReason}
        aria-describedby={selectedReason ? 'recall-reason' : undefined}
        onClick={() => onRecall(all ? 'full' : 'partial', all || amount === step ? undefined : amount)}>
        <ArrowDownLeft size={17} /> Recall {amount} units
      </button>
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
