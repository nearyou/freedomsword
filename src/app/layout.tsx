import type { Metadata } from 'next';
import type { Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import './theme.css';
export const metadata: Metadata = {
  title: 'FreedomSword',
  description: 'FreedomSword: your voice, continuously. A fictional Telegram democracy demo.',
  icons: { icon: '/brand/logo.jpg' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#090f1d',
};
const initializeTheme = `(function(){
  var preference='system';
  try { var stored=localStorage.getItem('dd-theme'); if(stored==='light'||stored==='dark') preference=stored; } catch(e) {}
  var telegram=window.Telegram&&window.Telegram.WebApp;
  var scheme=telegram&&telegram.initData&&(telegram.colorScheme==='light'||telegram.colorScheme==='dark')?telegram.colorScheme:
    (window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
  var theme=preference==='system'?scheme:preference;
  document.documentElement.dataset.theme=theme;
  var meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content',theme==='light'?'#f4f7fc':'#090f1d');
})();`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script
          id="dd-initialize-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: initializeTheme }}
        />
        {children}
      </body>
    </html>
  );
}
