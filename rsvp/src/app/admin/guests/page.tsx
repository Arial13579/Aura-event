'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdminData } from '@/components/AdminShell';
import { useAuth } from '@/components/AuthGate';
import { ContactImport } from '@/components/ContactImport';
import { GuestEditor } from '@/components/GuestEditor';
import { IconContacts, IconDownload, IconEdit, IconLink, IconPlus, IconSearch, IconTrash, IconWhatsApp } from '@/components/Icons';
import { Initials, Sheet, Spinner, StatusBadge, useToast } from '@/components/ui';
import { deleteGuests, markSent } from '@/lib/data';
import { buildMessage, guestLink, guestsToCsv, whatsappUrl } from '@/lib/invite';
import { formatPhone } from '@/lib/phone';
import { relativeTime } from '@/lib/format';
import { STATUS_META, STATUS_ORDER, type Guest, type Status } from '@/lib/types';

type Filter = Status | 'all';

function GuestsInner() {
  const { guests, settings, error } = useAdminData();
  const { viewer } = useAuth();
  const toast = useToast();
  const params = useSearchParams();
  const [filter, setFilter] = useState<Filter>((params.get('status') as Filter) || 'all');
  const [tagFilter, setTagFilter] = useState('');
  const [q, setQ] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; guest: Guest | null }>({ open: false, guest: null });
  const [actions, setActions] = useState<Guest | null>(null);

  const tags = useMemo(() => [...new Set((guests || []).map((g) => g.tag).filter(Boolean))].sort(), [guests]);
  const phones = useMemo(() => new Set((guests || []).map((g) => g.phone).filter(Boolean)), [guests]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, yes: 0, maybe: 0, no: 0, pending: 0 };
    (guests || []).forEach((g) => { if (!tagFilter || g.tag === tagFilter) { c.all++; c[g.status]++; } });
    return c;
  }, [guests, tagFilter]);

  const list = useMemo(() => {
    const s = q.trim();
    const digits = s.replace(/\D/g, '');
    return (guests || []).filter((g) =>
      (filter === 'all' || g.status === filter) &&
      (!tagFilter || g.tag === tagFilter) &&
      (!s || g.name.includes(s) || (digits.length > 2 && (g.phone.includes(digits) || formatPhone(g.phone).replace(/\D/g, '').includes(digits)))),
    );
  }, [guests, filter, tagFilter, q]);

  if (!guests || !settings) return <div className="fullscreen-center" style={{ minHeight: '50vh' }}><Spinner /></div>;

  function exportCsv() {
    const blob = new Blob([guestsToCsv(list)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'אישורי-הגעה.csv';
    a.click();
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="page-head row wrap" style={{ marginBottom: 0 }}>
        <div className="grow">
          <div className="page-title">מוזמנים</div>
          <div className="page-desc">{guests.length} הזמנות{!viewer.isOwner && ' שהוספת'}</div>
        </div>
        <button className="icon-btn" onClick={exportCsv} aria-label="ייצוא לאקסל"><IconDownload width={18} height={18} /></button>
      </div>

      <div className="grid-2">
        <button className="btn btn-gold" onClick={() => setImportOpen(true)}><IconContacts width={19} height={19} /> מאנשי הקשר</button>
        <button className="btn" onClick={() => setEditor({ open: true, guest: null })}><IconPlus width={19} height={19} /> הוספה ידנית</button>
      </div>

      <div className="row" style={{ position: 'relative' }}>
        <IconSearch width={18} height={18} style={{ position: 'absolute', insetInlineStart: 14, color: 'var(--faint)' }} />
        <input className="input" style={{ paddingInlineStart: 42 }} placeholder="חיפוש לפי שם או טלפון" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="chip-row">
        {(['all', ...STATUS_ORDER] as Filter[]).map((k) => (
          <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
            {k !== 'all' && <i className="dot" style={{ background: STATUS_META[k].color }} />}
            {k === 'all' ? 'הכול' : STATUS_META[k].label}
            <span className="count">{counts[k]}</span>
          </button>
        ))}
      </div>
      {tags.length > 0 && (
        <div className="chip-row">
          <button className={`chip ${!tagFilter ? 'on' : ''}`} onClick={() => setTagFilter('')}>כל הקבוצות</button>
          {tags.map((t) => <button key={t} className={`chip ${tagFilter === t ? 'on' : ''}`} onClick={() => setTagFilter(t)}>{t}</button>)}
        </div>
      )}

      {error && <div className="card" style={{ color: 'var(--no)' }}>{error}</div>}

      <div className="card" style={{ padding: '4px 14px' }}>
        {list.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👥</div>
            {guests.length === 0 ? 'עדיין אין מוזמנים. התחילו בייבוא מאנשי הקשר.' : 'לא נמצאו מוזמנים בסינון הזה'}
          </div>
        ) : (
          <div className="list">
            {list.map((g) => (
              <button key={g.id} className="list-item" style={{ textAlign: 'right', width: '100%' }} onClick={() => setActions(g)}>
                <Initials name={g.name} />
                <div className="grow">
                  <div className="li-title">{g.name}</div>
                  <div className="li-sub">
                    {g.phone && <span dir="ltr">{formatPhone(g.phone)}</span>}
                    {g.tag && <span>· {g.tag}</span>}
                    {g.status === 'yes' && <span style={{ color: 'var(--yes)' }}>· {g.adults} מבוגרים{g.kids ? `, ${g.kids} ילדים` : ''}</span>}
                    {viewer.isOwner && g.addedByUid !== viewer.uid && <span>· של {g.addedByName}</span>}
                  </div>
                </div>
                <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
                  <StatusBadge status={g.status} />
                  <span className="faint" style={{ fontSize: 11 }}>{g.sentCount ? `נשלח ×${g.sentCount}` : 'לא נשלח'}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ContactImport open={importOpen} onClose={() => setImportOpen(false)} existingPhones={phones} tags={tags} />
      <GuestEditor open={editor.open} guest={editor.guest} tags={tags} onClose={() => setEditor({ open: false, guest: null })} />

      <Sheet open={!!actions} onClose={() => setActions(null)} title={actions?.name}>
        {actions && (
          <div className="stack">
            <div className="row wrap muted" style={{ fontSize: 13.5 }}>
              <StatusBadge status={actions.status} />
              {actions.respondedAt && <span>ענה {relativeTime(actions.respondedAt)}</span>}
              {actions.lastSentAt && <span>· נשלח {relativeTime(actions.lastSentAt)}</span>}
            </div>
            {actions.note && <div className="card" style={{ background: 'var(--bg-2)', fontSize: 14 }}>{actions.note}</div>}
            <a
              className="btn btn-wa btn-block"
              href={whatsappUrl(actions.phone, buildMessage(actions.sentCount ? settings.reminderTemplate : settings.inviteTemplate, settings, actions))}
              target="_blank" rel="noreferrer"
              onClick={() => { markSent(actions.id).catch(() => {}); setActions(null); }}
            >
              <IconWhatsApp /> שליחה בוואטסאפ
            </a>
            <div className="grid-2">
              <button className="btn" onClick={async () => { await navigator.clipboard.writeText(guestLink(actions.id)); toast('הקישור האישי הועתק'); }}>
                <IconLink width={18} height={18} /> העתקת קישור
              </button>
              <button className="btn" onClick={() => { setEditor({ open: true, guest: actions }); setActions(null); }}>
                <IconEdit width={18} height={18} /> עריכה
              </button>
            </div>
            <a className="btn btn-ghost" href={`/i/${actions.id}`} target="_blank" rel="noreferrer">צפייה בעמוד ההזמנה של האורח</a>
            <button className="btn btn-danger" onClick={async () => {
              if (!confirm(`למחוק את ${actions.name}?`)) return;
              await deleteGuests([actions.id]); setActions(null); toast('נמחק');
            }}>
              <IconTrash width={18} height={18} /> מחיקה
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export default function GuestsPage() {
  return <Suspense fallback={<div className="fullscreen-center"><Spinner /></div>}><GuestsInner /></Suspense>;
}
