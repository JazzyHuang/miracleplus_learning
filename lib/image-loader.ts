import type { ImageLoaderProps } from 'next/image';

/**
 * 自定义图片加载器 — 绕过 Next.js 服务端图片优化的 SSRF 私有 IP 检查。
 *
 * 当外部域名（Supabase、Google、WordPress 等）在当前网络环境中
 * 解析为私有 IP 时，Next.js 内置的 /_next/image 端点会拒绝请求。
 * 此加载器让浏览器直接加载图片，避免服务端 DNS 解析问题。
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  // 已经是 data URI 或 blob URL，直接返回
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  // 对于外部 URL，附加 width/quality 参数供 CDN 使用（可选）
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // 本地图片走默认路径
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
}
