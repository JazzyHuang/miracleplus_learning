'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { DB } from '@/lib/db-tables';
import { logger } from '@/lib/logger';
import type { User } from '@/types/database';

/**
 * 性能优化：拆分为两个 Context
 * - UserDataContext: { user, signOut } — 稳定，很少变化
 * - UserLoadingContext: boolean — 频繁变化但消费者极少
 * 大多数组件只需 useUser()（数据），不关心 loading。
 * 拆分后 loading 变化不再触发全局重渲染。
 */

interface UserDataContextType {
  user: User | null;
  signOut: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | null>(null);
const UserLoadingContext = createContext<boolean>(false);

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

  // 使用 ref 存储 initialUser，避免它作为 effect 依赖导致订阅重建
  const initialUserRef = useRef(initialUser);
  // 同步 initialUser 变化到 state（服务端导航时 initialUser 可能变化）
  useEffect(() => {
    if (initialUser && initialUser.id !== userRef.current?.id) {
      setUser(initialUser);
    }
    initialUserRef.current = initialUser;
  }, [initialUser]);

  // 使用 ref 存储当前 user 状态，避免 effect 中的闭包问题
  const userRef = useRef<User | null>(initialUser);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const pendingRequestsRef = useRef(new Set<string>());

  // storage 事件防抖 timer ref（组件级，确保 effect 重建时不丢失 timer 引用）
  const storageTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 追踪是否已经初始化过，避免 INITIAL_SESSION 重复触发
  const initializedRef = useRef(false);

  // 辅助函数：获取用户 profile
  // 使用 Set 防止同一 userId 的重复请求（而不是 debounce，避免状态更新延迟）
  const fetchUserProfile = useCallback(async (supabase: ReturnType<typeof createClient>, userId: string) => {
    // 如果当前用户 ID 相同且已存在，跳过
    if (userRef.current?.id === userId) {
      return;
    }

    // 防止同一 userId 的重复请求
    if (pendingRequestsRef.current.has(userId)) {
      return;
    }
    pendingRequestsRef.current.add(userId);

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from(DB.users)
        .select('id, email, name, avatar_url, bio, role, created_at')
        .eq('id', userId)
        .single();
      if (profile) {
        setUser(profile);
      }
    } catch (err) {
      logger.error('获取用户信息失败', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
      pendingRequestsRef.current.delete(userId);
    }
  }, []);

  // 监听认证状态变化，确保跨标签页同步
  // 空依赖数组：订阅只创建一次，不会因 user 变化而重建
  useEffect(() => {
    const supabase = createClient();

    // 主动获取当前用户（处理页面刷新后 initialUser 为空的情况）
    // 安全修复：使用 getUser() 替代 getSession()，确保 token 经过服务端验证
    const initSession = async () => {
      // 如果已有 initialUser，跳过初始化获取，避免重复请求导致内容闪烁
      // initialUser 由服务端传入，是可信的
      if (initialUserRef.current) {
        initializedRef.current = true;
        return;
      }

      // 总是检查当前 session，即使有 initialUser
      // 这样可以确保登录后客户端导航时状态正确同步
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          initializedRef.current = true;
          // 如果当前 user 状态为空或 ID 不同，更新
          // 这里直接调用 fetchUserProfile，它内部会检查 ID 是否相同
          await fetchUserProfile(supabase, user.id);
        } else {
          // 没有认证用户，清除状态
          if (userRef.current) {
            setUser(null);
          }
        }
      } catch (err) {
        logger.error('初始化用户会话失败', err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // 处理 INITIAL_SESSION - 这在页面加载时触发
        // 关键修复：只在首次初始化且没有 initialUser 时才获取 profile
        // 如果有 initialUser（服务端传入），则跳过，避免客户端导航时重复请求导致闪烁
        if (event === 'INITIAL_SESSION' && session?.user && !initializedRef.current) {
          initializedRef.current = true;
          // 如果当前没有用户信息，获取 profile
          await fetchUserProfile(supabase, session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          userRef.current = null;
          initializedRef.current = false;
        } else if (event === 'SIGNED_IN' && session?.user) {
          initializedRef.current = true;
          // 重新获取用户信息（登录成功后）
          // 无论当前是否有用户，都重新获取以确保数据最新
          await fetchUserProfile(supabase, session.user.id);
        } else if (event === 'TOKEN_REFRESHED' && session?.user && !userRef.current) {
          // Token 刷新后如果用户为空，重新获取
          // 使用 userRef.current 获取当前状态，避免闭包中的陈旧值
          await fetchUserProfile(supabase, session.user.id);
        }
      }
    );

    // 监听 storage 事件（跨标签页同步）
    // 性能优化：添加防抖，避免高频 storage 事件触发重复请求
    // 使用组件级 useRef 存储 timer，确保 effect 重建时不丢失引用
    const handleStorageChange = async (e: StorageEvent) => {
      // Supabase 使用 localStorage 存储 session
      if (e.key?.includes('supabase.auth.token')) {
        clearTimeout(storageTimerRef.current);
        storageTimerRef.current = setTimeout(async () => {
          try {
            // 安全修复：使用 getUser() 替代 getSession()
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              setUser(null);
              userRef.current = null;
            } else {
              // 总是调用 fetchUserProfile，它内部会检查是否需要更新
              await fetchUserProfile(supabase, user.id);
            }
          } catch (err) {
            logger.error('检查认证状态失败', err instanceof Error ? err : new Error(String(err)));
          }
        }, 100); // 100ms 防抖
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      clearTimeout(storageTimerRef.current);
    };
  }, [fetchUserProfile]); // 空依赖数组 + ref：订阅只创建一次

  // 性能优化：使用 ref 存储 supabase 实例，避免每次 signOut 创建新实例
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await getSupabase().auth.signOut({ scope: 'local' });
      setUser(null);
    } catch (err) {
      logger.error('登出失败', err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [getSupabase]);

  // 使用 useMemo 确保 context 值稳定
  // 只有 user 或 signOut 变化时才创建新对象，减少消费者重渲染
  const dataValue = useMemo(() => ({
    user,
    signOut
  }), [user, signOut]);

  return (
    <UserLoadingContext.Provider value={loading}>
      <UserDataContext.Provider value={dataValue}>
        {children}
      </UserDataContext.Provider>
    </UserLoadingContext.Provider>
  );
}

/**
 * 获取用户数据（user + signOut）— 大多数组件使用此 hook
 * loading 变化不会触发使用此 hook 的组件重渲染
 */
export function useUser() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

/**
 * 获取 loading 状态 — 仅少数需要显示加载状态的组件使用
 */
export function useUserLoading() {
  return useContext(UserLoadingContext);
}
