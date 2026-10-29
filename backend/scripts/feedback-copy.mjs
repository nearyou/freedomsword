export const feedbackDescription = 'Надішліть повідомлення або знімок екрана, щоб допомогти покращити FreedomSword. Ваш відгук буде передано команді проєкту. Не надсилайте паролі, ключі гаманців або документи, що посвідчують особу.';
export const feedbackShortDescription = 'Зворотний зв’язок FreedomSword. Поділіться відгуком або повідомте про помилку команді проєкту.';
export const feedbackWelcome = 'Вітаємо! Надішліть тут відгук про FreedomSword або знімок екрана. Ваше повідомлення буде передано команді проєкту. Не надсилайте паролі, ключі гаманців або документи, що посвідчують особу.';
export const feedbackUnsupported = 'Будь ласка, надішліть повідомлення або знімок екрана з описом проблеми.';
export const feedbackThanks = 'Дякуємо! Ваш відгук передано команді FreedomSword.';

export async function configureFeedbackDescription(call, beforeApply = async () => {}) {
  if ((await call('getMe')).username?.toLowerCase() !== 'freedomsword_feedback_bot')
    throw new Error('Unexpected feedback bot; no changes made');
  const languages = ['', 'uk', 'en'];
  const previous = [];
  for (const language_code of languages) previous.push({ language_code,
    ...await call('getMyDescription', { language_code }),
    ...await call('getMyShortDescription', { language_code }) });
  await beforeApply(previous);
  for (const language_code of languages) {
    await call('setMyDescription', { language_code, description: feedbackDescription });
    await call('setMyShortDescription', { language_code, short_description: feedbackShortDescription });
    if ((await call('getMyDescription', { language_code })).description !== feedbackDescription ||
      (await call('getMyShortDescription', { language_code })).short_description !== feedbackShortDescription)
      throw new Error('Feedback description read-back did not match');
  }
}
