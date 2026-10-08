import type { Metadata } from 'next';
import type { Viewport } from 'next';
import './globals.css';
import './theme.css';
export const metadata: Metadata = {
  title: 'Dynamic Democracy',
  description: 'Your voice, continuously. A fictional Telegram democracy demo.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b1018' };
const initializeTheme = `(function(){
  var preference='system';
  try { var stored=localStorage.getItem('dd-theme'); if(stored==='light'||stored==='dark') preference=stored; } catch(e) {}
  var telegram=window.Telegram&&window.Telegram.WebApp;
  var scheme=telegram&&(telegram.colorScheme==='light'||telegram.colorScheme==='dark')?telegram.colorScheme:
    (window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
  var theme=preference==='system'?scheme:preference;
  document.documentElement.dataset.theme=theme;
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content',theme==='light'?'#f5f8fd':'#0b1018');
})();`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><script dangerouslySetInnerHTML={{ __html: initializeTheme }} />{children}</body>
    </html>
  );
}
