'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { hebrewDate, longDate, wazeLink } from '@/lib/format';
import type { EventSettings, Status } from '@/lib/types';
import { Countdown } from '@/components/Countdown';
import { Stepper } from '@/components/ui';

export interface PublicGuest { id: string; name: string; status: Status; adults: number; kids: number }

type View = 'choose' | 'count' | 'done';

function burstConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ['#f3dc9a', '#d9b45a', '#a9843f', '#ffffff', '#2fbf71'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: window.innerWidth / 2, y: window.innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 4,
    s: Math.random() * 7 + 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frame = 0;
  const tick = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of pieces) {
      p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    if (++frame < 200) requestAnimationFrame(tick); else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };
  tick();
}

export function RsvpClient({ guest, settings }: { guest: PublicGuest | null; settings: EventSettings }) {
  const [status, setStatus] = useState<Status>(guest?.status || 'pending');
  const [adults, setAdults] = useState(guest?.adults || 1);
  const [kids, setKids] = useState(guest?.kids || 0);
  const [view, setView] = useState<View>(guest && guest.status !== 'pending' ? 'done' : 'choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(false);
  const confetti = useRef<HTMLCanvasElement>(null);

  const date = settings.eventDate ? new Date(settings.eventDate) : null;
  const firstName = guest?.name.split(' ')[0] || '';

  useEffect(() => { if (adults < 1 && view === 'count') setAdults(1); }, [view, adults]);

  async function submit(next: Status, a = 0, k = 0) {
    if (!guest) return;
    setBusy(true);
    setError('');
    try {
      await updateDoc(doc(db(), 'guests', guest.id), { status: next, adults: a, kids: k, respondedAt: serverTimestamp() });
      setStatus(next);
      setView('done');
      if (next === 'yes' && confetti.current) burstConfetti(confetti.current);
      if ('vibrate' in navigator) navigator.vibrate?.(30);
    } catch {
      setError('משהו השתבש בשליחה. נסו שוב בעוד רגע.');
    } finally {
      setBusy(false);
    }
  }

  const doneText: Record<Status, { icon: string; title: string; body: string }> = {
    yes: { icon: '🥂', title: 'אישור ההגעה נשלח בהצלחה!', body: `רשמנו ${adults} מבוגרים${kids ? ` ו־${kids} ילדים` : ''}. מחכים לחגוג איתך!` },
    maybe: { icon: '💭', title: 'קיבלנו, תודה!', body: 'נשמח אם תעדכנו אותנו ברגע שתדעו. אפשר לחזור לקישור הזה בכל עת.' },
    no: { icon: '🤍', title: 'תודה על העדכון', body: 'חבל שלא תוכלו להגיע, נתגעגע! אם משהו ישתנה, אפשר לעדכן כאן.' },
    pending: { icon: '', title: '', body: '' },
  };

  return (
    <div className="guest">
      <canvas ref={confetti} className="confetti" />
      <div className="g-glow" />

      <main className="g-main">
        <header className="g-hero">
          {firstName && <div className="g-hello">שלום {firstName},</div>}
          <div className="g-headline">{settings.headline}</div>
          <h1 className="g-names">{settings.coupleNames}</h1>
          {settings.extraText && <p className="g-extra">{settings.extraText}</p>}
        </header>

        {!!settings.invitationVersion && (
          <button className="g-invite" onClick={() => setZoom(true)} aria-label="הגדלת ההזמנה">
            <img src={`/api/invitation?v=${settings.invitationVersion}`} alt={`הזמנה לחתונה של ${settings.coupleNames}`} />
          </button>
        )}

        <section className="g-card g-details">
          {date && (
            <>
              <div className="g-date">{longDate(date)}</div>
              <div className="g-hdate">{hebrewDate(date)}</div>
            </>
          )}
          <div className="g-times">
            {settings.receptionTime && <div><span>קבלת פנים</span><b>{settings.receptionTime}</b></div>}
            {settings.chuppahTime && <div><span>חופה וקידושין</span><b>{settings.chuppahTime}</b></div>}
          </div>
          <div className="g-venue">
            <div className="g-venue-name">{settings.venueName}</div>
            {settings.venueAddress && <div className="g-venue-addr">{settings.venueAddress}</div>}
          </div>
          <div className="g-actions">
            <a className="g-btn g-waze" href={wazeLink(settings)} target="_blank" rel="noreferrer">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2.5c-5 0-9 3.6-9 8.2 0 1.6.5 3 1.3 4.2-.3 1.3-1 2.2-2 2.6.9.6 2.6.7 4 .1 1 .7 2.2 1.2 3.4 1.4a2 2 0 0 0 3.9.3h1.3a2 2 0 0 0 3.9-.5A8 8 0 0 0 21 10.7c0-4.6-4-8.2-9-8.2Zm-3 7.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm6 0a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm-6.4 4.1c.2-.3.6-.4.9-.2 1.6 1 3.4 1 5 0a.7.7 0 1 1 .7 1.1 6 6 0 0 1-6.4 0 .7.7 0 0 1-.2-.9Z" /></svg>
              ניווט ב־Waze
            </a>
            {date && <a className="g-btn g-cal" href="/api/calendar">📅 הוספה ליומן</a>}
          </div>
        </section>

        {settings.eventDate && (
          <section className="g-card">
            <div className="g-section-title">נותרו עד החתונה</div>
            <Countdown iso={settings.eventDate} />
          </section>
        )}

        {guest ? (
          <section className="g-card g-rsvp" id="rsvp">
            {view === 'choose' && (
              <>
                <div className="g-section-title">נשמח לדעת אם תגיעו</div>
                <div className="g-rsvp-btns">
                  <button className="g-rbtn yes" onClick={() => setView('count')}>
                    <span className="g-ricon">✓</span> מגיע/ה בשמחה!
                  </button>
                  <button className="g-rbtn maybe" disabled={busy} onClick={() => submit('maybe')}>
                    <span className="g-ricon">?</span> עדיין מתלבט/ת
                  </button>
                  <button className="g-rbtn no" disabled={busy} onClick={() => submit('no')}>
                    <span className="g-ricon">✕</span> לא אוכל להגיע
                  </button>
                </div>
              </>
            )}

            {view === 'count' && (
              <div className="g-count">
                <div className="g-section-title">כמה תהיו?</div>
                <div className="g-count-row">
                  <div><div className="g-count-label">מבוגרים</div><Stepper value={adults} onChange={(n) => setAdults(Math.max(1, n))} min={1} max={20} /></div>
                  <div><div className="g-count-label">ילדים</div><Stepper value={kids} onChange={setKids} max={20} /></div>
                </div>
                <button className="g-rbtn yes g-confirm" disabled={busy} onClick={() => submit('yes', adults, kids)}>
                  {busy ? 'שולח…' : `אישור הגעה · ${adults + kids} אורחים`}
                </button>
                <button className="g-link" onClick={() => setView('choose')}>חזרה</button>
              </div>
            )}

            {view === 'done' && status !== 'pending' && (
              <div className={`g-done ${status}`}>
                <div className="g-done-icon">{doneText[status].icon}</div>
                <div className="g-done-title">{doneText[status].title}</div>
                <div className="g-done-body">{doneText[status].body}</div>
                <button className="g-link" onClick={() => setView('choose')}>שינוי תשובה</button>
              </div>
            )}

            {error && <div className="g-error">{error}</div>}
          </section>
        ) : (
          <section className="g-card center"><div className="g-done-body">הקישור לאישור ההגעה אינו תקין. פנו לבעלי השמחה לקבלת קישור אישי.</div></section>
        )}

        <footer className="g-footer">AURA EVENT</footer>
      </main>

      {zoom && (
        <div className="g-zoom" onClick={() => setZoom(false)}>
          <img src={`/api/invitation?v=${settings.invitationVersion}`} alt="ההזמנה" />
        </div>
      )}
    </div>
  );
}
