'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isConfigured, OWNER_EMAIL } from '@/lib/config';
import { getCollaborator, type Viewer } from '@/lib/data';
import { IconGoogle } from './Icons';
import { Spinner } from './ui';

interface AuthState {
  user: User;
  viewer: Viewer;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthGate');
  return v;
}

export async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth(), provider);
  } catch (e: unknown) {
    const code = (e as { code?: string }).code || '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth(), provider);
    } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
      throw e;
    }
  }
}

export function useFirebaseUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => (isConfigured ? onAuthStateChanged(auth(), setUser) : undefined), []);
  return user;
}

export function BrandHeader({ sub }: { sub?: string }) {
  return (
    <div className="stack center" style={{ alignItems: 'center', gap: 10 }}>
      <div className="brand-mark" style={{ width: 64, height: 64, borderRadius: 20, fontSize: 32 }}>💍</div>
      <div style={{ fontSize: 26, fontWeight: 800 }} className="accent-text">החתונה שלנו</div>
      {sub && <div className="muted" style={{ fontSize: 15 }}>{sub}</div>}
    </div>
  );
}

export function SetupNeeded() {
  return (
    <div className="fullscreen-center">
      <div className="card stack" style={{ maxWidth: 440 }}>
        <BrandHeader sub="נדרשת הגדרה ראשונית" />
        <p className="muted" style={{ lineHeight: 1.7 }}>
          חסרים פרטי החיבור ל־Firebase. יש להגדיר את משתני הסביבה <code>NEXT_PUBLIC_FIREBASE_*</code> לפי הקובץ
          <code> .env.example</code> ולפרוס מחדש. ההוראות המלאות נמצאות בקובץ README.
        </p>
      </div>
    </div>
  );
}

export function LoginScreen({ title, sub, error }: { title?: string; sub?: string; error?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(error || '');
  return (
    <div className="fullscreen-center soft-bg">
      <div className="stack" style={{ width: '100%', maxWidth: 400, gap: 26 }}>
        <BrandHeader sub={sub || 'מערכת אישורי הגעה'} />
        <div className="card stack" style={{ padding: 22 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{title || 'כניסה למערכת'}</div>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>הגישה מוגבלת לבעלי הרשאה בלבד. התחברו עם חשבון Google שלכם.</p>
          <button
            className="btn btn-block"
            style={{ minHeight: 52 }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr('');
              try { await googleSignIn(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
            }}
          >
            <IconGoogle /> המשך עם Google
          </button>
          {err && <div style={{ color: 'var(--no)', fontSize: 13 }}>{err}</div>}
        </div>
      </div>
    </div>
  );
}

function NoAccess({ user }: { user: User }) {
  return (
    <div className="fullscreen-center">
      <div className="card stack center" style={{ maxWidth: 420, alignItems: 'center' }}>
        <div style={{ fontSize: 44 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>אין הרשאת גישה</div>
        <p className="muted" style={{ lineHeight: 1.6 }}>
          החשבון <b dir="ltr">{user.email}</b> אינו מורשה. כדי לקבל גישה בקשו קישור הרשאה מבעל האירוע.
        </p>
        <button className="btn btn-ghost" onClick={() => signOut(auth())}>התחברות עם חשבון אחר</button>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useFirebaseUser();
  const [viewer, setViewer] = useState<Viewer | null | undefined>(undefined);

  useEffect(() => {
    if (!user) { setViewer(user === null ? null : undefined); return; }
    const email = (user.email || '').toLowerCase();
    const name = user.displayName || email.split('@')[0];
    if (email === OWNER_EMAIL && user.emailVerified) {
      setViewer({ uid: user.uid, name, isOwner: true });
      return;
    }
    setViewer(undefined);
    getCollaborator(user.uid)
      .then((c) => setViewer(c && c.active ? { uid: user.uid, name: c.name || name, isOwner: false } : null))
      .catch(() => setViewer(null));
  }, [user]);

  const value = useMemo(
    () => (user && viewer ? { user, viewer, logout: () => signOut(auth()) } : null),
    [user, viewer],
  );

  if (!isConfigured) return <SetupNeeded />;
  if (user === undefined || (user && viewer === undefined)) return <div className="fullscreen-center"><Spinner /></div>;
  if (!user) return <LoginScreen />;
  if (!value) return <NoAccess user={user} />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
