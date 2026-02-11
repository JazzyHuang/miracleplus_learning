import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { RPC } from '@/lib/db-tables';

const progressSchema = z.object({
  userId: z.string().uuid(),
  lessonId: z.string().uuid(),
  courseId: z.string().uuid(),
  timeSpent: z.number().int().min(0).max(86400),
});

/**
 * API route to save lesson progress via sendBeacon.
 * Used when user navigates away from a lesson to save remaining reading time.
 * 
 * POST /api/progress
 * Body: { userId: string, lessonId: string, courseId: string, timeSpent: number }
 * 
 * Note: sendBeacon sends requests with credentials, so we can authenticate the user.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const validation = progressSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { userId, lessonId, courseId, timeSpent } = validation.data;

    // Verify the user is authenticated and matches the userId
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // 安全修复：添加速率限制，防止滥用
    const rateLimitResult = await checkRateLimit(`progress:${user.id}`, RATE_LIMITS.api);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    // Security check: user can only update their own progress
    if (user.id !== userId) {
      logger.warn('Unauthorized progress update attempt', { userId, attemptedBy: user.id });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the progress record using atomic database function
    // This ensures time_spent only increases (uses GREATEST), preventing
    // race conditions from overwriting with stale/lower values
    const { error } = await supabase.rpc(RPC.upsert_lesson_time_spent, {
      p_user_id: userId,
      p_lesson_id: lessonId,
      p_course_id: courseId,
      p_time_spent: Math.round(timeSpent),
    });

    if (error) {
      logger.error('Failed to save progress:', error);
      return NextResponse.json({ saved: false, reason: 'database_error' });
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    // For sendBeacon, we want to return 200 to prevent automatic retries
    logger.error('Progress API error:', error);
    return NextResponse.json({ saved: false, reason: 'server_error' });
  }
}
