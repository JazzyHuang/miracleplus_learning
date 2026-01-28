import { redirect } from 'next/navigation';
import { getAuthUser, getUserProfileByAuthUser, isAdmin } from '@/lib/supabase/auth';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

/**
 * Admin 布局 - Server Layout Guard
 * 
 * Next.js 16 最佳实践：认证和授权保护移到 Server Layout 中
 * 需要同时验证用户登录状态和管理员权限
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 安全认证检查 - 使用 getAuthUser() 进行服务器端验证
  const authUser = await getAuthUser();
  
  // 如果用户未登录，重定向到登录页面
  if (!authUser) {
    redirect('/login');
  }

  // 检查管理员权限
  const hasAdminAccess = await isAdmin();
  if (!hasAdminAccess) {
    // 非管理员用户重定向到主页
    redirect('/');
  }

  // 获取用户 profile 信息 - 使用已验证的 authUser
  const user = await getUserProfileByAuthUser(authUser);

  return <AdminLayoutShell user={user}>{children}</AdminLayoutShell>;
}
