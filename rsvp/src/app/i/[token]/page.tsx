import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Frank_Ruhl_Libre } from 'next/font/google';
import { getPublicDoc } from '@/lib/firestore-rest';
import { DEFAULT_SETTINGS, type EventSettings, type Status } from '@/lib/types';
import { RsvpClient, type PublicGuest } from './RsvpClient';
import '../guest.css';

const serif = Frank_Ruhl_Libre({ subsets: ['hebrew', 'latin'], weight: ['400', '500', '700', '900'], variable: '--font-serif', display: 'swap' });

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ token: string }> };

async function load(token: string) {
  const safe = /^[A-Za-z0-9]{8,40}$/.test(token) ? token : '';
  const [guest, settings] = await Promise.all([
    safe ? getPublicDoc(`guests/${safe}`) : Promise.resolve(null),
    getPublicDoc('settings/event'),
  ]);
  return { guest, settings: { ...DEFAULT_SETTINGS, ...(settings || {}) } as EventSettings };
}

async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const { guest, settings } = await load(token);
  const base = await origin();
  const title = `${settings.coupleNames} ${settings.headline}`.trim();
  const description = guest ? `${guest.name}, נשמח לראותך! לחצו לצפייה בהזמנה ולאישור הגעה` : 'הזמנה ואישור הגעה';
  const images = settings.invitationVersion ? [{ url: `${base}/api/invitation?v=${settings.invitationVersion}`, alt: title }] : [];
  return {
    metadataBase: new URL(base),
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, images, type: 'website', locale: 'he_IL', url: `${base}/i/${token}` },
    twitter: { card: 'summary_large_image', title, description, images: images.map((i) => i.url) },
  };
}

export default async function GuestInvitePage({ params }: Props) {
  const { token } = await params;
  const { guest, settings } = await load(token);

  const pub: PublicGuest | null = guest
    ? {
        id: token,
        name: String(guest.name || ''),
        status: (guest.status as Status) || 'pending',
        adults: Number(guest.adults) || 0,
        kids: Number(guest.kids) || 0,
      }
    : null;

  return (
    <div className={serif.variable}>
      <RsvpClient guest={pub} settings={settings} />
    </div>
  );
}
