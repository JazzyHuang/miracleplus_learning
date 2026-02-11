/**
 * Next.js 16 缓存 API 类型声明
 *
 * 解决 Next.js 16.1.6 与 TypeScript moduleResolution: "bundler" 的兼容性问题
 * 这些类型声明帮助 TypeScript 正确识别从 'next/cache' 导入的函数
 */
declare module 'next/cache' {
  // 自定义配置文件的 string 重载 (next.config.ts 中定义的自定义 profile)
  export function cacheLife(profile: string): void;

  /**
   * 重新验证指定标签的缓存数据
   * @param tag - 缓存标签
   * @param profile - 缓存配置文件 (默认: "default")
   */
  export function revalidateTag(
    tag: string,
    profile?: string | { expire?: number }
  ): undefined;

  /**
   * 为当前缓存操作添加标签
   * @param tags - 缓存标签
   */
  export function cacheTag(...tags: string[]): void;
}
