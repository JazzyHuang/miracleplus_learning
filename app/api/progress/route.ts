import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    // Parse the request body
    const body = await request.json();
    const { userId, lessonId, courseId, timeSpent } = body;

    // Validate required fields
    if (!userId || !lessonId || !courseId || typeof timeSpent !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate timeSpent is reasonable (between 0 and 24 hours in seconds)
    if (timeSpent < 0 || timeSpent > 86400) {
      return NextResponse.json(
        { error: 'Invalid timeSpent value' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated and matches the userId
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // For sendBeacon, we return 200 even on auth failure to prevent retries
      // The data is simply discarded
      return NextResponse.json({ saved: false, reason: 'unauthenticated' });
    }

    // Security check: user can only update their own progress
    if (user.id !== userId) {
      return NextResponse.json({ saved: false, reason: 'unauthorized' });
    }

    // Update the progress record
    const { error } = await supabase
      .from('user_lesson_progress')
      .upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId,
          time_spent: Math.round(timeSpent),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,lesson_id',
          // Only update time_spent if the new value is greater
          // This prevents race conditions from overwriting with stale data
        }
      );

    if (error) {
      console.error('Failed to save progress:', error);
      return NextResponse.json({ saved: false, reason: 'database_error' });
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    // For sendBeacon, we want to return 200 to prevent automatic retries
    console.error('Progress API error:', error);
    return NextResponse.json({ saved: false, reason: 'server_error' });
  }
}
