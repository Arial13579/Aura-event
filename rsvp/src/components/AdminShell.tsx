'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext } from 'react';
import { useAuth } from './AuthGate';
import { IconChart, IconLogout, IconSend, IconSettings, IconUsers } from './Icons';
import { ToastProvider } from './ui';
import { useGuests, useSettings } from '@/lib/data';
import type { EventSettings, Guest } from '@/lib/types';

interface AdminData {
  guests: Guest[] | null;
  settings: EventSettings | null;
  error: string;
}

const DataCtx = createContext<AdminData>({ guests: null, settings: null, error: '' });
export const useAdminData = () => useContext(DataCtx);

const TABS = [
  { href: '/admin', label: 'לוח בקרה', Icon: IconChart },
  { href: '/admin/guests', label: 'מוזמנים', Icon: IconUsers },
  { href: '/admin/send', label: 'שליחה', Icon: IconSend },
  { href: '/admin/settings', label: 'הגדרות', Icon: IconSettings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, viewer, logout } = useAuth();
  const { guests, error } = useGuests(viewer);
  const settings = useSettings();
  const path = usePathname();

  return (
    <DataCtx.Provider value={{ guests, settings, error }}>
      <ToastProvider>
        <div className="shell">
          <header className="topbar">
            <div className="brand grow">
              <div className="brand-mark">💍</div>
              <div>
                <div className="brand-name accent-text">{settings?.coupleNames || 'החתונה שלנו'}</div>
                <div className="brand-sub">אישורי הגעה</div>
              </div>
            </div>
            <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {viewer.isOwner ? 'מנהל' : 'שותף'}
            </span>
            {user.photoURL
              ? <img src={user.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
              : <div className="avatar">{viewer.name[0]}</div>}
            <button className="icon-btn" onClick={logout} aria-label="התנתקות"><IconLogout width={18} height={18} /></button>
          </header>
          <main className="page">{children}</main>
          <nav className="tabbar" style={{ ['--tabs' as string]: TABS.length }}>
            {TABS.map(({ href, label, Icon }) => {
              const active = href === '/admin' ? path === '/admin' : path.startsWith(href);
              return (
                <Link key={href} href={href} className={`tab ${active ? 'active' : ''}`}>
                  <Icon />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </ToastProvider>
    </DataCtx.Provider>
  );
}
