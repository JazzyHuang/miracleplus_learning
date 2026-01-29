import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * API route to revalidate cached data.
 * Should be called after admin creates/updates/deletes content.
 * 
 * POST /api/revalidate
 * Body: { tag: "courses" | "workshops" | "checkins" }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the user is an admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 速率限制：每分钟最多10次
    const rateLimitResult = checkRateLimit(`revalidate:${user.id}`, {
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

    // 安全修复：优先检查 app_metadata（服务器设置，用户无法修改）
    // 只有 app_metadata 是可信的，user_metadata 可被用户修改
    const roleFromMetadata = user.app_metadata?.role;
    let isAdmin = roleFromMetadata === 'admin';
    
    if (!isAdmin) {
      // 后备：从数据库查询
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
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
      return NextResponse.json({ 
        error: 'Invalid tag',
        validTags,
      }, { status: 400 });
    }

    await revalidateTag(tag, 'default');
    
    return NextResponse.json({ 
      revalidated: true, 
      tag,
      timestamp: Date.now() 
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
