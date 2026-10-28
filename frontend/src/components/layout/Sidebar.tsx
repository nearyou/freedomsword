import Link from 'next/link';
import { Users, ArrowUpRight } from 'lucide-react';
import BrandMark from '../ui/BrandMark';
import { navigation } from './navigation';
import type { AppTab } from '@frontend/lib/ui';
export default function Sidebar({
  tab,
  onTab,
  onPassport,
}: {
  tab: AppTab;
  onTab: (tab: AppTab) => void;
  onPassport: () => void;
}) {
  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <BrandMark />
        <span>FreedomSword</span>
      </Link>
      <p className="nav-label">Make yourself at home</p>
      <nav aria-label="Main navigation">
        {navigation.map(({ value, label, icon: Icon }) => (
          <button
            type="button"
            key={value}
            className={`nav-item ${tab === value ? 'active' : ''}`}
            aria-current={tab === value ? 'page' : undefined}
            onClick={() => onTab(value)}
          >
            <Icon size={19} />
            {label}
            {tab === value && <span className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-card">
        <Users size={25} />
        <h3>Your voice matters.</h3>
        <p>Different views belong here. There’s room for yours, too.</p>
        <button onClick={onPassport}>
          Your participation <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="sidebar-footer">
        <span className="mini-dot" /> Telegram Mini App
        <span className="version">Fictional demo</span>
      </div>
    </aside>
  );
}
