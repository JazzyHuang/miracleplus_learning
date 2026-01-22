import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Check admin role from metadata or database
    const roleFromMetadata = user.user_metadata?.role || user.app_metadata?.role;
    let isAdmin = roleFromMetadata === 'admin';
    
    if (!isAdmin) {
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

    // Validate the tag
    const validTags = ['courses', 'workshops', 'checkins'];
    if (!validTags.includes(tag)) {
      return NextResponse.json({ error: 'Invalid tag' }, { status: 400 });
    }

    revalidateTag(tag);
    
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
