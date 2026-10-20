'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isConfigured, OWNER_EMAIL } from '@/lib/config';
import { getCollaborator, joinWithLink } from '@/lib/data';
import { BrandHeader, LoginScreen, SetupNeeded, useFirebaseUser } from '@/components/AuthGate';
import { Spinner } from '@/components/ui';

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const user = useFirebaseUser();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        if ((user.email || '').toLowerCase() === OWNER_EMAIL) return router.replace('/admin');
        const existing = await getCollaborator(user.uid);
        if (existing?.active) return router.replace('/admin');
        if (existing && !existing.active) return setError('הגישה שלך בוטלה על ידי בעל האירוע.');
        await joinWithLink(user.uid, user.email || '', user.displayName || (user.email || '').split('@')[0], token);
        router.replace('/admin');
      } catch {
        setError('קישור ההרשאה אינו תקף או שבוטל. בקשו קישור חדש מבעל האירוע.');
      }
    })();
  }, [user, token, router]);

  if (!isConfigured) return <SetupNeeded />;
  if (user === undefined) return <div className="fullscreen-center"><Spinner /></div>;
  if (!user) return <LoginScreen title="הוזמנת לנהל אישורי הגעה" sub="התחברו כדי להוסיף את אנשי הקשר שלכם" />;
  if (error) {
    return (
      <div className="fullscreen-center">
        <div className="card stack center" style={{ maxWidth: 420, alignItems: 'center' }}>
          <BrandHeader />
          <p className="muted" style={{ lineHeight: 1.6 }}>{error}</p>
          <button className="btn btn-ghost" onClick={() => signOut(auth())}>התחברות עם חשבון אחר</button>
        </div>
      </div>
    );
  }
  return <div className="fullscreen-center"><div className="stack center" style={{ alignItems: 'center' }}><Spinner /><span className="muted">מצרף אותך…</span></div></div>;
}
