import { HomeContent } from '@/components/dashboard';

export default function HomePage() {
  // User data is already fetched in layout and provided via UserContext
  // HomeContent uses useUser() hook to access it - no duplicate fetching
  return <HomeContent />;
}
