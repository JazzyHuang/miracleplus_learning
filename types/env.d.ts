/**
 * 环境变量类型定义
 * 确保环境变量在 TypeScript 中类型安全
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Supabase（必需）
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;

      // AI API（至少需要其中一个）
      // 优先使用 NEW_API_KEY（NewAPI 服务）
      NEW_API_KEY?: string;
      NEW_API_BASE_URL?: string;
      // 备选：Gemini API
      GEMINI_API_KEY?: string;

      // 应用配置
      NEXT_PUBLIC_BASE_URL?: string;
      NODE_ENV: 'development' | 'production' | 'test';

      // 可选的外部服务
      UPSTASH_REDIS_REST_URL?: string;
      UPSTASH_REDIS_REST_TOKEN?: string;
    }
  }
}

// 确保这个文件被 TypeScript 当作模块处理
export {};
