export const inviteUrl = 'https://freedomsword.org';
export const inviteText = 'True democracy starts with your voice.\nDon’t wait to take part.\nVote now with me on FreedomSword, and help shape the country’s future.';
const url = encodeURIComponent(inviteUrl);
const text = encodeURIComponent(inviteText);
export const shareNetworks = [
  { name: 'Telegram', url: `https://t.me/share/url?url=${url}&text=${text}` },
  { name: 'WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(`${inviteText}\n${inviteUrl}`)}` },
  { name: 'X', url: `https://x.com/intent/post?text=${text}&url=${url}` },
  { name: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
  { name: 'LinkedIn', url: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
  { name: 'Reddit', url: `https://www.reddit.com/submit?url=${url}&title=${text}` },
  { name: 'Email', url: `mailto:?subject=Join%20me%20on%20FreedomSword&body=${encodeURIComponent(`${inviteText}\n${inviteUrl}`)}` },
];
