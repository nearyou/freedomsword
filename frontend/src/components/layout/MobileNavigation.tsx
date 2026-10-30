import { navigation } from './navigation';
import type { AppTab } from '@frontend/lib/ui';
import { useLanguage } from '@frontend/hooks/useLanguage';
export default function MobileNavigation({
  tab,
  onTab,
}: {
  tab: AppTab;
  onTab: (tab: AppTab) => void;
}) {
  const [language] = useLanguage();
  return (
    <nav className="mobile-nav" aria-label={language === 'uk' ? 'Мобільне меню' : 'Mobile navigation'}>
      {navigation.map(({ value, mobileLabel, labelUk, icon: Icon }) => (
        <button
          type="button"
          key={value}
          className={tab === value ? 'active' : ''}
          aria-current={tab === value ? 'page' : undefined}
          onClick={() => onTab(value)}
        >
          <Icon size={21} />
          <span>{language === 'uk' ? labelUk : mobileLabel}</span>
        </button>
      ))}
    </nav>
  );
}
