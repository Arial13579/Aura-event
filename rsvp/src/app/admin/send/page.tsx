'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAdminData } from '@/components/AdminShell';
import { useAuth } from '@/components/AuthGate';
import { IconCheck, IconChevron, IconShare, IconSms, IconWhatsApp } from '@/components/Icons';
import { Initials, Spinner, StatusBadge, useToast } from '@/components/ui';
import { markSent } from '@/lib/data';
import { buildMessage, shareInvitation, smsUrl, whatsappUrl } from '@/lib/invite';
import { formatPhone } from '@/lib/phone';
import type { Guest } from '@/lib/types';

type GroupKey = 'round1' | 'pending' | 'maybe' | 'notYes' | 'no' | 'yes' | 'all';
type Channel = 'whatsapp' | 'sms' | 'share';

const GROUPS: { key: GroupKey; title: string; desc: string; emoji: string; template: 'invite' | 'reminder'; test: (g: Guest) => boolean }[] = [
  { key: 'round1', title: 'סבב ראשון', desc: 'כל מי שעוד לא קיבל הזמנה', emoji: '💌', template: 'invite', test: (g) => g.sentCount === 0 },
  { key: 'pending', title: 'עוד לא ענו', desc: 'קיבלו הזמנה ולא השיבו', emoji: '⏳', template: 'reminder', test: (g) => g.status === 'pending' && g.sentCount > 0 },
  { key: 'maybe', title: 'מתלבטים', desc: 'סימנו שעדיין מתלבטים', emoji: '🤔', template: 'reminder', test: (g) => g.status === 'maybe' },
  { key: 'notYes', title: 'לא אישרו הגעה', desc: 'כל מי שלא אישר (לא ענו + מתלבטים)', emoji: '📣', template: 'reminder', test: (g) => g.status === 'pending' || g.status === 'maybe' },
  { key: 'no', title: 'לא מגיעים', desc: 'סימנו שלא יגיעו', emoji: '🙁', template: 'reminder', test: (g) => g.status === 'no' },
  { key: 'yes', title: 'אישרו הגעה', desc: 'תזכורת לפני האירוע', emoji: '🎉', template: 'reminder', test: (g) => g.status === 'yes' },
  { key: 'all', title: 'כל המוזמנים', desc: 'שליחה לכולם', emoji: '👥', template: 'invite', test: () => true },
];

export default function SendPage() {
  const { guests, settings } = useAdminData();
  const { viewer } = useAuth();
  const toast = useToast();
  const [group, setGroup] = useState<GroupKey | null>(null);
  const [tag, setTag] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState('');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [queue, setQueue] = useState<Guest[] | null>(null);
  const [index, setIndex] = useState(0);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const def = GROUPS.find((g) => g.key === group);
  const tags = useMemo(() => [...new Set((guests || []).map((g) => g.tag).filter(Boolean))].sort(), [guests]);

  useEffect(() => {
    if (def && settings) setTemplate(def.template === 'invite' ? settings.inviteTemplate : settings.reminderTemplate);
    setExcluded(new Set());
  }, [group]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupCounts = useMemo(() => {
    const out = {} as Record<GroupKey, number>;
    GROUPS.forEach((gr) => { out[gr.key] = (guests || []).filter(gr.test).length; });
    return out;
  }, [guests]);

  const recipients = useMemo(() => {
    if (!def || !guests) return [];
    return guests.filter((g) => def.test(g) && (!tag || g.tag === tag) && (!onlyMine || g.addedByUid === viewer.uid));
  }, [def, guests, tag, onlyMine, viewer.uid]);

  const chosen = recipients.filter((g) => !excluded.has(g.id) && (channel === 'share' || g.phone));

  if (!guests || !settings) return <div className="fullscreen-center" style={{ minHeight: '50vh' }}><Spinner /></div>;

  // ---------------- Queue mode ----------------
  if (queue) {
    const done = index >= queue.length;
    const g = queue[Math.min(index, queue.length - 1)];
    const text = g ? buildMessage(template, settings, g) : '';
    const next = () => setIndex((i) => i + 1);
    const record = (id: string) => {
      markSent(id).catch(() => {});
      setSentIds((s) => new Set(s).add(id));
      setTimeout(next, 400);
    };

    return (
      <div className="stack" style={{ gap: 16 }}>
        <div className="row">
          <button className="icon-btn" onClick={() => { setQueue(null); setIndex(0); }} aria-label="חזרה"><IconChevron style={{ transform: 'scaleX(-1)' }} /></button>
          <div className="grow">
            <div style={{ fontWeight: 800, fontSize: 18 }}>{def?.title}</div>
            <div className="muted" style={{ fontSize: 13 }}>{Math.min(index, queue.length)} מתוך {queue.length} · נשלחו {sentIds.size}</div>
          </div>
        </div>
        <div className="progress"><i style={{ width: `${(Math.min(index, queue.length) / queue.length) * 100}%`, background: 'var(--gold-grad)', borderRadius: 99, transition: 'width .3s ease' }} /></div>

        {done ? (
          <div className="card stack center hero-stat" style={{ alignItems: 'center', padding: 32 }}>
            <div className="brand-mark" style={{ width: 64, height: 64, borderRadius: 32 }}><IconCheck width={30} height={30} /></div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>הסבב הושלם!</div>
            <div className="muted">נשלחו {sentIds.size} הזמנות. התשובות יופיעו בלוח הבקרה בזמן אמת.</div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => { setQueue(null); setIndex(0); setGroup(null); setSentIds(new Set()); }}>סבב נוסף</button>
              <Link href="/admin" className="btn btn-gold">ללוח הבקרה</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="card stack" style={{ gap: 14 }}>
              <div className="row">
                <Initials name={g.name} />
                <div className="grow">
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{g.name}</div>
                  <div className="muted" style={{ fontSize: 13 }} dir="ltr">{formatPhone(g.phone) || 'ללא טלפון'}</div>
                </div>
                <StatusBadge status={g.status} />
              </div>
              <div className="card" style={{ background: 'var(--bg-2)', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>{text}</div>
            </div>
            {channel === 'whatsapp' && (
              <a className="btn btn-wa btn-block" style={{ minHeight: 58, fontSize: 17 }} href={whatsappUrl(g.phone, text)} target="_blank" rel="noreferrer" onClick={() => record(g.id)}>
                <IconWhatsApp /> שליחה ל{g.name.split(' ')[0]} בוואטסאפ
              </a>
            )}
            {channel === 'sms' && (
              <a className="btn btn-gold btn-block" style={{ minHeight: 58, fontSize: 17 }} href={smsUrl(g.phone, text)} onClick={() => record(g.id)}>
                <IconSms /> שליחה ב־SMS
              </a>
            )}
            {channel === 'share' && (
              <button className="btn btn-gold btn-block" style={{ minHeight: 58, fontSize: 17 }} onClick={async () => {
                const ok = await shareInvitation(text, settings.invitationVersion);
                if (ok) record(g.id); else toast('השיתוף בוטל');
              }}>
                <IconShare /> שיתוף תמונה + קישור
              </button>
            )}
            <div className="grid-2">
              <button className="btn btn-ghost" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>הקודם</button>
              <button className="btn btn-ghost" onClick={next}>דילוג</button>
            </div>
            <p className="hint center">אחרי השליחה חוזרים לכאן, והאורח הבא כבר מחכה.</p>
          </>
        )}
      </div>
    );
  }

  // ---------------- Setup mode ----------------
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div className="page-title">שליחת הזמנות</div>
        <div className="page-desc">בחרו קבוצה, ערכו את ההודעה ושלחו לכל אורח את הקישור האישי שלו.</div>
      </div>

      {!settings.invitationVersion && viewer.isOwner && (
        <Link href="/admin/settings" className="card row" style={{ borderColor: 'rgba(240,180,60,.4)', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🖼️</span>
          <span className="grow" style={{ fontSize: 14 }}>עוד לא הועלתה תמונת הזמנה. מומלץ להעלות אותה כדי שתופיע בתצוגה המקדימה של הקישור.</span>
        </Link>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))' }}>
        {GROUPS.map((gr) => (
          <button key={gr.key} className="card" style={{ textAlign: 'right', padding: 14, borderColor: group === gr.key ? 'var(--gold-2)' : undefined, background: group === gr.key ? 'var(--gold-soft)' : undefined }} onClick={() => setGroup(gr.key)}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 22 }}>{gr.emoji}</span>
              <b style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>{groupCounts[gr.key]}</b>
            </div>
            <div style={{ fontWeight: 700, marginTop: 8 }}>{gr.title}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{gr.desc}</div>
          </button>
        ))}
      </div>

      {def && (
        <>
          {(tags.length > 0 || viewer.isOwner) && (
            <div className="card stack" style={{ gap: 10 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>סינון נוסף</div>
              {tags.length > 0 && (
                <div className="chip-row">
                  <button className={`chip ${!tag ? 'on' : ''}`} onClick={() => setTag('')}>כל הקבוצות</button>
                  {tags.map((t) => <button key={t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(t)}>{t}</button>)}
                </div>
              )}
              {viewer.isOwner && (
                <div className="segmented">
                  <button className={!onlyMine ? 'on' : ''} onClick={() => setOnlyMine(false)}>כל המוזמנים</button>
                  <button className={onlyMine ? 'on' : ''} onClick={() => setOnlyMine(true)}>רק שהוספתי</button>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <div className="card-title">נמענים <span className="card-sub">{chosen.length} נבחרו</span></div>
            {recipients.length === 0 ? <div className="empty" style={{ padding: 14 }}>אין מוזמנים בקבוצה הזו</div> : (
              <div className="list" style={{ maxHeight: 300, overflowY: 'auto' }}>
                {recipients.map((g) => {
                  const noPhone = !g.phone && channel !== 'share';
                  const on = !excluded.has(g.id) && !noPhone;
                  return (
                    <button key={g.id} className="list-item" style={{ textAlign: 'right', width: '100%', opacity: noPhone ? 0.45 : 1 }} disabled={noPhone} onClick={() => {
                      const s = new Set(excluded); if (s.has(g.id)) s.delete(g.id); else s.add(g.id); setExcluded(s);
                    }}>
                      <div className={`check ${on ? 'on' : ''}`}>{on && <IconCheck width={15} height={15} />}</div>
                      <div className="grow">
                        <div className="li-title">{g.name}</div>
                        <div className="li-sub">{noPhone ? 'אין מספר טלפון' : <span dir="ltr">{formatPhone(g.phone)}</span>}{g.sentCount > 0 && <span>· נשלח ×{g.sentCount}</span>}</div>
                      </div>
                      <StatusBadge status={g.status} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card stack">
            <div className="card-title" style={{ marginBottom: 0 }}>נוסח ההודעה</div>
            <textarea className="textarea" rows={6} value={template} onChange={(e) => setTemplate(e.target.value)} />
            <div className="hint">משתנים: {'{name}'} שם פרטי · {'{couple}'} בני הזוג · {'{date}'} תאריך · {'{venue}'} מקום · {'{link}'} הקישור האישי (חובה)</div>
            {!template.includes('{link}') && <div style={{ color: 'var(--maybe)', fontSize: 13 }}>⚠️ ההודעה לא כוללת את {'{link}'}. בלי הקישור האורח לא יוכל לאשר הגעה.</div>}
          </div>

          <div className="card stack">
            <div className="card-title" style={{ marginBottom: 0 }}>ערוץ שליחה</div>
            <div className="segmented">
              <button className={channel === 'whatsapp' ? 'on' : ''} onClick={() => setChannel('whatsapp')}>וואטסאפ</button>
              <button className={channel === 'sms' ? 'on' : ''} onClick={() => setChannel('sms')}>SMS</button>
              <button className={channel === 'share' ? 'on' : ''} onClick={() => setChannel('share')}>תמונה + קישור</button>
            </div>
            <div className="hint">
              {channel === 'whatsapp' && 'נפתח צ׳אט עם האורח וההודעה כבר כתובה. תמונת ההזמנה מופיעה כתצוגה מקדימה של הקישור, ולחיצה עליה פותחת את דף האישור.'}
              {channel === 'sms' && 'נפתחת הודעת SMS עם הנוסח והקישור האישי.'}
              {channel === 'share' && 'נפתח תפריט השיתוף של האייפון עם קובץ התמונה וההודעה, ובוחרים למי לשלוח.'}
            </div>
          </div>

          <button className="btn btn-gold btn-block" style={{ minHeight: 56, fontSize: 17 }} disabled={chosen.length === 0 || !template.trim()} onClick={() => { setQueue(chosen); setIndex(0); setSentIds(new Set()); }}>
            התחלת שליחה ל־{chosen.length} מוזמנים
          </button>
        </>
      )}
    </div>
  );
}
