import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Saira, Baloo_2, Barlow_Semi_Condensed } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const saira = Saira({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-saira' });
const baloo = Baloo_2({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-baloo' });
const barlow = Barlow_Semi_Condensed({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-barlow' });

// Fv3.6: iconos PWA servidos desde el bucket público (no hay /icons/ en el repo)
const ICON_192 = 'https://cmyfyswystjgzdwbqyyb.supabase.co/storage/v1/object/public/flags/icons/icon-192.png';

export const metadata: Metadata = {
  title: 'Álbum 2026 — Cromos',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Álbum 26' },
  icons: { apple: ICON_192 },
};

export const viewport: Viewport = {
  themeColor: '#1E1B33',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${saira.variable} ${baloo.variable} ${barlow.variable}`}>
      <body>
        {children}
        {process.env.NODE_ENV === 'production' && (
          // Fv3.6: registro del SW solo en producción (en dev interfiere con HMR)
          <script
            dangerouslySetInnerHTML={{
              __html:
                "if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}",
            }}
          />
        )}
      </body>
    </html>
  );
}
