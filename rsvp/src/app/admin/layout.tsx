import { AuthGate } from '@/components/AuthGate';
import { AdminShell } from '@/components/AdminShell';

export const metadata = { title: 'AURA · ניהול אישורי הגעה' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AdminShell>{children}</AdminShell>
    </AuthGate>
  );
}
