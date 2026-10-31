// Shared by the invitation UI and the server-prepared Telegram picture message.
export const telegramInviteUrl = 'https://t.me/freedomswordbot?startapp';
export const invitationContent = {
  en: {
    text: 'True democracy starts with your anonymous vote.\nDon’t wait until you’re allowed to vote in an election.\nVote now with me, and influence the country’s future.',
    disclosure: 'Fictional demo. Votes are visible to the operator.',
  },
  uk: {
    text: 'Справжня демократія починається з твого анонімного голосу.\nНе чекай, поки тобі дозволять голосувати на виборах.\nГолосуй зараз зі мною та впливай на майбутнє країни.',
    disclosure: 'Вигадане демо. Голоси доступні оператору.',
  },
} as const;
