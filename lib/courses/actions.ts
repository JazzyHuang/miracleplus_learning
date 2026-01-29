'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createCoursesService } from './service';
import type { MarkCompleteResult } from './service';

/**
 * Server Action: 标记课时完成
 *
 * 这个函数在服务端执行，完成后会重新验证用户统计缓存
 * 确保仪表板数据及时更新
 */
export async function markLessonCompleteAction(
  lessonId: string,
  courseId: string
): Promise<MarkCompleteResult> {
  const supabase = await createClient();

  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      pointsEarned: 0,
      milestoneAchieved: null,
      milestonePoints: 0,
      error: '请先登录',
    };
  }

  const coursesService = createCoursesService(supabase);
  const result = await coursesService.markLessonComplete(user.id, lessonId, courseId);

  // 如果标记成功，重新验证用户统计缓存
  // 这确保了仪表板的学习统计数据会在30秒内更新
  if (result.success) {
    revalidateTag('user-stats', 'max');
  }

  return result;
}
