/**
 * URL 安全验证工具
 * 防止 javascript:, data:, vbscript: 等危险协议注入
 */

/**
 * 验证并净化 URL，仅允许 http/https 协议和相对路径
 * @param url 待验证的 URL
 * @param fallback 验证失败时的回退值，默认 '#'
 * @returns 安全的 URL 或 fallback
 */
export function sanitizeUrl(url: string | null | undefined, fallback = '#'): string {
  if (!url) return fallback;

  try {
    const parsed = new URL(url, 'https://placeholder.local');
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return url;
    }
    // 阻止危险协议 (javascript:, data:, vbscript: 等)
    return fallback;
  } catch {
    // 相对路径以 / 开头是安全的
    if (url.startsWith('/')) return url;
    return fallback;
  }
}

/**
 * 检查 URL 是否为外部链接
 */
export function isExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://placeholder.local');
    return !parsed.hostname.endsWith('placeholder.local');
  } catch {
    return false;
  }
}
