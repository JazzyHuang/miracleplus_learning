import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { STORAGE_BUCKET } from '@/lib/db-tables';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/**
 * 管理员获取网站 OG 图片并下载到 Supabase Storage
 * POST /api/admin/fetch-og-image
 * Body: { url: string }
 * Returns: { ogImageUrl: string, storageUrl: string }
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

    // 禁止内网地址
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
    // 提取 og:image
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    if (!ogMatch?.[1]) {
      return NextResponse.json({ error: '未找到 OG 图片' }, { status: 404 });
    }

    const ogImageUrl = ogMatch[1];

    // 下载 OG 图片到 Supabase Storage
    let storageUrl: string | null = null;
    try {
      const imgController = new AbortController();
      const imgTimeout = setTimeout(() => imgController.abort(), 10000);

      const imgRes = await fetch(ogImageUrl, {
        signal: imgController.signal,
        headers: { 'User-Agent': 'MiracleLearning-OGFetcher/1.0' },
      });
      clearTimeout(imgTimeout);

      if (imgRes.ok) {
        const imgType = imgRes.headers.get('content-type')?.split(';')[0]?.trim() || '';
        const contentLength = parseInt(imgRes.headers.get('content-length') || '0', 10);

        if (contentLength > MAX_IMAGE_SIZE) {
          return NextResponse.json({ ogImageUrl, storageUrl: null, warning: '图片超过 5MB 限制' });
        }

        if (ALLOWED_IMAGE_TYPES.includes(imgType)) {
          const buffer = await imgRes.arrayBuffer();
          if (buffer.byteLength > MAX_IMAGE_SIZE) {
            return NextResponse.json({ ogImageUrl, storageUrl: null, warning: '图片超过 5MB 限制' });
          }

          const ext = EXT_MAP[imgType] || 'jpg';
          const fileName = `tools/og-${crypto.randomUUID()}.${ext}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, buffer, { contentType: imgType, upsert: false });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(uploadData.path);
            storageUrl = publicUrlData.publicUrl;
          } else {
            logger.error('OG 图片上传失败:', uploadError);
          }
        }
      }
    } catch (imgErr) {
      logger.error('OG 图片下载失败:', imgErr);
    }

    return NextResponse.json({ ogImageUrl, storageUrl });
  } catch (error) {
    logger.error('fetch-og-image error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
