import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * API route to revalidate cached data.
 * Should be called after admin creates/updates/deletes content.
 * 
 * POST /api/revalidate
 * Body: { tag: "courses" | "workshops" | "checkins" }
 */
export async function POST(request: NextRequest) {
  try {
    // 代码质量修复：统一使用 checkAdminAccess 替代自定义 admin 检查逻辑
    const supabase = await createClient();
    const { isAdmin, user } = await checkAdminAccess(supabase);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 速率限制：每分钟最多10次
    const rateLimitResult = await checkRateLimit(`revalidate:${user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 10,
    });
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: '请求过于频繁，请稍后重试',
          retryAfter: rateLimitResult.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
          },
        }
      );
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tag } = await request.json();
    
    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Invalid tag' }, { status: 400 });
    }

    // Validate the tag - P2: 扩展支持的缓存标签
    const validTags = [
      'courses',
      'workshops', 
      'checkins',
      'user-progress',  // 用户学习进度
      'user-stats',     // 用户统计数据
      'questions',      // 测试题目
      'lessons',        // 课时内容
    ];
    
    if (!validTags.includes(tag)) {
      logger.warn('Invalid revalidation tag attempted', { tag, userId: user.id });
      return NextResponse.json({ error: 'Invalid tag' }, { status: 400 });
    }

    await revalidateTag(tag, 'default');
    
    return NextResponse.json({ 
      revalidated: true, 
      tag,
      timestamp: Date.now() 
    });
  } catch (error) {
    logger.error('Revalidation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
