import { Vote, BarChart3, WalletCards, CheckCheck } from 'lucide-react';
import type { AppTab } from '@frontend/lib/ui';
export const navigation: {
  value: AppTab;
  label: string;
  mobileLabel: string;
  labelUk: string;
  icon: typeof Vote;
}[] = [
  { value: 'Candidates', label: 'Elections', mobileLabel: 'Elections', labelUk: 'Вибори', icon: Vote },
  { value: 'Live results', label: 'Results', mobileLabel: 'Results', labelUk: 'Результати', icon: BarChart3 },
  { value: 'My ballot', label: 'Your support', mobileLabel: 'Your support', labelUk: 'Ваша підтримка', icon: WalletCards },
  { value: 'Accountability', label: 'Promises', mobileLabel: 'Promises', labelUk: 'Обіцянки', icon: CheckCheck },
];
