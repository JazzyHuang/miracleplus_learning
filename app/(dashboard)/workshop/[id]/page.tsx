import { redirect } from 'next/navigation';
import { getWorkshopById } from '@/lib/supabase/queries';
import { WorkshopDetail } from '@/components/workshop';

interface WorkshopDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkshopDetailPage({ params }: WorkshopDetailPageProps) {
  const { id } = await params;
  
  // User data is already fetched in layout and provided via UserContext
  // WorkshopDetail uses useUser() hook to access it - no duplicate fetching
  const workshopData = await getWorkshopById(id);

  // If workshop has feishu_url, redirect to it
  if (workshopData.workshop?.feishu_url) {
    redirect(workshopData.workshop.feishu_url);
  }

  return (
    <WorkshopDetail 
      workshop={workshopData.workshop} 
      initialCheckins={workshopData.checkins} 
    />
  );
}
