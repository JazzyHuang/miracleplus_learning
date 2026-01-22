import { getUserProfile } from '@/lib/supabase/auth';
import { DashboardShell } from '@/components/dashboard';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use cached auth function - only one DB call per request
  const user = await getUserProfile();

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
