import { ChevronRight, Globe2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@frontend/hooks/useLanguage';
import type { Language } from '../welcome/copy';
import FeedbackLink from '../FeedbackLink';
import BrandMark from '../ui/BrandMark';
import Sidebar from './Sidebar';
import MobileNavigation from './MobileNavigation';
import { navigation } from './navigation';
import type { AppTab } from '@frontend/lib/ui';
import type { CitizenView } from '@frontend/lib/contracts';
export default function AppShell({
  children,
  tab,
  onTab,
  citizen,
  onPassport,
  inTelegram,
}: {
  children: React.ReactNode;
  tab: AppTab;
  onTab: (tab: AppTab) => void;
  citizen: CitizenView;
  onPassport: () => void;
  inTelegram: boolean;
}) {
  const [language, setLanguage] = useLanguage();
  const uk = language === 'uk';
  const item = navigation.find((item) => item.value === tab);
  return (
    <>
      <div className="app-shell" data-telegram={inTelegram}>
        <Sidebar tab={tab} onTab={onTab} onPassport={onPassport} />
        <div className="main-shell">
          <header className="topbar">
            <div className="mobile-brand">
              <BrandMark />
              <span>FreedomSword</span>
            </div>
            <div className="breadcrumb">
              {uk ? 'Ваш простір' : 'Your space'} <ChevronRight size={14} />
              <strong>{uk ? item?.labelUk : item?.label}</strong>
            </div>
            <div className="topbar-actions">
              <label className="menu-language"><Globe2 size={15} aria-hidden="true" />
                <select aria-label={uk ? 'Змінити мову' : 'Change language'} value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}>
                  <option value="en">EN</option><option value="uk">УК</option>
                </select>
              </label>
              <FeedbackLink />
              <button className="connection" onClick={onPassport}
                aria-label={uk ? citizen.connected ? 'Відкрити кроки участі' : 'Підключіть Telegram' : citizen.connected ? 'Open your participation steps' : 'Connect Telegram'}>
                <ShieldCheck size={15} />
                <span>
                  {citizen.connected
                    ? citizen.verified
                      ? uk ? 'Демо перевірку завершено' : 'Demo check complete'
                      : uk ? 'Підключено' : 'Connected'
                    : uk ? 'Підключіть Telegram' : 'Connect Telegram'}
                </span>
                <ChevronRight size={14} />
              </button>
            </div>
          </header>
          <main className="citizen-main">{children}</main>
        </div>
      </div>
      <MobileNavigation tab={tab} onTab={onTab} />
    </>
  );
}
