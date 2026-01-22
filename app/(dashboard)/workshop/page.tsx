import { getWorkshops } from '@/lib/supabase/queries';
import { WorkshopList } from '@/components/workshop';

interface WorkshopListPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function WorkshopListPage({ searchParams }: WorkshopListPageProps) {
  const { q: searchQuery } = await searchParams;
  const workshops = await getWorkshops();

  return <WorkshopList workshops={workshops} searchQuery={searchQuery} />;
}
