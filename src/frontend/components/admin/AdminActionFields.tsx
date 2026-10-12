import { localInputDate, type AdminAction, type AdminElection } from './types';
export default function AdminActionFields({
  action,
  selected,
}: {
  action: AdminAction;
  selected?: AdminElection;
}) {
  if (action === 'create' || action === 'edit')
    return (
      <fieldset>
        <legend>Election details</legend>
        <label>
          Title
          <input
            name="title"
            required
            maxLength={160}
            defaultValue={action === 'edit' ? selected?.title : ''}
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            required
            maxLength={2000}
            defaultValue={action === 'edit' ? selected?.description : ''}
          />
        </label>
        <label>
          Election type
          <select name="type" defaultValue={action === 'edit' ? selected?.type : 'COUNCIL'}>
            <option value="COUNCIL">City council</option>
            <option value="BUDGET">Budget delegate</option>
            <option value="COMMUNITY">Community representative</option>
          </select>
        </label>
        <div className="form-row">
          <label>
            Start time · your local time
            <input
              name="opensAt"
              type="datetime-local"
              required
              defaultValue={action === 'edit' ? localInputDate(selected?.opensAt) : ''}
            />
          </label>
          <label>
            End time · your local time
            <input
              name="closesAt"
              type="datetime-local"
              required
              defaultValue={action === 'edit' ? localInputDate(selected?.closesAt) : ''}
            />
          </label>
        </div>
      </fieldset>
    );
  if (action === 'addCandidate')
    return (
      <fieldset>
        <legend>Candidate details</legend>
        <label>
          Full name
          <input name="fullName" required maxLength={160} />
        </label>
        <div className="form-row">
          <label>
            Party
            <input name="party" required maxLength={160} />
          </label>
          <label>
            Ideology
            <input name="ideology" required maxLength={80} />
          </label>
        </div>
        <label>
          Biography
          <textarea name="bio" required maxLength={2000} />
        </label>
        <label>
          Accent color
          <input name="color" type="color" defaultValue="#649af7" />
        </label>
      </fieldset>
    );
  if (action === 'removeCandidate' || action === 'platform')
    return (
      <fieldset>
        <legend>{action === 'platform' ? 'Versioned platform' : 'Candidate withdrawal'}</legend>
        <label>
          Candidate
          <select name="candidateId" required>
            <option value="">Choose candidate</option>
            {selected?.candidates
              .filter((candidate) => !candidate.withdrawn)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.fullName}
                </option>
              ))}
          </select>
        </label>
        {action === 'platform' ? (
          <>
            <label>
              Platform title
              <input name="title" required maxLength={160} />
            </label>
            <label>
              Complete platform text
              <textarea name="content" required maxLength={2000} />
            </label>
            <p>
              Creates the next immutable platform version and its content hash. This does not create
              a candidate cryptographic signature.
            </p>
          </>
        ) : (
          <p className="destructive-note">
            Withdraws the candidate while retaining their record. You will review this action before
            it is applied.
          </p>
        )}
      </fieldset>
    );
  if (action === 'promise')
    return (
      <fieldset>
        <legend>New promise</legend>
        <label>
          Current platform
          <select name="platformId" required>
            <option value="">Choose platform</option>
            {selected?.candidates
              .filter((candidate) => !candidate.withdrawn)
              .flatMap((candidate) =>
                candidate.platforms.slice(0, 1).map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {candidate.fullName} · v{platform.version}
                  </option>
                )),
              )}
          </select>
        </label>
        <label>
          Promise title
          <input name="title" required maxLength={160} />
        </label>
        <p>
          New promises start as Planned with 0% progress. Progress editing is not provided by the
          current management API.
        </p>
      </fieldset>
    );
  if (action === 'recallPolicy')
    return (
      <fieldset>
        <legend>Recall permissions and limits</legend>
        <label>
          <input
            name="recallEnabled"
            type="checkbox"
            defaultChecked={selected?.recallEnabled ?? true}
          />
          Recall enabled
        </label>
        <label>
          <input
            name="fullRecallEnabled"
            type="checkbox"
            defaultChecked={selected?.fullRecallEnabled ?? true}
          />
          Full recall enabled
        </label>
        <label>
          <input
            name="partialRecallEnabled"
            type="checkbox"
            defaultChecked={selected?.partialRecallEnabled ?? true}
          />
          Partial recall enabled
        </label>
        <div className="form-row">
          <label>
            Partial recall amount · units
            <input
              name="partialRecallAmount"
              type="number"
              min="1"
              max="100"
              required
              defaultValue={selected?.partialRecallAmount ?? 25}
            />
          </label>
          <label>
            Maximum recall operations
            <input
              name="maxRecallOperations"
              type="number"
              min="1"
              max="100"
              defaultValue={selected?.maxRecallOperations ?? ''}
            />
            <small>Leave blank for unlimited.</small>
          </label>
        </div>
        <div className="form-row">
          <label>
            First recall delay · seconds
            <input
              name="firstRecallDelaySeconds"
              type="number"
              min="0"
              max="31536000"
              required
              defaultValue={selected?.firstRecallDelaySeconds ?? 0}
            />
          </label>
          <label>
            Cooldown · seconds
            <input
              name="recallCooldownSeconds"
              type="number"
              min="0"
              max="31536000"
              required
              defaultValue={selected?.recallCooldownSeconds ?? 0}
            />
          </label>
        </div>
      </fieldset>
    );
  return (
    <div className="lifecycle-note">
      <strong>
        {action === 'activate'
          ? 'Publish and lock the election'
          : action === 'close'
            ? 'End participation'
            : 'Archive the finished election'}
      </strong>
      <p>
        {action === 'activate'
          ? 'At least two candidates are required. Activation publishes the election and freezes its configuration, candidates and platforms.'
          : action === 'close'
            ? 'Closing stops voting and recall immediately. Existing ballots and audit records remain.'
            : 'Archiving changes the election state while retaining its public record.'}
      </p>
    </div>
  );
}
