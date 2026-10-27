export function feedbackBotUrl(username = process.env.NEXT_PUBLIC_FEEDBACK_BOT_USERNAME) {
  const name = username?.trim().replace(/^@/, '');
  if (!name || !/^[a-z][a-z0-9_]{4,31}$/i.test(name) || !/bot$/i.test(name) ||
    name.toLowerCase() === 'freedomswordbot')
    return null;
  return `https://t.me/${name}`;
}
