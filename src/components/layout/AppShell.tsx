import { ChevronRight, ShieldCheck } from 'lucide-react';
import BrandMark from '../ui/BrandMark';
import ThemeControl from '../ThemeControl';
import Sidebar from './Sidebar';
import MobileNavigation from './MobileNavigation';
import type { AppTab } from '@/lib/ui';
import type { CitizenView } from '@/lib/contracts';
export default function AppShell({
  children,
  tab,
  onTab,
  citizen,
  onPassport,
}: {
  children: React.ReactNode;
  tab: AppTab;
  onTab: (tab: AppTab) => void;
  citizen: CitizenView;
  onPassport: () => void;
}) {
  return (
    <>
      <div className="app-shell">
        <Sidebar tab={tab} onTab={onTab} onPassport={onPassport} />
        <div className="main-shell">
          <header className="topbar">
            <div className="mobile-brand">
              <BrandMark />
              <span>
                Dynamic<span>Democracy</span>
              </span>
            </div>
            <div className="breadcrumb">
              Citizen space <ChevronRight size={14} />
              <strong>{tab === 'Candidates' ? 'Elections' : tab}</strong>
            </div>
            <div className="topbar-actions">
              <ThemeControl />
              <button className="connection" onClick={onPassport}>
                <ShieldCheck size={15} />
                <span>
                  {citizen.connected
                    ? citizen.verified
                      ? 'MOCK verified'
                      : 'Connected'
                    : 'Connect Telegram'}
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
