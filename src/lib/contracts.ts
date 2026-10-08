export interface PromiseView {
  id: string;
  title: string;
  progress: number;
  status: string;
  evidence: string;
}
export interface PlatformView {
  id: string;
  version: number;
  title: string;
  content: string;
  contentHash: string;
  signatures: number;
  promises: PromiseView[];
}
export interface CandidateView {
  id: string;
  electionId: string;
  fullName: string;
  party: string;
  ideology: string;
  bio: string;
  color: string;
  units: number;
  platform: PlatformView | null;
}
export interface ElectionView {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  recallPolicy?: {
    enabled: boolean;
    fullEnabled: boolean;
    partialEnabled: boolean;
    partialAmount: number;
    firstDelaySeconds: number;
    cooldownSeconds: number;
    maxOperations: number | null;
  };
  opensAt: string;
  closesAt: string;
  activeUnits: number;
  recalledUnits: number;
  ballotCount: number;
  candidates: CandidateView[];
}
export interface CitizenView {
  connected: boolean;
  verified: boolean;
  provider: string;
  agreementSigned: boolean;
  signedPlatforms: string[];
  votes: { electionId: string; candidateId: string; balance: number }[];
}
export interface AuditView {
  sequence: number;
  commitment: string;
  previousHash: string;
  hash: string;
  blockchain: { adapter: string; status: string; receipt: string | null } | null;
}
export function searchCandidates(candidates: CandidateView[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  return candidates.filter((candidate) => candidate.fullName.toLocaleLowerCase().includes(needle));
}
