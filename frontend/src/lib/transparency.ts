import { backendOrigin } from './backend-url';

export interface TransparencyView {
  election: {
    title: string;
    description: string;
    type: string;
    status: string;
    opensAt: string;
    closesAt: string;
    recallPolicy: {
      enabled: boolean;
      partialAmount: number;
      firstDelaySeconds: number;
      cooldownSeconds: number;
      maxOperations: number | null;
    };
  };
  totals: { participation: number; voteUnitsCast: number; recalledUnits: number; activeUnits: number };
  candidates: {
    id: string;
    fullName: string;
    party: string;
    ideology: string;
    withdrawn: boolean;
    color: string;
    bio: string;
    activeUnits: number;
    ballotCount: number;
    platforms: { version: number; title: string; contentHash: string }[];
  }[];
  audit: {
    note: string;
    recentEvents: {
      sequence: number;
      commitment: string;
      blockchain: { status: string } | null;
    }[];
  };
}

export async function fetchTransparency(id: string): Promise<TransparencyView | null> {
  const response = await fetch(`${backendOrigin()}/api/elections/${encodeURIComponent(id)}/transparency`,
    { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Election transparency is temporarily unavailable');
  return response.json() as Promise<TransparencyView>;
}
