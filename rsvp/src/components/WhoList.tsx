'use client';

import { useMemo, useState } from 'react';
import { STATUS_META, STATUS_ORDER, type Guest, type Status } from '@/lib/types';
import { formatPhone } from '@/lib/phone';
import { relativeTime } from '@/lib/format';
import { Initials } from './ui';

/** Names by answer: who confirmed, who is unsure, who declined, who hasn't answered. */
export function WhoList({ guests }: { guests: Guest[] }) {
  const [tab, setTab] = useState<Status>('yes');
  const [all, setAll] = useState(false);

  const groups = useMemo(() => {
    const g: Record<Status, Guest[]> = { yes: [], maybe: [], no: [], pending: [] };
    for (const x of guests) g[x.status].push(x);
    g.yes.sort((a, b) => b.adults + b.kids - (a.adults + a.kids) || a.name.localeCompare(b.name, 'he'));
    return g;
  }, [guests]);

  const list = groups[tab];
  const shown = all ? list : list.slice(0, 8);
  const people = groups.yes.reduce((s, g) => s + g.adults + g.kids, 0);

  return (
    <div className="card">
      <div className="card-title">
        מי אישר ומי לא
        {tab === 'yes' && <span className="card-sub">{people} אנשים</span>}
      </div>
      <div className="segmented" style={{ marginBottom: 8 }}>
        {STATUS_ORDER.map((s) => (
          <button key={s} className={tab === s ? 'on' : ''} onClick={() => { setTab(s); setAll(false); }} style={tab === s ? { color: STATUS_META[s].color } : undefined}>
            {STATUS_META[s].label} {groups[s].length}
          </button>
        ))}
      </div>
      {list.length === 0 ? <div className="empty" style={{ padding: 16 }}>אין אף אחד ברשימה הזו</div> : (
        <div className="list">
          {shown.map((g) => (
            <div key={g.id} className="list-item">
              <Initials name={g.name} />
              <div className="grow">
                <div className="li-title">{g.name}</div>
                <div className="li-sub">
                  {g.phone && <span dir="ltr">{formatPhone(g.phone)}</span>}
                  {g.respondedAt && <span>· {relativeTime(g.respondedAt)}</span>}
                  {tab === 'pending' && <span>· {g.sentCount ? `קיבל הזמנה ×${g.sentCount}` : 'עוד לא נשלחה הזמנה'}</span>}
                </div>
              </div>
              {tab === 'yes' && (
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--yes)' }}>{g.adults + g.kids}</div>
                  <div className="faint" style={{ fontSize: 11 }}>{g.adults} מב׳{g.kids ? ` · ${g.kids} יל׳` : ''}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {list.length > 8 && (
        <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={() => setAll(!all)}>
          {all ? 'הצג פחות' : `הצג את כל ה־${list.length}`}
        </button>
      )}
    </div>
  );
}
