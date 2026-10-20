'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAdminData } from '@/components/AdminShell';
import { useAuth } from '@/components/AuthGate';
import { IconChevron, IconImage, IconTeam } from '@/components/Icons';
import { Spinner, useToast } from '@/components/ui';
import { removeInvitationImage, saveInvitationImage, saveSettings } from '@/lib/data';
import { compressInvitation } from '@/lib/image';
import { DEFAULT_SETTINGS, type EventSettings } from '@/lib/types';

/** ISO → value for <input type="datetime-local"> in local time */
function toLocalInput(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SettingsPage() {
  const { settings } = useAdminData();
  const { viewer, user, logout } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<EventSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (settings && !form) setForm(settings); }, [settings, form]);

  if (!form || !settings) return <div className="fullscreen-center" style={{ minHeight: '50vh' }}><Spinner /></div>;

  if (!viewer.isOwner) {
    return (
      <div className="stack">
        <div className="page-title">הגדרות</div>
        <div className="card stack">
          <div className="muted">מחובר/ת כ־<b dir="ltr">{user.email}</b> (שותף/ה)</div>
          <p className="muted" style={{ fontSize: 14 }}>פרטי האירוע ותמונת ההזמנה מנוהלים על ידי בעל האירוע. אפשר להוסיף מוזמנים ולשלוח להם הזמנות.</p>
          <button className="btn btn-ghost" onClick={logout}>התנתקות</button>
        </div>
      </div>
    );
  }

  const set = <K extends keyof EventSettings>(k: K, v: EventSettings[K]) => setForm({ ...form, [k]: v });

  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      const { invitationVersion: _ignored, ...rest } = form; // eslint-disable-line @typescript-eslint/no-unused-vars
      await saveSettings(rest);
      toast('ההגדרות נשמרו ✓');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const data = await compressInvitation(file);
      await saveInvitationImage(data);
      toast('ההזמנה הועלתה ✓');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div className="page-title">הגדרות האירוע</div>
        <div className="page-desc">כל מה שהאורחים רואים בדף ההזמנה</div>
      </div>

      <Link href="/admin/team" className="card row" style={{ gap: 14 }}>
        <div className="brand-mark" style={{ width: 42, height: 42, flex: 'none' }}><IconTeam /></div>
        <div className="grow">
          <div style={{ fontWeight: 700 }}>שותפים והרשאות</div>
          <div className="muted" style={{ fontSize: 13 }}>שליחת קישור הרשאה למי שיוסיף ויזמין גם את אנשי הקשר שלו</div>
        </div>
        <IconChevron />
      </Link>

      <div className="card stack">
        <div className="card-title" style={{ marginBottom: 0 }}>תמונת ההזמנה</div>
        {settings.invitationVersion ? (
          <img src={`/api/invitation?v=${settings.invitationVersion}`} alt="ההזמנה" style={{ borderRadius: 14, border: '1px solid var(--border)', maxHeight: 420, objectFit: 'contain', margin: '0 auto' }} />
        ) : (
          <button className="card center stack" style={{ alignItems: 'center', borderStyle: 'dashed', background: 'var(--bg-2)', padding: 30 }} onClick={() => fileRef.current?.click()}>
            <IconImage width={34} height={34} style={{ color: 'var(--gold)' }} />
            <div style={{ fontWeight: 700 }}>העלאת תמונת הזמנה</div>
            <div className="muted" style={{ fontSize: 13 }}>JPG או PNG, התמונה תכווץ אוטומטית</div>
          </button>
        )}
        <div className="row">
          <button className="btn grow" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? 'מעלה…' : settings.invitationVersion ? 'החלפת תמונה' : 'בחירת תמונה'}</button>
          {!!settings.invitationVersion && <button className="btn btn-danger" onClick={async () => { if (confirm('להסיר את תמונת ההזמנה?')) await removeInvitationImage(); }}>הסרה</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      </div>

      <div className="card stack">
        <div className="card-title" style={{ marginBottom: 0 }}>פרטי האירוע</div>
        <label className="field"><span>שמות בני הזוג</span><input className="input" value={form.coupleNames} onChange={(e) => set('coupleNames', e.target.value)} placeholder="אריאל & נועה" /></label>
        <label className="field"><span>כותרת</span><input className="input" value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="מתחתנים!" /></label>
        <label className="field">
          <span>תאריך ושעת האירוע (לספירה לאחור)</span>
          <input className="input" type="datetime-local" value={toLocalInput(form.eventDate)} onChange={(e) => set('eventDate', e.target.value ? new Date(e.target.value).toISOString() : '')} />
        </label>
        <div className="grid-2">
          <label className="field"><span>קבלת פנים</span><input className="input" type="time" value={form.receptionTime} onChange={(e) => set('receptionTime', e.target.value)} /></label>
          <label className="field"><span>חופה וקידושין</span><input className="input" type="time" value={form.chuppahTime} onChange={(e) => set('chuppahTime', e.target.value)} /></label>
        </div>
        <label className="field"><span>שם האולם</span><input className="input" value={form.venueName} onChange={(e) => set('venueName', e.target.value)} placeholder="אלגריה" /></label>
        <label className="field"><span>כתובת</span><input className="input" value={form.venueAddress} onChange={(e) => set('venueAddress', e.target.value)} placeholder="עיר / רחוב" /></label>
        <label className="field">
          <span>קישור Waze (לא חובה)</span>
          <input className="input" dir="ltr" value={form.wazeUrl} onChange={(e) => set('wazeUrl', e.target.value)} placeholder="https://waze.com/ul/..." />
          <span className="hint">אם ריק, הקישור ייווצר אוטומטית לפי שם האולם והכתובת. לדיוק מקסימלי: ב־Waze מחפשים את האולם ← שיתוף ← העתקת קישור.</span>
        </label>
        <label className="field"><span>טקסט נוסף בהזמנה</span><textarea className="textarea" rows={3} value={form.extraText} onChange={(e) => set('extraText', e.target.value)} /></label>
      </div>

      <div className="card stack">
        <div className="card-title" style={{ marginBottom: 0 }}>נוסחי הודעות</div>
        <label className="field"><span>הזמנה (סבב ראשון)</span><textarea className="textarea" rows={5} value={form.inviteTemplate} onChange={(e) => set('inviteTemplate', e.target.value)} /></label>
        <label className="field"><span>תזכורת (סבבים נוספים)</span><textarea className="textarea" rows={5} value={form.reminderTemplate} onChange={(e) => set('reminderTemplate', e.target.value)} /></label>
        <div className="hint">משתנים: {'{name}'} · {'{couple}'} · {'{date}'} · {'{venue}'} · {'{link}'}</div>
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setForm({ ...form, inviteTemplate: DEFAULT_SETTINGS.inviteTemplate, reminderTemplate: DEFAULT_SETTINGS.reminderTemplate })}>שחזור נוסח ברירת מחדל</button>
      </div>

      <div style={{ position: 'sticky', bottom: 'calc(92px + var(--safe-b))', zIndex: 5 }}>
        <button className="btn btn-gold btn-block" style={{ minHeight: 54 }} disabled={busy} onClick={save}>{busy ? 'שומר…' : 'שמירת הגדרות'}</button>
      </div>
    </div>
  );
}
