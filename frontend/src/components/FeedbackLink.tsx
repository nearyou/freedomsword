'use client';

import { MessageCircle } from 'lucide-react';
import { feedbackBotUrl } from '@frontend/lib/feedback';
import { openTelegramLink } from '@frontend/hooks/useTelegram';

export default function FeedbackLink({ className = 'feedback-link', label = 'Share feedback',
  unavailableLabel = 'Feedback bot coming soon' }: {
  className?: string;
  label?: string;
  unavailableLabel?: string;
}) {
  const href = feedbackBotUrl();
  if (!href) return <span className={className} aria-disabled="true">
    <MessageCircle size={16} aria-hidden="true" /><span>{unavailableLabel}</span>
  </span>;
  return <a className={className} href={href} aria-label={label} target="_blank" rel="noopener noreferrer"
    onClick={(event) => { if (openTelegramLink(event.currentTarget.href)) event.preventDefault(); }}>
    <MessageCircle size={16} aria-hidden="true" /><span>{label}</span>
  </a>;
}
