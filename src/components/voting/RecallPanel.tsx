import { ArrowDownLeft, Clock3 } from 'lucide-react';
import type { ElectionView } from '@/lib/contracts';
import { timeLabel, type BallotView } from '@/lib/ui';
import { recallAvailability } from '@/lib/ballot-ui';
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
  onRecall: (mode: 'partial' | 'full') => void;
}) {
  const policy = election.recallPolicy;
  const availability = recallAvailability(election, ballot, now);
  const reason = busy
    ? 'An action is being recorded.'
    : privateError
      ? 'Refresh your private ballot state before recalling.'
      : !ready
        ? 'Complete or renew your Citizen Passport before recalling.'
        : '';
  const partialReason = reason || availability.partialReason;
  const fullReason = reason || availability.fullReason;
  const remainingDays = Math.max(
    0,
    Math.ceil((new Date(election.closesAt).getTime() - now) / 86400000),
  );
  return (
    <section className="recall-panel">
      <div className="panel-heading">
        <h3>Control your support</h3>
        <Clock3 size={17} />
      </div>
      <div className="recall-options">
        <div>
          <span className="eyebrow">PARTIAL RECALL</span>
          <button
            className="button secondary full"
            disabled={!!partialReason}
            aria-describedby={partialReason ? 'partial-reason' : undefined}
            onClick={() => onRecall('partial')}
          >
            <ArrowDownLeft size={17} />
            Recall {policy?.partialAmount ?? 25} units
          </button>
          {partialReason && (
            <p className="disabled-reason" id="partial-reason">
              {partialReason}
            </p>
          )}
        </div>
        <div>
          <span className="eyebrow">FULL RECALL</span>
          <button
            className="button danger full"
            disabled={!!fullReason}
            aria-describedby={fullReason ? 'full-reason' : undefined}
            onClick={() => onRecall('full')}
          >
            Recall all remaining support
          </button>
          {fullReason && (
            <p className="disabled-reason" id="full-reason">
              {fullReason}
            </p>
          )}
        </div>
      </div>
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
        <dd>
          {timeLabel(election.opensAt)} – {timeLabel(election.closesAt)}
        </dd>
        <dt>Election time remaining</dt>
        <dd>
          {now >= new Date(election.closesAt).getTime() ||
          ['FINISHED', 'ARCHIVED'].includes(election.status)
            ? 'Election ended'
            : `${remainingDays} days until scheduled close`}
        </dd>
      </dl>
      {ballot.recallCount === undefined && (
        <p className="fine-print">
          Personal recall timing and counts are not available in this response. All policy checks
          are enforced by the server.
        </p>
      )}
      <p className="fine-print">
        Recall permanently reduces support. It does not transfer units or restore your initial
        ballot.
      </p>
    </section>
  );
}
