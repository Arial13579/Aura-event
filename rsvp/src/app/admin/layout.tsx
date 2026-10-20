import { AuthGate } from '@/components/AuthGate';
import { AdminShell } from '@/components/AdminShell';

export const metadata = { title: 'ניהול אישורי הגעה · החתונה שלנו' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AdminShell>{children}</AdminShell>
    </AuthGate>
  );
}
