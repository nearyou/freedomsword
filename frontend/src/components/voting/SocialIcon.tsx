import { Facebook, Instagram, Linkedin, Mail, Send } from 'lucide-react';

/** Monochrome network marks stay legible on both interface themes. */
export default function SocialIcon({ name }: { name: string }) {
  const Icon = { Telegram: Send, Facebook, Instagram, LinkedIn: Linkedin, Email: Mail }[name];
  if (Icon) return <Icon size={18} aria-hidden="true" data-network={name} />;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" data-network={name}>
    {name === 'X' ? <path d="M4 3h4l12 18h-4L4 3Zm0 18 7-8m2-2 7-8" />
      : name === 'WhatsApp' ? <><path d="M4 17a9 9 0 1 1 3 3l-5 2 2-5Z" /><path d="m8 7-1 2c1 4 3 6 7 7l2-1-2-3-2 1-2-2 1-2-3-2Z" /></>
        : <><ellipse cx="12" cy="15" rx="8" ry="6" /><path d="m12 9 2-6 5 1M4 12a2 2 0 1 0-2 3m18-3a2 2 0 1 1 2 3m-14 3q4 3 8 0" /><circle cx="9" cy="14" r=".8" fill="currentColor" /><circle cx="15" cy="14" r=".8" fill="currentColor" /><circle cx="20" cy="4" r="2" /></>}
  </svg>;
}
