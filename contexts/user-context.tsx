'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types/database';

interface UserContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

interface UserProviderProps {
  children: ReactNode;
  initialUser: User | null;
}

/**
 * 用户状态 Provider
 * 
 * P1 修复：
 * 1. 添加 onAuthStateChange 监听，确保跨标签页状态同步
 * 2. 添加 storage 事件监听，确保登出同步
 * 
 * Subscription 修复：
 * 1. 使用空依赖数组 []，避免订阅被反复销毁/重建
 * 2. 使用 useRef 获取当前 user 状态，避免闭包中的陈旧值
 */
export function UserProvider({ children, initialUser }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(false);
  
  // 使用 ref 存储当前 user 状态，避免 effect 中的闭包问题
  const userRef = useRef<User | null>(initialUser);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // 辅助函数：获取用户 profile
  const fetchUserProfile = useCallback(async (supabase: ReturnType<typeof createClient>, userId: string) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (profile) {
        setUser(profile);
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 监听认证状态变化，确保跨标签页同步
  // 空依赖数组：订阅只创建一次，不会因 user 变化而重建
  useEffect(() => {
    const supabase = createClient();

    // 主动获取当前 session（处理页面刷新后 initialUser 为空的情况）
    const initSession = async () => {
      // 如果已有 initialUser，跳过初始化
      if (userRef.current) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !userRef.current) {
        await fetchUserProfile(supabase, session.user.id);
      }
    };
    
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // 处理 INITIAL_SESSION - 这在页面加载时触发
        if (event === 'INITIAL_SESSION' && session?.user) {
          // 如果当前没有用户信息，获取 profile
          if (!userRef.current) {
            await fetchUserProfile(supabase, session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          // 重新获取用户信息（登录成功后）
          await fetchUserProfile(supabase, session.user.id);
        } else if (event === 'TOKEN_REFRESHED' && session?.user && !userRef.current) {
          // Token 刷新后如果用户为空，重新获取
          // 使用 userRef.current 获取当前状态，避免闭包中的陈旧值
          await fetchUserProfile(supabase, session.user.id);
        }
      }
    );

    // 监听 storage 事件（跨标签页同步）
    const handleStorageChange = async (e: StorageEvent) => {
      // Supabase 使用 localStorage 存储 session
      if (e.key?.includes('supabase.auth.token')) {
        // session 发生变化，检查当前状态
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            setUser(null);
          } else if (session.user && !userRef.current) {
            // 如果有 session 但没有用户信息，重新获取
            await fetchUserProfile(supabase, session.user.id);
          }
        } catch (err) {
          console.error('检查 session 状态失败:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchUserProfile]); // 添加 fetchUserProfile 到依赖

  const signOut = useCallback(async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
    } catch (err) {
      console.error('登出失败:', err);
      throw err;
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
