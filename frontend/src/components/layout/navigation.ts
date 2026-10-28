import { Vote, BarChart3, WalletCards, CheckCheck } from 'lucide-react';
import type { AppTab } from '@frontend/lib/ui';
export const navigation: {
  value: AppTab;
  label: string;
  mobileLabel: string;
  icon: typeof Vote;
}[] = [
  { value: 'Candidates', label: 'Elections', mobileLabel: 'Elections', icon: Vote },
  { value: 'Live results', label: 'Results', mobileLabel: 'Results', icon: BarChart3 },
  { value: 'My ballot', label: 'Your support', mobileLabel: 'Your support', icon: WalletCards },
  { value: 'Accountability', label: 'Promises', mobileLabel: 'Promises', icon: CheckCheck },
];
