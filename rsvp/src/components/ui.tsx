'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { STATUS_META, type Status } from '@/lib/types';

// ---------- Toast ----------
const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  const show = useCallback((m: string) => setMsg(m), []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ---------- Sheet ----------
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}

// ---------- Status badge ----------
export function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${m.color} 16%, transparent)`, color: m.color }}>
      <i className="dot" style={{ background: m.color }} />
      {m.short}
    </span>
  );
}

export function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const t = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return <div className="li-avatar">{t || '?'}</div>;
}

export function Spinner() {
  return <div className="spinner" aria-label="טוען" />;
}

export function Stepper({ value, onChange, min = 0, max = 30 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="הוספה">+</button>
      <output>{value}</output>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="הפחתה">−</button>
    </div>
  );
}
