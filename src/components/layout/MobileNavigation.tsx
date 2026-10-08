import { navigation } from './navigation';
import type { AppTab } from '@/lib/ui';
export default function MobileNavigation({
  tab,
  onTab,
}: {
  tab: AppTab;
  onTab: (tab: AppTab) => void;
}) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navigation.map(({ value, mobileLabel, icon: Icon }) => (
        <button
          type="button"
          key={value}
          className={tab === value ? 'active' : ''}
          aria-current={tab === value ? 'page' : undefined}
          onClick={() => onTab(value)}
        >
          <Icon size={21} />
          <span>{mobileLabel}</span>
        </button>
      ))}
    </nav>
  );
}
