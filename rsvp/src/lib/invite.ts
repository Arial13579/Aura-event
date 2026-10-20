'use client';

import { fillTemplate, longDate } from './format';
import { formatPhone } from './phone';
import type { EventSettings, Guest } from './types';

export function guestLink(id: string): string {
  return `${window.location.origin}/i/${id}`;
}

export function buildMessage(template: string, s: EventSettings, g: Guest): string {
  const date = s.eventDate ? longDate(new Date(s.eventDate)) : '';
  return fillTemplate(template, {
    name: g.name.split(' ')[0] || g.name,
    fullname: g.name,
    couple: s.coupleNames,
    date,
    venue: s.venueName,
    link: guestLink(g.id),
  });
}

export function whatsappUrl(phone: string, text: string): string {
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function smsUrl(phone: string, text: string): string {
  // iOS uses "&body=" after the recipient
  return `sms:${phone ? '+' + phone : ''}&body=${encodeURIComponent(text)}`;
}

let cachedImage: { v: number; file: File } | null = null;

async function invitationFile(version: number): Promise<File | null> {
  if (!version) return null;
  if (cachedImage?.v === version) return cachedImage.file;
  const res = await fetch(`/api/invitation?v=${version}`);
  if (!res.ok) return null;
  const blob = await res.blob();
  const file = new File([blob], 'הזמנה.jpg', { type: blob.type || 'image/jpeg' });
  cachedImage = { v: version, file };
  return file;
}

/** Opens the iOS share sheet with the invitation image + the personal message. */
export async function shareInvitation(text: string, version: number): Promise<boolean> {
  const file = await invitationFile(version);
  const data: ShareData = file && navigator.canShare?.({ files: [file] }) ? { files: [file], text } : { text };
  if (!navigator.share) return false;
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}

export function guestsToCsv(guests: Guest[]): string {
  const STATUS: Record<string, string> = { yes: 'מגיע', maybe: 'מתלבט', no: 'לא מגיע', pending: 'טרם ענה' };
  const rows = [['שם', 'טלפון', 'קבוצה', 'סטטוס', 'מבוגרים', 'ילדים', 'נשלח', 'הוסף ע"י', 'הערה', 'קישור אישי']];
  for (const g of guests) {
    rows.push([g.name, formatPhone(g.phone), g.tag, STATUS[g.status], String(g.adults), String(g.kids), String(g.sentCount), g.addedByName, g.note, guestLink(g.id)]);
  }
  return '﻿' + rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
}
