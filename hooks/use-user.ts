'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types/database';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const fetchUserProfile = async (authUserId: string): Promise<User | null> => {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .single();
      
      return profile;
    };

    const handleSession = async (session: { user: { id: string } } | null) => {
      if (!isMounted) return;
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        if (isMounted) {
          setUser(profile);
        }
      } else {
        setUser(null);
      }
      
      if (isMounted) {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        handleSession(session);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
  };

  return { user, loading, signOut };
}
