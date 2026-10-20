const TZ = 'Asia/Jerusalem';

const GEMATRIA: [number, string][] = [
  [400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'], [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'],
  [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'], [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'],
  [3, 'ג'], [2, 'ב'], [1, 'א'],
];

function toGematria(n: number): string {
  let out = '';
  let rest = n;
  for (const [v, l] of GEMATRIA) {
    while (rest >= v) {
      out += l;
      rest -= v;
    }
  }
  out = out.replace('יה', 'טו').replace('יו', 'טז');
  return out.length === 1 ? out + '׳' : out.slice(0, -1) + '״' + out.slice(-1);
}

/** e.g. "י״ט בכסלו תשפ״ז" */
export function hebrewDate(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).formatToParts(date);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    const month = parts.find((p) => p.type === 'month')?.value || '';
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    if (!day || !year) return '';
    return `${toGematria(day)} ${month.startsWith('ב') ? month : 'ב' + month} ${toGematria(year % 1000)}`;
  } catch {
    return '';
  }
}

export function longDate(date: Date): string {
  return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(date);
}

export function shortDate(date: Date): string {
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: TZ }).format(date);
}

export function timeOf(date: Date): string {
  return new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(date);
}

export function relativeTime(ms: number | null): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'עכשיו';
  if (min < 60) return `לפני ${min} דק׳`;
  const h = Math.round(min / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.round(h / 24);
  if (d < 30) return `לפני ${d} ימים`;
  return shortDate(new Date(ms));
}

export function wazeLink(s: { wazeUrl: string; venueName: string; venueAddress: string }): string {
  if (s.wazeUrl) return s.wazeUrl;
  const q = [s.venueName, s.venueAddress].filter(Boolean).join(' ');
  return `https://waze.com/ul?q=${encodeURIComponent(q || 'אלגריה')}&navigate=yes`;
}

export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}
