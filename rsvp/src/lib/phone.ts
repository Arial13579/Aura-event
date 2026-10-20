/** Normalizes a phone number to international digits (972501234567). Returns '' when unusable. */
export function normalizePhone(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();
  const plus = s.startsWith('+');
  s = s.replace(/\D/g, '');
  if (!s) return '';
  if (!plus) {
    if (s.startsWith('00')) s = s.slice(2);
    else if (s.startsWith('0')) s = '972' + s.slice(1);
    else if (s.length === 9 && s.startsWith('5')) s = '972' + s;
  }
  if (s.startsWith('9720')) s = '972' + s.slice(4);
  return s.length >= 8 ? s : '';
}

/** 972501234567 → 050-123-4567 */
export function formatPhone(intl: string): string {
  if (!intl) return '';
  if (intl.startsWith('972')) {
    const local = '0' + intl.slice(3);
    if (local.length === 10) return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
    return local;
  }
  return '+' + intl;
}

export function isMobile(intl: string): boolean {
  return /^9725\d{8}$/.test(intl);
}
