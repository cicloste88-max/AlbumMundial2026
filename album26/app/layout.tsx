import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Saira } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const saira = Saira({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-saira' });

export const metadata: Metadata = {
  title: 'Álbum 2026 — Cromos',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#F4F1E6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${saira.variable}`}>
      <body>{children}</body>
    </html>
  );
}
