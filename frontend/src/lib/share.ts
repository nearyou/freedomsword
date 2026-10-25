export const inviteUrl = 'https://t.me/freedomswordbot';
export const inviteText = 'True democracy starts with your voice.\nDon’t wait to take part.\nVote with me on FreedomSword and help shape what comes next.\n\nFictional-election demo; the current ballot does not guarantee anonymity.';

const url = encodeURIComponent(inviteUrl);
const text = encodeURIComponent(inviteText);
export const shareDestinations = [
  { name: 'Telegram', symbol: '↗', style: 'telegram', href: `https://t.me/share/url?url=${url}&text=${text}` },
  { name: 'WhatsApp', symbol: 'W', style: 'whatsapp', href: `https://wa.me/?text=${encodeURIComponent(`${inviteText}\n${inviteUrl}`)}` },
  { name: 'X', symbol: 'X', style: 'x', href: `https://x.com/intent/post?text=${text}&url=${url}` },
  { name: 'Facebook', symbol: 'f', style: 'facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
  { name: 'LinkedIn', symbol: 'in', style: 'linkedin', href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
  { name: 'Reddit', symbol: 'r', style: 'reddit', href: `https://www.reddit.com/submit?url=${url}&title=${encodeURIComponent('Take part in the FreedomSword fictional-election demo')}` },
];
