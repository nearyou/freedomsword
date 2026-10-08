import { Vote, ArrowDownLeft, Check } from 'lucide-react';
import type { CandidateView, ElectionView } from '@/lib/contracts';
import type { BallotView } from '@/lib/ui';
import type { Action } from '@/hooks/useVoting';
import Dialog from '../ui/Dialog';
import Avatar from '../ui/Avatar';
export default function VoteConfirmation({
  action,
  candidate,
  election,
  ballot,
  busy,
  onCancel,
  onConfirm,
}: {
  action: Action;
  candidate?: CandidateView;
  election: ElectionView;
  ballot?: BallotView;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cast = action.path === 'vote';
  const partial = action.payload.mode === 'partial';
  const amount = partial ? (election.recallPolicy?.partialAmount ?? 25) : (ballot?.balance ?? 0);
  return (
    <Dialog titleId="confirm-title" onClose={onCancel} busy={busy} className="confirm-modal">
      <div className={`modal-symbol ${cast ? '' : 'destructive'}`}>
        {cast ? <Vote size={28} /> : <ArrowDownLeft size={28} />}
      </div>
      <p className="eyebrow">{cast ? 'YOUR INITIAL BALLOT' : 'SUPPORT RECALL'}</p>
      <h2 id="confirm-title">{cast ? 'Confirm your vote' : `Recall ${amount} units?`}</h2>
      {candidate && (
        <div className="confirmation-candidate">
          <Avatar name={candidate.fullName} color={candidate.color} />
          <div>
            <strong>{candidate.fullName}</strong>
            <span>{candidate.party}</span>
            <small>{candidate.ideology}</small>
          </div>
        </div>
      )}
      {cast ? (
        <ul className="confirmation-rules">
          <li>100 units will be allocated to this candidate.</li>
          <li>Only one initial ballot is allowed in this election.</li>
          <li>Support may later be recalled according to the election rules.</li>
          <li>A full recall does not allow another initial ballot.</li>
        </ul>
      ) : (
        <>
          <p className="modal-copy">
            {amount} units will be permanently removed from your candidate’s support. This records
            an immutable recall event. Recalled units cannot be reassigned.
          </p>
          <div className="confirmation-policy">
            <span>First delay: {election.recallPolicy?.firstDelaySeconds ?? 0}s</span>
            <span>Cooldown: {election.recallPolicy?.cooldownSeconds ?? 0}s</span>
            <span>Maximum recalls: {election.recallPolicy?.maxOperations ?? 'Unlimited'}</span>
          </div>
        </>
      )}
      <div className="dialog-actions">
        <button className="button secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button
          className={`button ${cast ? 'primary' : 'danger'}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Recording…' : cast ? 'Confirm vote' : 'Confirm recall'}
          <Check size={16} />
        </button>
      </div>
    </Dialog>
  );
}
