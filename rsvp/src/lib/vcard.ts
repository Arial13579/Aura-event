import { isMobile, normalizePhone } from './phone';

export interface ContactCandidate {
  key: string;
  name: string;
  phone: string; // normalized
  phones: string[];
}

function decodeQuotedPrintable(input: string): string {
  const bytes: number[] = [];
  const s = input.replace(/=\r?\n/g, '');
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
      bytes.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(s.charCodeAt(i));
    }
  }
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return s;
  }
}

function unescape(v: string) {
  return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

/** Picks the best phone: an Israeli mobile first, otherwise the first valid number. */
export function pickPhone(phones: string[]): string {
  return phones.find(isMobile) || phones[0] || '';
}

/** Parses a .vcf export (e.g. iPhone Contacts → Export) into name + phone candidates. */
export function parseVCard(text: string): ContactCandidate[] {
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
  const out: ContactCandidate[] = [];

  cards.forEach((card, idx) => {
    let fn = '';
    let n = '';
    let org = '';
    const phones: string[] = [];
    for (const rawLine of card.split('\n')) {
      const colon = rawLine.indexOf(':');
      if (colon < 0) continue;
      const head = rawLine.slice(0, colon).replace(/^item\d+\./i, '');
      let value = rawLine.slice(colon + 1);
      const [prop, ...params] = head.split(';');
      if (params.some((p) => /QUOTED-PRINTABLE/i.test(p))) value = decodeQuotedPrintable(value);
      const key = prop.toUpperCase();
      if (key === 'FN') fn = unescape(value);
      else if (key === 'N') n = unescape(value.split(';').slice(0, 2).reverse().filter(Boolean).join(' '));
      else if (key === 'ORG') org = unescape(value.split(';')[0]);
      else if (key === 'TEL') {
        const p = normalizePhone(value);
        if (p && !phones.includes(p)) phones.push(p);
      }
    }
    const name = fn || n || org;
    if (!name || phones.length === 0) return;
    out.push({ key: `v${idx}`, name, phone: pickPhone(phones), phones });
  });
  return out;
}

/** iOS Safari Contact Picker API (Settings → Safari → Advanced → Feature Flags → Contact Picker API). */
export function contactPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;
}

export async function pickFromDevice(): Promise<ContactCandidate[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  const results: { name?: string[]; tel?: string[] }[] = await nav.contacts.select(['name', 'tel'], { multiple: true });
  const out: ContactCandidate[] = [];
  results.forEach((c, i) => {
    const phones = Array.from(new Set((c.tel || []).map(normalizePhone).filter(Boolean)));
    const name = (c.name || []).find(Boolean) || '';
    if (!phones.length) return;
    out.push({ key: `d${i}`, name: name || phones[0], phone: pickPhone(phones), phones });
  });
  return out;
}
