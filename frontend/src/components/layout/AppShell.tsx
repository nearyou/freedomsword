import { openTelegramLink } from '@frontend/hooks/useTelegram';
import { ChevronRight, MessageCircle, ShieldCheck } from 'lucide-react';
import BrandMark from '../ui/BrandMark';
import Sidebar from './Sidebar';
import MobileNavigation from './MobileNavigation';
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
              Citizen space <ChevronRight size={14} />
              <strong>{tab === 'Candidates' ? 'Elections' : tab}</strong>
            </div>
            <div className="topbar-actions">
              <a
                className="feedback-link"
                href="https://t.me/freedomswordbot?start=feedback"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open FreedomSword bot to send feedback"
                onClick={(event) => {
                  if (openTelegramLink(event.currentTarget.href)) event.preventDefault();
                }}
              >
                <MessageCircle size={16} />
                <span>Feedback</span>
              </a>
              <button
                className="connection"
                data-state={
                  citizen.connected ? (citizen.verified ? 'verified' : 'connected') : 'disconnected'
                }
                onClick={onPassport}
              >
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
