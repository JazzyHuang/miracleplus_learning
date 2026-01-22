import { getUserProfile } from '@/lib/supabase/auth';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use cached auth function - only one DB call per request
  const user = await getUserProfile();

  return <AdminLayoutShell user={user}>{children}</AdminLayoutShell>;
}
