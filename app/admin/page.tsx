import { getAdminStats } from '@/lib/supabase/queries';
import { AdminDashboard } from '@/components/admin';

export default async function AdminDashboardPage() {
  // Server-side data fetching - no client-side loading state needed
  const stats = await getAdminStats();

  return <AdminDashboard stats={stats} />;
}
