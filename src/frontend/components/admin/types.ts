export type AdminElection = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  opensAt: string;
  closesAt: string;
  recallEnabled: boolean;
  fullRecallEnabled: boolean;
  partialRecallEnabled: boolean;
  partialRecallAmount: number;
  firstRecallDelaySeconds: number;
  recallCooldownSeconds: number;
  maxRecallOperations: number | null;
  candidates: {
    id: string;
    fullName: string;
    withdrawn: boolean;
    platforms: {
      id: string;
      version: number;
      title: string;
      contentHash: string;
      promises: { id: string; title: string }[];
    }[];
  }[];
};
export type AdminAction =
  | 'create'
  | 'edit'
  | 'addCandidate'
  | 'removeCandidate'
  | 'platform'
  | 'promise'
  | 'activate'
  | 'close'
  | 'archive'
  | 'recallPolicy';
export const labels: Record<AdminAction, string> = {
  create: 'Create election',
  edit: 'Edit election',
  addCandidate: 'Add candidate',
  removeCandidate: 'Withdraw candidate',
  platform: 'Create platform version',
  promise: 'Create promise',
  activate: 'Activate election',
  close: 'Close election',
  archive: 'Archive election',
  recallPolicy: 'Set recall policy',
};
export const requiresConfirmation = (action: AdminAction) =>
  ['activate', 'removeCandidate', 'close', 'archive'].includes(action);
export const destructive = (action: AdminAction) =>
  ['removeCandidate', 'close', 'archive'].includes(action);
export function localInputDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function displayedStatus(election: AdminElection, now: number) {
  if (['DRAFT', 'FINISHED', 'ARCHIVED'].includes(election.status)) return election.status;
  if (now >= new Date(election.closesAt).getTime()) return 'FINISHED';
  return now < new Date(election.opensAt).getTime() ? 'UPCOMING' : 'ACTIVE';
}
