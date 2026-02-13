import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { STORAGE_BUCKET } from '@/lib/db-tables';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'png',
  'image/vnd.microsoft.icon': 'png',
};

/* Helper: download an image and upload to Supabase Storage */
async function downloadAndUpload(
  imageUrl: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  prefix: string
): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(imageUrl, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'MiracleLearning-OGFetcher/1.0' },
    });
    if (!res.ok) return null;

    const imgType = res.headers.get('content-type')?.split(';')[0]?.trim() || '';
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_IMAGE_SIZE) return null;

    if (!ALLOWED_IMAGE_TYPES.includes(imgType)) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_SIZE) return null;

    const ext = EXT_MAP[imgType] || 'png';
    const fileName = `tools/${prefix}-${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, { contentType: imgType, upsert: false });

    if (error || !data) {
      logger.error(`${prefix} 上传失败:`, error);
      return null;
    }
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path).data.publicUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* Helper: extract the best icon URL from HTML */
function extractIconUrl(html: string, baseUrl: string): string | null {
  // Priority: apple-touch-icon > icon with sizes > icon > shortcut icon
  const patterns = [
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i,
    /<link[^>]*rel=["']icon["'][^>]*sizes=["']\d+x\d+["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']icon["']/i,
    /<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*rel=["']shortcut icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']shortcut icon["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const href = match[1];
      if (href.startsWith('http')) return href;
      if (href.startsWith('//')) return `https:${href}`;
      try {
        return new URL(href, baseUrl).href;
      } catch {
        continue;
      }
    }
  }
  return null;
}

/* Helper: extract og:image URL from HTML */
function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  return match?.[1] ?? null;
}

/**
 * 管理员获取网站 Logo + OG 预览图并下载到 Supabase Storage
 * POST /api/admin/fetch-og-image
 * Body: { url: string }
 * Returns: { logoUrl, previewUrl, warnings }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { isAdmin, user } = await checkAdminAccess(supabase);

    if (!user || !isAdmin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const rl = await checkRateLimit(`og-image:${user.id}`, RATE_LIMITS.ogImageFetch);
    if (!rl.success) {
      return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });
    }

    const body = await request.json();
    const url = body?.url;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: '请提供 URL' }, { status: 400 });
    }

    // SSRF 防护：仅允许 https
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: '无效的 URL' }, { status: 400 });
    }

    if (parsed.protocol !== 'https:') {
      return NextResponse.json({ error: '仅支持 HTTPS' }, { status: 400 });
    }

    const hostname = parsed.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.startsWith('192.168.') ||
      hostname === '0.0.0.0'
    ) {
      return NextResponse.json({ error: '不允许访问内网地址' }, { status: 400 });
    }

    // 获取 HTML
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let html: string;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MiracleLearning-OGFetcher/1.0' },
      });
      if (!res.ok) {
        return NextResponse.json({ error: `请求失败: ${res.status}` }, { status: 502 });
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return NextResponse.json({ error: '目标不是 HTML 页面' }, { status: 400 });
      }
      html = await res.text();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return NextResponse.json({ error: '请求超时' }, { status: 504 });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    const warnings: string[] = [];

    // 并行获取 Logo 和 OG 预览图
    const iconUrl = extractIconUrl(html, url);
    const ogImageUrl = extractOgImage(html);

    // Logo: 优先用 HTML 中的 icon，fallback 到 Google Favicon API
    const logoSources = iconUrl
      ? [iconUrl, `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`]
      : [`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`];

    let logoUrl: string | null = null;
    for (const src of logoSources) {
      logoUrl = await downloadAndUpload(src, supabase, 'logo');
      if (logoUrl) break;
    }
    if (!logoUrl) warnings.push('未能获取网站 Logo');

    // OG 预览图
    let previewUrl: string | null = null;
    if (ogImageUrl) {
      previewUrl = await downloadAndUpload(ogImageUrl, supabase, 'og');
      if (!previewUrl) warnings.push('OG 预览图下载失败');
    }
    // Fallback: WordPress mshots screenshot service when no og:image or download failed
    if (!previewUrl) {
      const screenshotUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1200&h=630`;
      previewUrl = await downloadAndUpload(screenshotUrl, supabase, 'screenshot');
      if (!previewUrl) warnings.push('截图获取失败');
    }

    return NextResponse.json({ logoUrl, previewUrl, warnings });
  } catch (error) {
    logger.error('fetch-og-image error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
