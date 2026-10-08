import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import BrandMark from '../ui/BrandMark';
import { navigation } from './navigation';
import type { AppTab } from '@/lib/ui';
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
        <span>
          Dynamic<span className="brand-second">Democracy</span>
        </span>
      </Link>
      <p className="nav-label">YOUR CITIZEN SPACE</p>
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
        <ShieldCheck size={25} />
        <h3>Your voice stays yours.</h3>
        <p>Support can change. Keep your representatives accountable.</p>
        <button onClick={onPassport}>
          Citizen Passport <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="sidebar-footer">
        <span className="mini-dot" /> Telegram Mini App
        <span className="version">Fictional demo</span>
      </div>
    </aside>
  );
}
