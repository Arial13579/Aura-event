export type Status = 'pending' | 'yes' | 'maybe' | 'no';

export interface Guest {
  id: string;
  name: string;
  phone: string;
  tag: string;
  note: string;
  status: Status;
  adults: number;
  kids: number;
  addedByUid: string;
  addedByName: string;
  sentCount: number;
  createdAt: number | null;
  lastSentAt: number | null;
  respondedAt: number | null;
}

export interface EventSettings {
  coupleNames: string;
  headline: string;
  eventDate: string; // ISO string
  receptionTime: string;
  chuppahTime: string;
  venueName: string;
  venueAddress: string;
  wazeUrl: string;
  extraText: string;
  inviteTemplate: string;
  reminderTemplate: string;
  invitationVersion: number;
}

export const DEFAULT_SETTINGS: EventSettings = {
  coupleNames: 'אריאל & הכלה',
  headline: 'מתחתנים!',
  eventDate: '',
  receptionTime: '19:30',
  chuppahTime: '20:30',
  venueName: 'אלגריה',
  venueAddress: '',
  wazeUrl: '',
  extraText: 'נשמח לראותכם שותפים לשמחתנו',
  inviteTemplate:
    'היי {name} 💛\nשמחים להזמין אותך לחתונה של {couple} ב־{date} ב{venue}.\nלצפייה בהזמנה ולאישור הגעה:\n{link}',
  reminderTemplate:
    'היי {name}, תזכורת קטנה 🙏\nנשמח לדעת אם תגיעו לחתונה של {couple} ב־{date}.\nלאישור הגעה בלחיצה:\n{link}',
  invitationVersion: 0,
};

export const STATUS_META: Record<Status, { label: string; short: string; color: string }> = {
  yes: { label: 'מגיעים', short: 'מגיע/ה', color: 'var(--yes)' },
  maybe: { label: 'מתלבטים', short: 'מתלבט/ת', color: 'var(--maybe)' },
  no: { label: 'לא מגיעים', short: 'לא מגיע/ה', color: 'var(--no)' },
  pending: { label: 'טרם ענו', short: 'טרם ענה', color: 'var(--pending)' },
};

export const STATUS_ORDER: Status[] = ['yes', 'maybe', 'no', 'pending'];
