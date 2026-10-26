import type { Metadata } from 'next';
import type { Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/playfair-display';
import './tokens.css';
import './globals.css';
import './shell.css';
import './screens.css';
import './admin.css';
export const metadata: Metadata = {
  title: 'FreedomSword',
  description: 'FreedomSword: your voice, continuously. A fictional Telegram democracy demo.',
  icons: { icon: '/brand/logo.jpg' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#151719',
  colorScheme: 'dark',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
