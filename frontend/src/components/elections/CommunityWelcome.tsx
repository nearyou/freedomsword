import { Users } from 'lucide-react';
import { useLanguage } from '@frontend/hooks/useLanguage';

export default function CommunityWelcome() {
  const [language] = useLanguage();
  return (
    <section className="community-welcome" aria-labelledby="community-welcome-title">
      <span className="community-welcome-icon"><Users size={25} aria-hidden="true" /></span>
      <div>
        <h2 id="community-welcome-title">{language === 'uk' ? 'Різні люди. Рівні голоси.' : 'Different people. Equal voices.'}</h2>
        <p>{language === 'uk' ? 'Вам тут раді. Знайомтеся з різними ідеями у власному темпі й обирайте те, що важливе для вас.' : 'You belong here. Take your time, explore different ideas, and choose what matters to you.'}</p>
      </div>
      <svg className="community-people" viewBox="0 0 180 80" aria-hidden="true" fill="none">
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="35" cy="23" r="9" fill="#d8e8df" />
          <circle cx="90" cy="23" r="9" fill="#eee1c4" />
          <circle cx="145" cy="23" r="9" fill="#d9e4ed" />
          <path d="M17 62V52a18 18 0 0 1 36 0v10M72 62V52a18 18 0 0 1 36 0v10M127 62V52a18 18 0 0 1 36 0v10" />
          <path d="M9 66h162" opacity=".35" />
        </g>
      </svg>
    </section>
  );
}
