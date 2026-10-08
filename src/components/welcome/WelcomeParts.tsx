import { ArrowRight, Check, ChevronRight, type LucideProps } from 'lucide-react';
import type { WelcomeCopy } from './copy';

export function CitizenIdentityIcon(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M16 28H3v-5a9 9 0 0 1 15-6" />
      <path d="M23 15c2 2 5 3 7 3v6c0 4-4 7-7 8-3-1-7-4-7-8v-6c2 0 5-1 7-3Z" />
      <path d="m20 23 2 2 4-5" />
    </svg>
  );
}

export function Ornament({ small = false }: { small?: boolean }) {
  return (
    <div className={`civic-ornament ${small ? 'small' : ''}`} aria-hidden="true">
      <span />
      <i>◊</i>
      <span />
    </div>
  );
}

export function GoldButton({
  children,
  busy = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button {...props} className={`civic-gold-button ${props.className ?? ''}`} aria-busy={busy}>
      {busy && <span className="civic-spinner" aria-hidden="true" />}
      <span>{children}</span>
      {!busy && <ArrowRight size={23} strokeWidth={1.6} aria-hidden="true" />}
    </button>
  );
}

export function StepCard({
  number,
  title,
  description,
  icon: Icon,
  complete,
  onClick,
  t,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ComponentType<LucideProps>;
  complete: boolean;
  onClick: () => void;
  t: WelcomeCopy;
}) {
  return (
    <button
      type="button"
      className={`civic-step-card ${complete ? 'is-complete' : ''}`}
      onClick={onClick}
    >
      <span className="civic-seal">
        <Icon strokeWidth={1.35} aria-hidden="true" />
        {complete && (
          <span className="civic-complete-check">
            <Check size={12} strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="civic-step-content">
        <span className="civic-eyebrow">
          {t.step} {number}
          {complete && <span className="civic-complete-label"> · {t.complete}</span>}
        </span>
        <span className="civic-card-title">{title}</span>
        <span className="civic-card-copy">{description}</span>
      </span>
      <ChevronRight className="civic-card-arrow" size={24} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
