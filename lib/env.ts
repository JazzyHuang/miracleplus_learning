/**
 * 环境变量验证模块
 * 在应用启动时验证必需的环境变量是否存在
 */

/**
 * 必需的环境变量列表
 */
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

/**
 * 可选但推荐的环境变量列表
 */
const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_BASE_URL',
] as const;

/**
 * AI 相关环境变量（需要其中一个）
 */
const aiEnvVars = [
  'NEW_API_KEY',
  'GEMINI_API_KEY',
] as const;

export type RequiredEnvVar = (typeof requiredEnvVars)[number];
export type OptionalEnvVar = (typeof optionalEnvVars)[number];
export type AIEnvVar = (typeof aiEnvVars)[number];

interface EnvValidationResult {
  isValid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  hasAIKey: boolean;
  errors: string[];
}

/**
 * 验证环境变量
 * @returns 验证结果
 */
export function validateEnv(): EnvValidationResult {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const errors: string[] = [];

  // 检查必需的环境变量
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingRequired.push(envVar);
      errors.push(`缺少必需的环境变量: ${envVar}`);
    }
  }

  // 检查可选的环境变量
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      missingOptional.push(envVar);
    }
  }

  // 检查 AI 相关环境变量（至少需要一个）
  const hasAIKey = aiEnvVars.some((envVar) => !!process.env[envVar]);

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    hasAIKey,
    errors,
  };
}

/**
 * 在应用启动时验证环境变量
 * 如果缺少必需的环境变量，将抛出错误
 */
export function assertEnv(): void {
  const result = validateEnv();

  if (!result.isValid) {
    const errorMessage = [
      '环境变量验证失败！',
      '',
      '缺少以下必需的环境变量:',
      ...result.missingRequired.map((v) => `  - ${v}`),
      '',
      '请在 .env.local 文件中配置这些变量。',
      '可参考 env.example 文件。',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // 警告缺少的可选环境变量
  if (result.missingOptional.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️ 以下可选环境变量未配置:',
      result.missingOptional.join(', ')
    );
  }

  // 警告缺少 AI Key
  if (!result.hasAIKey && process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️ 未配置 AI API Key (NEW_API_KEY 或 GEMINI_API_KEY)，AI 功能将不可用'
    );
  }
}

/**
 * 安全获取环境变量
 * @param key 环境变量名
 * @param defaultValue 默认值
 * @returns 环境变量值或默认值
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`环境变量 ${key} 未定义且没有提供默认值`);
  }
  return value;
}

/**
 * 获取必需的环境变量
 * @param key 环境变量名
 * @returns 环境变量值
 * @throws 如果环境变量不存在
 */
export function getRequiredEnv(key: RequiredEnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`缺少必需的环境变量: ${key}`);
  }
  return value;
}

/**
 * 环境变量配置对象
 * 类型安全的环境变量访问
 */
export const env = {
  get supabaseUrl(): string {
    return getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  },
  get supabaseAnonKey(): string {
    return getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get supabaseServiceRoleKey(): string | undefined {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  },
  get baseUrl(): string {
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  },
  get aiApiKey(): string | undefined {
    return process.env.NEW_API_KEY || process.env.GEMINI_API_KEY;
  },
  get aiApiBaseUrl(): string | undefined {
    return process.env.NEW_API_BASE_URL;
  },
  get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
};
