import { redirect } from 'next/navigation';
import { getAuthUser, getUserProfileByAuthUser } from '@/lib/supabase/auth';
import { DashboardShell } from '@/components/dashboard';
import { PageTransition } from '@/components/page-transition';
import { InstallPrompt, OfflineIndicator } from '@/components/pwa';

/**
 * Dashboard 布局 - Server Layout Guard
 * 
 * Next.js 16 最佳实践：认证保护移到 Server Layout 中
 * 不再使用 middleware.ts/proxy.ts 进行认证检查
 * 
 * Phase 5 改进：集成 PageTransition 实现页面过渡动画
 * Phase 5 改进：集成 PWA 离线支持组件
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 安全认证检查 - 使用 getAuthUser() 进行服务器端验证
  // 这比旧的 middleware 方式更安全，因为在 Node.js 运行时执行
  const authUser = await getAuthUser();
  
  // 如果用户未登录，重定向到登录页面
  if (!authUser) {
    redirect('/login');
  }

  // 获取用户 profile 信息 - 使用已验证的 authUser 确保 RLS 正确工作
  const user = await getUserProfileByAuthUser(authUser);

  return (
    <DashboardShell user={user}>
      <OfflineIndicator />
      <PageTransition>{children}</PageTransition>
      <InstallPrompt />
    </DashboardShell>
  );
}
