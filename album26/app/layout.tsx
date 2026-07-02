import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Saira, Baloo_2, Barlow_Semi_Condensed } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const saira = Saira({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-saira' });
const baloo = Baloo_2({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-baloo' });
const barlow = Barlow_Semi_Condensed({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-barlow' });

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
    <html lang="es" className={`${inter.variable} ${saira.variable} ${baloo.variable} ${barlow.variable}`}>
      <body>{children}</body>
    </html>
  );
}
