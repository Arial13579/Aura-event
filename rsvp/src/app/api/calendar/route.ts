import { getPublicDoc } from '@/lib/firestore-rest';

export const dynamic = 'force-dynamic';

function stamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function esc(s: string) {
  return s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
}

export async function GET() {
  const s = await getPublicDoc('settings/event');
  const iso = typeof s?.eventDate === 'string' ? s.eventDate : '';
  if (!iso) return new Response('Not found', { status: 404 });
  const start = new Date(iso);
  const end = new Date(start.getTime() + 5 * 3600 * 1000);
  const title = `החתונה של ${s?.coupleNames || ''}`.trim();
  const location = [s?.venueName, s?.venueAddress].filter(Boolean).join(', ');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AURA EVENT//RSVP//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wedding-${stamp(start)}@aura-event`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(location)}`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return new Response(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="wedding.ics"' },
  });
}
