import { getAuthUser } from '@/lib/supabase/auth';
import { getUserLearningStats } from '@/lib/supabase/queries';
import { HomeContent } from '@/components/dashboard/home-content';

/**
 * 首页 - Server Component
 * 
 * 获取用户学习统计数据并传递给客户端组件渲染
 */
export default async function HomePage() {
  // 获取当前认证用户（layout 已验证，这里一定存在）
  const authUser = await getAuthUser();
  
  // 获取用户学习统计数据
  let stats = null;
  if (authUser) {
    try {
      stats = await getUserLearningStats(authUser.id);
    } catch (error) {
      console.error('获取学习统计失败:', error);
    }
  }

  return <HomeContent stats={stats} />;
}
