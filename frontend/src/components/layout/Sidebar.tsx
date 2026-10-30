import Link from 'next/link';
import { Users, ArrowUpRight } from 'lucide-react';
import BrandMark from '../ui/BrandMark';
import { navigation } from './navigation';
import type { AppTab } from '@frontend/lib/ui';
import { useLanguage } from '@frontend/hooks/useLanguage';
export default function Sidebar({
  tab,
  onTab,
  onPassport,
}: {
  tab: AppTab;
  onTab: (tab: AppTab) => void;
  onPassport: () => void;
}) {
  const [language] = useLanguage();
  const uk = language === 'uk';
  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <BrandMark />
        <span>FreedomSword</span>
      </Link>
      <p className="nav-label">{uk ? 'Почувайтеся як удома' : 'Make yourself at home'}</p>
      <nav aria-label={uk ? 'Головне меню' : 'Main navigation'}>
        {navigation.map(({ value, label, labelUk, icon: Icon }) => (
          <button
            type="button"
            key={value}
            className={`nav-item ${tab === value ? 'active' : ''}`}
            aria-current={tab === value ? 'page' : undefined}
            onClick={() => onTab(value)}
          >
            <Icon size={19} />
            {uk ? labelUk : label}
            {tab === value && <span className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-card">
        <Users size={25} />
        <h3>{uk ? 'Ваш голос важливий.' : 'Your voice matters.'}</h3>
        <p>{uk ? 'Тут є місце для різних поглядів. І для ваших також.' : 'Different views belong here. There’s room for yours, too.'}</p>
        <button onClick={onPassport}>
          {uk ? 'Ваша участь' : 'Your participation'} <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="sidebar-footer">
        <span className="mini-dot" /> {uk ? 'Міні застосунок Telegram' : 'Telegram Mini App'}
        <span className="version">{uk ? 'Вигадане демо' : 'Fictional demo'}</span>
      </div>
    </aside>
  );
}
