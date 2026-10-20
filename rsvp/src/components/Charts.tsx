'use client';

import { STATUS_META, STATUS_ORDER, type Status } from '@/lib/types';

export interface Slice { key: string; label: string; value: number; color: string }

export function Donut({ slices, centerValue, centerLabel, size = 190 }: { slices: Slice[]; centerValue: string; centerLabel: string; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 70;
  const c = 2 * Math.PI * r;
  const gap = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" role="img" aria-label={centerLabel}>
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="18" />
      {total > 0 && slices.map((s) => {
        const len = (s.value / total) * c;
        if (len <= 0) return null;
        const el = (
          <circle
            key={s.key} cx="90" cy="90" r={r} fill="none" stroke={s.color} strokeWidth="18"
            strokeDasharray={`${Math.max(len - gap, 0.5)} ${c}`} strokeDashoffset={-offset}
            transform="rotate(-90 90 90)" strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray .6s ease' }}
          >
            <title>{`${s.label}: ${s.value}`}</title>
          </circle>
        );
        offset += len;
        return el;
      })}
      <text x="90" y="88" textAnchor="middle" fill="var(--text)" fontSize="30" fontWeight="800">{centerValue}</text>
      <text x="90" y="112" textAnchor="middle" fill="var(--muted)" fontSize="12">{centerLabel}</text>
    </svg>
  );
}

export function Legend({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {slices.map((s) => (
        <div key={s.key} className="row" style={{ fontSize: 14 }}>
          <i className="dot" style={{ background: s.color, width: 10, height: 10 }} />
          <span className="grow">{s.label}</span>
          <b style={{ fontVariantNumeric: 'tabular-nums' }}>{s.value}</b>
          <span className="faint" style={{ width: 42, textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{Math.round((s.value / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

export interface StackRow { label: string; counts: Record<Status, number> }

export function StackedBars({ rows }: { rows: StackRow[] }) {
  const max = Math.max(1, ...rows.map((r) => STATUS_ORDER.reduce((s, k) => s + r.counts[k], 0)));
  return (
    <div className="stack" style={{ gap: 14 }}>
      {rows.map((r) => {
        const total = STATUS_ORDER.reduce((s, k) => s + r.counts[k], 0);
        return (
          <div key={r.label}>
            <div className="row" style={{ fontSize: 13.5, marginBottom: 6 }}>
              <span className="grow" style={{ fontWeight: 600 }}>{r.label}</span>
              <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{total}</span>
            </div>
            <div className="progress" style={{ width: `${(total / max) * 100}%`, minWidth: 8, gap: 2, background: 'transparent' }}>
              {STATUS_ORDER.map((k) => r.counts[k] > 0 && (
                <i key={k} title={`${STATUS_META[k].label}: ${r.counts[k]}`} style={{ width: `${(r.counts[k] / total) * 100}%`, background: STATUS_META[k].color, borderRadius: 3 }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AreaLine({ points, height = 150 }: { points: { label: string; value: number }[]; height?: number }) {
  const w = 600;
  const h = height;
  const pad = { t: 14, b: 22, x: 4 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const xy = points.map((p, i) => [
    pad.x + (n === 1 ? (w - 2 * pad.x) / 2 : (i / (n - 1)) * (w - 2 * pad.x)),
    pad.t + (1 - p.value / max) * (h - pad.t - pad.b),
  ]);
  // RTL: time flows from right to left
  const pts = xy.map(([x, y]) => [w - x, y]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${h - pad.b} L${pts[0][0]},${h - pad.b} Z`;
  const mid = Math.floor((n - 1) / 2);
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="תשובות מצטברות">
        <defs>
          <linearGradient id="goldArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d9b45a" stopOpacity=".35" />
            <stop offset="100%" stopColor="#d9b45a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1="0" x2={w} y1={pad.t + (1 - g) * (h - pad.t - pad.b)} y2={pad.t + (1 - g) * (h - pad.t - pad.b)} stroke="var(--border)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        ))}
        {n > 0 && <path d={area} fill="url(#goldArea)" />}
        {n > 0 && <path d={line} fill="none" stroke="#d9b45a" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
      </svg>
      {n > 1 && (
        <div className="row faint" style={{ justifyContent: 'space-between', fontSize: 12, marginTop: -16 }}>
          <span>{points[0].label}</span><span>{points[mid].label}</span><span>{points[n - 1].label}</span>
        </div>
      )}
    </div>
  );
}
