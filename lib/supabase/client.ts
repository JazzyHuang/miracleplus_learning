import { createBrowserClient } from '@supabase/ssr';

// 性能优化：单例模式复用客户端实例，避免每次调用创建新连接
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!clientInstance) {
    // 环境变量在客户端由 Next.js 构建时内联，运行时一定存在
    // NEXT_PUBLIC_ 前缀的变量在构建时被替换，非空断言在此是安全的
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return clientInstance;
}
