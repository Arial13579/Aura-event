'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/AuthGate';
import { IconChevron, IconLink, IconShare, IconWhatsApp } from '@/components/Icons';
import { useToast } from '@/components/ui';
import { createShareLink, setCollaboratorActive, setShareLinkActive, useTeam } from '@/lib/data';
import { relativeTime } from '@/lib/format';

export default function TeamPage() {
  const { viewer } = useAuth();
  const toast = useToast();
  const { links, collabs } = useTeam(viewer.isOwner);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  if (!viewer.isOwner) return <div className="empty">רק בעל האירוע יכול לנהל הרשאות</div>;

  const url = (id: string) => `${window.location.origin}/join/${id}`;
  const message = (id: string) => `הוזמנת לנהל איתי את אישורי ההגעה לחתונה 💍\nנכנסים בקישור, מתחברים עם Google ומוסיפים את אנשי הקשר שלך:\n${url(id)}`;

  async function create() {
    setBusy(true);
    try {
      const id = await createShareLink(label.trim() || 'קישור הרשאה');
      setLabel('');
      if (navigator.share) {
        navigator.share({ text: message(id) }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url(id));
        toast('הקישור נוצר והועתק');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row">
        <Link href="/admin/settings" className="icon-btn" aria-label="חזרה"><IconChevron style={{ transform: 'scaleX(-1)' }} /></Link>
        <div className="grow">
          <div className="page-title" style={{ fontSize: 22 }}>שותפים והרשאות</div>
          <div className="page-desc">מי שמקבל קישור יכול להתחבר, להוסיף את אנשי הקשר שלו ולשלוח להם הזמנות.</div>
        </div>
      </div>

      <div className="card stack hero-stat">
        <div className="card-title" style={{ marginBottom: 0 }}>קישור הרשאה חדש</div>
        <input className="input" placeholder="למי הקישור? (למשל: הכלה, אמא)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="btn btn-gold" disabled={busy} onClick={create}><IconShare width={18} height={18} /> יצירה ושליחה</button>
        <div className="hint">השותף רואה ומנהל רק את המוזמנים שהוא עצמו הוסיף. אתה רואה את כולם. אפשר לבטל גישה בכל רגע.</div>
      </div>

      <div className="card">
        <div className="card-title">שותפים <span className="card-sub">{collabs.filter((c) => c.active).length} פעילים</span></div>
        {collabs.length === 0 ? <div className="empty" style={{ padding: 14 }}>עדיין אף אחד לא הצטרף</div> : (
          <div className="list">
            {collabs.map((c) => (
              <div key={c.id} className="list-item">
                <div className="li-avatar">{c.name[0] || '?'}</div>
                <div className="grow">
                  <div className="li-title">{c.name}</div>
                  <div className="li-sub"><span dir="ltr">{c.email}</span>{c.joinedAt && <span>· הצטרף {relativeTime(c.joinedAt)}</span>}</div>
                </div>
                <button className={`btn btn-sm ${c.active ? 'btn-danger' : ''}`} onClick={() => setCollaboratorActive(c.id, !c.active)}>
                  {c.active ? 'ביטול גישה' : 'החזרת גישה'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">קישורים שנוצרו</div>
        {links.length === 0 ? <div className="empty" style={{ padding: 14 }}>אין קישורים</div> : (
          <div className="list">
            {links.map((l) => (
              <div key={l.id} className="list-item" style={{ opacity: l.active ? 1 : 0.5 }}>
                <div className="grow">
                  <div className="li-title">{l.label}</div>
                  <div className="li-sub">{l.active ? 'פעיל' : 'מבוטל'}{l.createdAt && ` · ${relativeTime(l.createdAt)}`}</div>
                </div>
                {l.active && (
                  <>
                    <a className="icon-btn" href={`https://wa.me/?text=${encodeURIComponent(message(l.id))}`} target="_blank" rel="noreferrer" aria-label="וואטסאפ"><IconWhatsApp width={18} height={18} /></a>
                    <button className="icon-btn" onClick={async () => { await navigator.clipboard.writeText(url(l.id)); toast('הועתק'); }} aria-label="העתקה"><IconLink width={18} height={18} /></button>
                  </>
                )}
                <button className="btn btn-sm btn-ghost" onClick={() => setShareLinkActive(l.id, !l.active)}>{l.active ? 'ביטול' : 'הפעלה'}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
