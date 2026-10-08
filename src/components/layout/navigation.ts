import { Vote, BarChart3, WalletCards, CheckCheck } from 'lucide-react';
import type { AppTab } from '@/lib/ui';
export const navigation: {
  value: AppTab;
  label: string;
  mobileLabel: string;
  icon: typeof Vote;
}[] = [
  { value: 'Candidates', label: 'Elections', mobileLabel: 'Elections', icon: Vote },
  { value: 'Live results', label: 'Live results', mobileLabel: 'Results', icon: BarChart3 },
  { value: 'My ballot', label: 'My ballot', mobileLabel: 'My ballot', icon: WalletCards },
  { value: 'Accountability', label: 'Accountability', mobileLabel: 'Promises', icon: CheckCheck },
];
