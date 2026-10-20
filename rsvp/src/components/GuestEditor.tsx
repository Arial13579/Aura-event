'use client';

import { useEffect, useState } from 'react';
import { addGuests, updateGuest } from '@/lib/data';
import { formatPhone, normalizePhone } from '@/lib/phone';
import { STATUS_META, STATUS_ORDER, type Guest, type Status } from '@/lib/types';
import { useAuth } from './AuthGate';
import { Sheet, Stepper, useToast } from './ui';

export function GuestEditor({ open, onClose, guest, tags }: { open: boolean; onClose: () => void; guest: Guest | null; tags: string[] }) {
  const { viewer } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tag, setTag] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Status>('pending');
  const [adults, setAdults] = useState(0);
  const [kids, setKids] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(guest?.name || '');
    setPhone(guest ? formatPhone(guest.phone) : '');
    setTag(guest?.tag || '');
    setNote(guest?.note || '');
    setStatus(guest?.status || 'pending');
    setAdults(guest?.adults || 0);
    setKids(guest?.kids || 0);
    setError('');
  }, [open, guest]);

  async function save(addAnother = false) {
    const p = normalizePhone(phone);
    if (!name.trim()) return setError('נא להזין שם');
    if (phone && !p) return setError('מספר הטלפון לא תקין');
    setBusy(true);
    try {
      if (guest) {
        const patch: Partial<Guest> = { name: name.trim(), phone: p, tag: tag.trim(), note: note.trim() };
        if (status !== guest.status || adults !== guest.adults || kids !== guest.kids) {
          Object.assign(patch, { status, adults: status === 'yes' ? adults : 0, kids: status === 'yes' ? kids : 0 });
        }
        await updateGuest(guest.id, patch);
        toast('נשמר');
        onClose();
      } else {
        await addGuests(viewer, [{ name, phone: p, tag, note }]);
        toast(`${name.trim()} נוסף/ה`);
        if (addAnother) { setName(''); setPhone(''); setNote(''); } else onClose();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={guest ? 'עריכת מוזמן' : 'הוספת מוזמן ידנית'}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field"><span>שם מלא</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="ישראל ישראלי" /></label>
        <label className="field"><span>טלפון</span><input className="input" type="tel" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-000-0000" /></label>
        <label className="field">
          <span>קבוצה</span>
          <input className="input" list="tag-list-editor" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="משפחה / חברים / עבודה" />
          <datalist id="tag-list-editor">{tags.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <label className="field"><span>הערה</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="לא חובה" /></label>

        {guest && (
          <div className="card stack" style={{ background: 'var(--bg-2)' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>עדכון סטטוס ידני</div>
            <div className="segmented">
              {STATUS_ORDER.map((s) => (
                <button key={s} type="button" className={status === s ? 'on' : ''} onClick={() => setStatus(s)} style={status === s ? { color: STATUS_META[s].color } : undefined}>
                  {STATUS_META[s].short}
                </button>
              ))}
            </div>
            {status === 'yes' && (
              <div className="row wrap" style={{ justifyContent: 'space-around', gap: 16 }}>
                <div className="stack center" style={{ gap: 6, alignItems: 'center' }}><span className="muted" style={{ fontSize: 13 }}>מבוגרים</span><Stepper value={adults} onChange={setAdults} /></div>
                <div className="stack center" style={{ gap: 6, alignItems: 'center' }}><span className="muted" style={{ fontSize: 13 }}>ילדים</span><Stepper value={kids} onChange={setKids} /></div>
              </div>
            )}
          </div>
        )}

        {error && <div style={{ color: 'var(--no)', fontSize: 13 }}>{error}</div>}
        <div className="row">
          {!guest && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save(true)}>שמירה והוספת עוד</button>}
          <button type="submit" className="btn btn-primary grow" disabled={busy}>{busy ? 'שומר…' : 'שמירה'}</button>
        </div>
      </form>
    </Sheet>
  );
}
