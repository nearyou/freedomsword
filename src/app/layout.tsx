import type { Metadata } from 'next';
import type { Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/playfair-display';
import './globals.css';
import './theme.css';
import './redesign.css';
import './elections-clarity.css';
export const metadata: Metadata = {
  title: 'FreedomSword',
  description: 'FreedomSword: your voice, continuously. A fictional Telegram democracy demo.',
  icons: { icon: '/brand/logo.jpg' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#071522',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
