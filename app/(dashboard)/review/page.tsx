import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/supabase/auth';
import ReviewContent from './review-content';

export const metadata = {
  title: '每日复习',
};

export default async function ReviewPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');

  return <ReviewContent userId={authUser.id} />;
}
