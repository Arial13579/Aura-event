'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAdminData } from '@/components/AdminShell';
import { useAuth } from '@/components/AuthGate';
import { AreaLine, Donut, Legend, StackedBars, type Slice, type StackRow } from '@/components/Charts';
import { Countdown } from '@/components/Countdown';
import { WhoList } from '@/components/WhoList';
import { Initials, Spinner, StatusBadge } from '@/components/ui';
import { IconPlus, IconSend } from '@/components/Icons';
import { hebrewDate, longDate, relativeTime } from '@/lib/format';
import { STATUS_META, STATUS_ORDER, type Guest, type Status } from '@/lib/types';

function emptyCounts(): Record<Status, number> {
  return { yes: 0, maybe: 0, no: 0, pending: 0 };
}

function groupBy(guests: Guest[], key: (g: Guest) => string): StackRow[] {
  const map = new Map<string, Record<Status, number>>();
  for (const g of guests) {
    const k = key(g);
    if (!map.has(k)) map.set(k, emptyCounts());
    map.get(k)![g.status]++;
  }
  return [...map.entries()]
    .map(([label, counts]) => ({ label, counts }))
    .sort((a, b) => STATUS_ORDER.reduce((s, k) => s + b.counts[k], 0) - STATUS_ORDER.reduce((s, k) => s + a.counts[k], 0));
}

export default function Dashboard() {
  const { guests, settings } = useAdminData();
  const { viewer } = useAuth();

  const stats = useMemo(() => {
    if (!guests) return null;
    const counts = emptyCounts();
    let adults = 0, kids = 0, sent = 0;
    for (const g of guests) {
      counts[g.status]++;
      if (g.status === 'yes') { adults += g.adults; kids += g.kids; }
      if (g.sentCount > 0) sent++;
    }
    const total = guests.length;
    const responded = total - counts.pending;

    // Cumulative responses over the last 21 days
    const days = 21;
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
    const daily = new Array(days).fill(0);
    let before = 0;
    for (const g of guests) {
      if (!g.respondedAt || g.status === 'pending') continue;
      const idx = Math.floor((g.respondedAt - start.getTime()) / 86400000);
      if (idx < 0) before++; else if (idx < days) daily[idx]++;
    }
    let acc = before;
    const fmt = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric' });
    const timeline = daily.map((v, i) => {
      acc += v;
      const d = new Date(start); d.setDate(d.getDate() + i);
      return { label: fmt.format(d), value: acc };
    });

    const recent = guests.filter((g) => g.respondedAt && g.status !== 'pending')
      .sort((a, b) => (b.respondedAt || 0) - (a.respondedAt || 0)).slice(0, 6);

    return {
      counts, total, responded, adults, kids, sent, timeline, recent,
      byInviter: groupBy(guests, (g) => g.addedByName || 'לא ידוע'),
      byTag: groupBy(guests.filter((g) => g.tag), (g) => g.tag),
    };
  }, [guests]);

  if (!stats || !settings) return <div className="fullscreen-center" style={{ minHeight: '50vh' }}><Spinner /></div>;

  const slices: Slice[] = STATUS_ORDER.map((k) => ({ key: k, label: STATUS_META[k].label, value: stats.counts[k], color: STATUS_META[k].color }));
  const responseRate = stats.total ? Math.round((stats.responded / stats.total) * 100) : 0;
  const eventDate = settings.eventDate ? new Date(settings.eventDate) : null;

  if (stats.total === 0) {
    return (
      <div className="stack" style={{ gap: 18 }}>
        <div className="page-head">
          <div className="page-title">ברוך הבא, {viewer.name.split(' ')[0]} 👋</div>
          <div className="page-desc">בואו נתחיל: מוסיפים מוזמנים, מעלים הזמנה, ושולחים.</div>
        </div>
        <div className="card stack hero-stat" style={{ gap: 16 }}>
          {[
            { n: 1, t: 'הגדרת האירוע והעלאת ההזמנה', d: 'תאריך, אולם והתמונה שתישלח לאורחים', href: '/admin/settings', show: viewer.isOwner },
            { n: 2, t: 'הוספת מוזמנים', d: 'מאנשי הקשר באייפון, מקובץ, או ידנית', href: '/admin/guests' },
            { n: 3, t: 'שליחת ההזמנות', d: 'בוואטסאפ או SMS, לפי קבוצות', href: '/admin/send' },
          ].filter((s) => s.show !== false).map((s) => (
            <Link key={s.n} href={s.href} className="row" style={{ gap: 14 }}>
              <div className="brand-mark" style={{ width: 38, height: 38, flex: 'none' }}>{s.n}</div>
              <div className="grow"><div style={{ fontWeight: 700 }}>{s.t}</div><div className="muted" style={{ fontSize: 13 }}>{s.d}</div></div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head row wrap" style={{ marginBottom: 4 }}>
        <div className="grow">
          <div className="page-title">לוח בקרה</div>
          <div className="page-desc">
            {eventDate ? `${longDate(eventDate)} · ${hebrewDate(eventDate)}` : 'הגדירו תאריך אירוע בהגדרות'}
            {settings.venueName && ` · ${settings.venueName}`}
          </div>
        </div>
        <Link href="/admin/send" className="btn btn-primary btn-sm"><IconSend width={16} height={16} /> שליחה</Link>
        <Link href="/admin/guests" className="btn btn-sm"><IconPlus width={16} height={16} /> מוזמן</Link>
      </div>

      {/* Hero */}
      <div className="card hero-stat stack" style={{ gap: 16 }}>
        <div className="row wrap" style={{ alignItems: 'flex-end', gap: 18 }}>
          <div className="grow">
            <div className="kpi-label">צפי אורחים שאישרו</div>
            <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1 }} className="accent-text">{stats.adults + stats.kids}</div>
            <div className="muted" style={{ fontSize: 13.5 }}>{stats.adults} מבוגרים · {stats.kids} ילדים · {stats.counts.yes} הזמנות</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="kpi-label" style={{ justifyContent: 'flex-end' }}>אחוז היענות</div>
            <div style={{ fontSize: 34, fontWeight: 800 }}>{responseRate}%</div>
            <div className="muted" style={{ fontSize: 13 }}>{stats.responded} מתוך {stats.total}</div>
          </div>
        </div>
        <div className="progress" style={{ height: 12 }}>
          {STATUS_ORDER.map((k) => <i key={k} style={{ width: `${(stats.counts[k] / stats.total) * 100}%`, background: STATUS_META[k].color }} />)}
        </div>
        {settings.eventDate && <Countdown iso={settings.eventDate} variant="compact" />}
      </div>

      {/* KPIs */}
      <div className="grid-4">
        {STATUS_ORDER.map((k) => (
          <Link key={k} href={`/admin/guests?status=${k}`} className="card kpi">
            <div className="kpi-label"><i className="dot" style={{ background: STATUS_META[k].color }} />{STATUS_META[k].label}</div>
            <div className="kpi-value" style={{ color: k === 'pending' ? undefined : STATUS_META[k].color }}>{stats.counts[k]}</div>
            <div className="kpi-foot">{Math.round((stats.counts[k] / stats.total) * 100)}% מהמוזמנים</div>
          </Link>
        ))}
      </div>

      <WhoList guests={guests!} />

      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card">
          <div className="card-title">התפלגות תשובות <span className="card-sub">{stats.total} הזמנות</span></div>
          <div className="row wrap" style={{ gap: 20, justifyContent: 'center' }}>
            <Donut slices={slices} centerValue={`${responseRate}%`} centerLabel="השיבו" size={170} />
            <div className="grow" style={{ minWidth: 170 }}><Legend slices={slices} /></div>
          </div>
        </div>

        <div className="card stack" style={{ gap: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>משפך שליחה</div>
          {[
            { l: 'נשלחה הזמנה', v: stats.sent, c: 'var(--accent)' },
            { l: 'השיבו', v: stats.responded, c: 'var(--yes)' },
            { l: 'ממתינים לשליחה', v: stats.total - stats.sent, c: 'var(--pending)' },
          ].map((r) => (
            <div key={r.l}>
              <div className="row" style={{ fontSize: 13.5, marginBottom: 6 }}>
                <span className="grow">{r.l}</span>
                <b>{r.v}</b><span className="faint">/ {stats.total}</span>
              </div>
              <div className="progress"><i style={{ width: `${(r.v / stats.total) * 100}%`, background: r.c, borderRadius: 99 }} /></div>
            </div>
          ))}
          <div className="grid-2">
            <div className="card" style={{ padding: 12, background: 'var(--bg-2)' }}>
              <div className="kpi-label">מבוגרים</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.adults}</div>
            </div>
            <div className="card" style={{ padding: 12, background: 'var(--bg-2)' }}>
              <div className="kpi-label">ילדים</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.kids}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">קצב תשובות <span className="card-sub">מצטבר · 21 ימים אחרונים</span></div>
        <AreaLine points={stats.timeline} />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {viewer.isOwner && stats.byInviter.length > 1 && (
          <div className="card">
            <div className="card-title">לפי מזמין</div>
            <StackedBars rows={stats.byInviter} />
          </div>
        )}
        {stats.byTag.length > 0 && (
          <div className="card">
            <div className="card-title">לפי קבוצה</div>
            <StackedBars rows={stats.byTag} />
          </div>
        )}
        <div className="card">
          <div className="card-title">תשובות אחרונות</div>
          {stats.recent.length === 0 ? <div className="empty" style={{ padding: 16 }}>עדיין אין תשובות</div> : (
            <div className="list">
              {stats.recent.map((g) => (
                <div key={g.id} className="list-item">
                  <Initials name={g.name} />
                  <div className="grow">
                    <div className="li-title">{g.name}</div>
                    <div className="li-sub">{relativeTime(g.respondedAt)}{g.status === 'yes' && ` · ${g.adults + g.kids} אורחים`}</div>
                  </div>
                  <StatusBadge status={g.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
