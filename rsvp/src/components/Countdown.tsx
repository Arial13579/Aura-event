'use client';

import { useEffect, useState } from 'react';

function parts(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    done: diff === 0,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function useCountdown(iso: string) {
  const target = iso ? Date.parse(iso) : NaN;
  // Computed after mount only, so server and client markup match
  const [p, setP] = useState<ReturnType<typeof parts> | null>(null);
  useEffect(() => {
    if (!Number.isFinite(target)) { setP(null); return; }
    setP(parts(target));
    const t = setInterval(() => setP(parts(target)), 1000);
    return () => clearInterval(t);
  }, [target]);
  return p;
}

export function Countdown({ iso, variant = 'guest' }: { iso: string; variant?: 'guest' | 'compact' }) {
  const p = useCountdown(iso);
  if (!p) return null;
  if (p.done) return <div className="countdown-done">💍 היום הגדול הגיע!</div>;
  const units = [
    { v: p.days, l: 'ימים' },
    { v: p.hours, l: 'שעות' },
    { v: p.minutes, l: 'דקות' },
    { v: p.seconds, l: 'שניות' },
  ];
  return (
    <div className={`countdown cd-${variant}`} suppressHydrationWarning>
      {units.map((u) => (
        <div key={u.l} className="cd-unit">
          <div className="cd-num">{String(u.v).padStart(2, '0')}</div>
          <div className="cd-label">{u.l}</div>
        </div>
      ))}
    </div>
  );
}
