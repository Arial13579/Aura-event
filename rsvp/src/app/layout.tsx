import type { Metadata, Viewport } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';

const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-heebo', display: 'swap' });

export const metadata: Metadata = {
  title: 'אישורי הגעה · החתונה שלנו',
  description: 'אישורי הגעה לחתונה',
  
  appleWebApp: { capable: true, title: 'החתונה שלנו', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f9f9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body>{children}</body>
    </html>
  );
}
