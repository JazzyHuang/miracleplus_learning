import { getAdminDashboardData } from '@/lib/supabase/queries';
import { AdminDashboard } from '@/components/admin';

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return <AdminDashboard data={data} />;
}
