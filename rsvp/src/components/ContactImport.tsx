'use client';

import { useMemo, useRef, useState } from 'react';
import { contactPickerSupported, parseVCard, pickFromDevice, type ContactCandidate } from '@/lib/vcard';
import { formatPhone } from '@/lib/phone';
import { addGuests } from '@/lib/data';
import { useAuth } from './AuthGate';
import { IconCheck, IconContacts, IconFile, IconSearch } from './Icons';
import { Sheet, useToast } from './ui';

export function ContactImport({ open, onClose, existingPhones, tags }: { open: boolean; onClose: () => void; existingPhones: Set<string>; tags: string[] }) {
  const { viewer } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [candidates, setCandidates] = useState<ContactCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = typeof window !== 'undefined' && contactPickerSupported();

  function load(list: ContactCandidate[]) {
    const seen = new Set<string>();
    const unique = list.filter((c) => (seen.has(c.phone) ? false : (seen.add(c.phone), true)));
    unique.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    setCandidates(unique);
    // Pre-select only contacts that aren't invited yet
    setSelected(new Set(unique.filter((c) => !existingPhones.has(c.phone)).map((c) => c.key)));
    setError(unique.length ? '' : 'לא נמצאו אנשי קשר עם מספר טלפון');
  }

  async function fromDevice() {
    try { load(await pickFromDevice()); } catch (e) { setError((e as Error).message); }
  }

  async function fromFile(file: File) {
    const text = await file.text();
    load(parseVCard(text));
  }

  const filtered = useMemo(() => {
    if (!candidates) return [];
    const s = q.trim();
    return s ? candidates.filter((c) => c.name.includes(s) || c.phone.includes(s.replace(/\D/g, '') || '~')) : candidates;
  }, [candidates, q]);

  const allFilteredOn = filtered.length > 0 && filtered.every((c) => selected.has(c.key));

  function toggleAll() {
    const next = new Set(selected);
    filtered.forEach((c) => (allFilteredOn ? next.delete(c.key) : next.add(c.key)));
    setSelected(next);
  }

  async function save() {
    if (!candidates) return;
    const list = candidates.filter((c) => selected.has(c.key));
    setBusy(true);
    try {
      await addGuests(viewer, list.map((c) => ({ name: c.name, phone: c.phone, tag })));
      toast(`נוספו ${list.length} מוזמנים 🎉`);
      reset();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCandidates(null); setSelected(new Set()); setQ(''); setTag(''); setError('');
  }

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title="ייבוא מאנשי הקשר">
      {!candidates ? (
        <div className="stack">
          <button className="card row" style={{ textAlign: 'right', gap: 14 }} onClick={fromDevice} disabled={!supported}>
            <div className="brand-mark" style={{ width: 44, height: 44, flex: 'none' }}><IconContacts /></div>
            <div className="grow">
              <div style={{ fontWeight: 700 }}>בחירה מאנשי הקשר באייפון</div>
              <div className="muted" style={{ fontSize: 13 }}>{supported ? 'בוחרים אנשי קשר ישירות מהטלפון' : 'צריך להפעיל פעם אחת בהגדרות Safari (הסבר למטה)'}</div>
            </div>
          </button>
          <button className="card row" style={{ textAlign: 'right', gap: 14 }} onClick={() => fileRef.current?.click()}>
            <div className="brand-mark" style={{ width: 44, height: 44, flex: 'none' }}><IconFile /></div>
            <div className="grow">
              <div style={{ fontWeight: 700 }}>ייבוא קובץ אנשי קשר (vCard)</div>
              <div className="muted" style={{ fontSize: 13 }}>כל אנשי הקשר בבת אחת, ואז בוחרים את מי להזמין</div>
            </div>
          </button>
          <input ref={fileRef} type="file" accept=".vcf,text/vcard,text/x-vcard" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) fromFile(f); e.target.value = ''; }} />
          {error && <div style={{ color: 'var(--no)', fontSize: 13 }}>{error}</div>}
          <details className="card" style={{ background: 'var(--bg-2)' }}>
            <summary style={{ fontWeight: 600, cursor: 'pointer' }}>איך מייצאים את כל אנשי הקשר מהאייפון?</summary>
            <ol className="muted" style={{ paddingInlineStart: 20, marginTop: 10, lineHeight: 1.9, fontSize: 14 }}>
              <li>פותחים את אפליקציית <b>אנשי קשר</b> ולוחצים על <b>רשימות</b> (למעלה משמאל).</li>
              <li>לחיצה ארוכה על <b>כל אנשי הקשר</b> ← <b>ייצוא</b>.</li>
              <li>בוחרים <b>שמירה בקבצים</b>, ואז כאן בוחרים את הקובץ שנשמר.</li>
            </ol>
          </details>
          {!supported && (
            <details className="card" style={{ background: 'var(--bg-2)' }}>
              <summary style={{ fontWeight: 600, cursor: 'pointer' }}>הפעלת בחירה ישירה מאנשי הקשר</summary>
              <ol className="muted" style={{ paddingInlineStart: 20, marginTop: 10, lineHeight: 1.9, fontSize: 14 }}>
                <li><b>הגדרות</b> ← <b>אפליקציות</b> ← <b>Safari</b> ← <b>מתקדם</b> ← <b>Feature Flags</b>.</li>
                <li>מפעילים את <b>Contact Picker API</b>.</li>
                <li>חוזרים לכאן ומרעננים את הדף.</li>
              </ol>
            </details>
          )}
        </div>
      ) : (
        <div className="stack">
          <div className="row" style={{ position: 'relative' }}>
            <IconSearch width={18} height={18} style={{ position: 'absolute', insetInlineStart: 14, color: 'var(--faint)' }} />
            <input className="input" style={{ paddingInlineStart: 42 }} placeholder="חיפוש שם או מספר" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="row">
            <button className="btn btn-sm btn-ghost" onClick={toggleAll}>{allFilteredOn ? 'ביטול בחירה' : 'בחירת הכול'}</button>
            <span className="grow muted" style={{ fontSize: 13 }}>נבחרו {selected.size} מתוך {candidates.length}</span>
          </div>
          <div className="list" style={{ maxHeight: '42dvh', overflowY: 'auto', margin: '0 -4px' }}>
            {filtered.map((c) => {
              const on = selected.has(c.key);
              const exists = existingPhones.has(c.phone);
              return (
                <button key={c.key} className="list-item" style={{ textAlign: 'right', width: '100%' }} onClick={() => {
                  const next = new Set(selected); if (on) next.delete(c.key); else next.add(c.key); setSelected(next);
                }}>
                  <div className={`check ${on ? 'on' : ''}`}>{on && <IconCheck width={15} height={15} />}</div>
                  <div className="grow">
                    <div className="li-title">{c.name}</div>
                    <div className="li-sub"><span dir="ltr">{formatPhone(c.phone)}</span>{exists && <span style={{ color: 'var(--maybe)' }}>כבר ברשימה</span>}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <label className="field">
            <span>קבוצה (לא חובה)</span>
            <input className="input" list="tag-list" placeholder="למשל: משפחה, חברים מהצבא, עבודה" value={tag} onChange={(e) => setTag(e.target.value)} />
            <datalist id="tag-list">{tags.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          {error && <div style={{ color: 'var(--no)', fontSize: 13 }}>{error}</div>}
          <div className="row">
            <button className="btn btn-ghost" onClick={reset}>חזרה</button>
            <button className="btn btn-primary grow" disabled={busy || selected.size === 0} onClick={save}>
              {busy ? 'מוסיף…' : `הוספת ${selected.size} מוזמנים`}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
