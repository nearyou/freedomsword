// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLanguage, setLanguage } from '../frontend/src/hooks/useLanguage';
import MobileNavigation from '../frontend/src/components/layout/MobileNavigation';
import ShareInvite from '../frontend/src/components/voting/ShareInvite';
import { getShareNetworks, invitationCopy, invitationMessage, inviteUrl } from '../frontend/src/lib/share';
import WelcomeScreen from '../frontend/src/components/welcome/WelcomeScreen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('next/image', () => ({ default: (props: Record<string, unknown>) => {
  const attributes = { ...props }; delete attributes.priority; delete attributes.unoptimized;
  return createElement('img', attributes);
} }));
vi.mock('../frontend/src/hooks/useTelegram', () => ({
  useTelegram: () => ({ launch: 'ready', onReady: vi.fn(), onError: vi.fn() }),
  useTelegramBackButton: vi.fn(), telegramHaptic: vi.fn(), openTelegramLink: () => false,
}));
vi.mock('../frontend/src/components/welcome/useWelcomeFlow', () => ({
  useWelcomeFlow: () => ({ verified: false, accepted: false, busy: false, error: '', clearError: vi.fn() }),
}));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear(); setLanguage('en');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); setLanguage('en');
});
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find((item) => item.textContent?.trim() === text)!;

it('keeps the choice from either opening screen when the citizen reaches the main menu', async () => {
  await act(async () => { root.render(createElement(WelcomeScreen)); });
  const choose = async (value: string) => {
    await act(async () => {
      const select = container.querySelector('select')!; select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };
  await choose('uk');
  expect(container.querySelector('h1')!.textContent).toContain('Ваш голос');
  await act(async () => { container.querySelector<HTMLButtonElement>('.fs-launch .fs-button')!.click(); });
  expect(container.querySelector('h1')!.textContent).toContain('Нове покоління');
  await choose('en'); await choose('uk');
  await act(async () => { root.render(createElement(MobileNavigation, { tab: 'Candidates', onTab: vi.fn() })); });
  expect(container.textContent).toContain('ВибориРезультатиВаша підтримкаОбіцянки');
  expect(localStorage.getItem('freedomsword-language')).toBe('uk');
  expect(document.documentElement.lang).toBe('uk');
  await act(async () => { setLanguage('en'); });
  expect(container.textContent).toContain('ElectionsResultsYour supportPromises');
});

it('uses the selected language for the invitation, network payloads, and Instagram copy action', async () => {
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  await act(async () => { setLanguage('uk'); root.render(createElement(ShareInvite)); });
  expect(container.querySelector('.invitation-message')!.textContent).toBe(invitationCopy.uk.text);
  await act(async () => { button('Більше').click(); });
  const networks = [...document.querySelectorAll<HTMLAnchorElement>('.share-networks a')];
  expect(networks).toHaveLength(8);
  expect(networks.every((network) => !!network.querySelector('svg[data-network]'))).toBe(true);
  const instagram = networks.find((network) => network.textContent === 'Instagram')!;
  instagram.addEventListener('click', (event) => event.preventDefault());
  await act(async () => { instagram.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
  expect(write).toHaveBeenLastCalledWith(`${invitationMessage('uk')}\n${inviteUrl}`);
  expect(document.body.textContent).toContain(invitationCopy.uk.instagramCopied);
  const telegram = new URL(getShareNetworks('uk').find((network) => network.name === 'Telegram')!.url);
  expect(telegram.searchParams.get('text')).toBe(invitationMessage('uk'));
  expect(telegram.searchParams.get('url')).toBe(inviteUrl);
});

it('restores a saved language after a new menu mounts and responds to another tab changing it', async () => {
  localStorage.setItem('freedomsword-language', 'uk');
  function Choice() { const [language] = useLanguage(); return createElement('span', null, language); }
  await act(async () => { root.render(createElement(Choice)); });
  expect(container.textContent).toBe('uk');
  await act(async () => {
    localStorage.setItem('freedomsword-language', 'en'); window.dispatchEvent(new StorageEvent('storage'));
  });
  expect(container.textContent).toBe('en');
});
