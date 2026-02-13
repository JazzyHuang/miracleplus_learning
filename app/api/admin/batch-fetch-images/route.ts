import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { DB, STORAGE_BUCKET } from '@/lib/db-tables';
import { revalidateTag } from 'next/cache';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
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
    if (!ALLOWED_IMAGE_TYPES.includes(imgType)) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_SIZE) return null;
    const ext = EXT_MAP[imgType] || 'png';
    const fileName = `tools/${prefix}-${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, { contentType: imgType, upsert: false });
    if (error || !data) return null;
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path).data.publicUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractIconUrl(html: string, baseUrl: string): string | null {
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
      try { return new URL(href, baseUrl).href; } catch { continue; }
    }
  }
  return null;
}

function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  return match?.[1] ?? null;
}

/**
 * 批量获取缺失图片的 AI 工具的 Logo + 预览图
 * POST /api/admin/batch-fetch-images
 * Returns: { updated: number, failed: number, details: [...] }
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { isAdmin, user } = await checkAdminAccess(supabase);
    if (!user || !isAdmin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const rl = await checkRateLimit(`batch-fetch:${user.id}`, RATE_LIMITS.ogImageFetch);
    if (!rl.success) {
      return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });
    }

    // Find tools with website_url but missing logo or preview
    const { data: tools, error } = await supabase
      .from(DB.ai_tools)
      .select('id, name, website_url, logo_url, preview_image_url')
      .not('website_url', 'is', null)
      .neq('website_url', '');

    if (error || !tools) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const needsFetch = tools.filter(
      t => !t.logo_url || !t.preview_image_url
    );

    if (needsFetch.length === 0) {
      return NextResponse.json({ updated: 0, failed: 0, details: [], message: '所有工具图片已完整' });
    }

    let updated = 0;
    let failed = 0;
    const details: { name: string; logo: boolean; preview: boolean }[] = [];

    for (const tool of needsFetch) {
      const url = tool.website_url;
      if (!url) continue;

      try {
        // Validate URL
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') { failed++; continue; }
        const hostname = parsed.hostname;
        if (['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) ||
            hostname.startsWith('10.') || hostname.startsWith('172.') || hostname.startsWith('192.168.')) {
          failed++; continue;
        }

        // Fetch HTML
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);
        let html: string;
        try {
          const res = await fetch(url, {
            signal: ctrl.signal,
            headers: { 'User-Agent': 'MiracleLearning-OGFetcher/1.0' },
          });
          if (!res.ok) { failed++; continue; }
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('text/html')) { failed++; continue; }
          html = await res.text();
        } catch {
          failed++; continue;
        } finally {
          clearTimeout(timer);
        }

        const updateData: Record<string, string> = {};
        let gotLogo = false;
        let gotPreview = false;

        // Fetch logo if missing
        if (!tool.logo_url) {
          const iconUrl = extractIconUrl(html, url);
          const sources = iconUrl
            ? [iconUrl, `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`]
            : [`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`];
          for (const src of sources) {
            const logoUrl = await downloadAndUpload(src, supabase, 'logo');
            if (logoUrl) { updateData.logo_url = logoUrl; gotLogo = true; break; }
          }
        }

        // Fetch preview if missing
        if (!tool.preview_image_url) {
          const ogUrl = extractOgImage(html);
          if (ogUrl) {
            const previewUrl = await downloadAndUpload(ogUrl, supabase, 'og');
            if (previewUrl) { updateData.preview_image_url = previewUrl; gotPreview = true; }
          }
          // Fallback: WordPress mshots screenshot service
          if (!gotPreview) {
            const screenshotUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1200&h=630`;
            const previewUrl = await downloadAndUpload(screenshotUrl, supabase, 'screenshot');
            if (previewUrl) { updateData.preview_image_url = previewUrl; gotPreview = true; }
          }
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from(DB.ai_tools)
            .update(updateData)
            .eq('id', tool.id);
          if (!updateError) {
            updated++;
          } else {
            logger.error(`batch-fetch update failed for ${tool.name}:`, updateError);
            failed++;
          }
        } else {
          failed++;
        }

        details.push({ name: tool.name, logo: gotLogo, preview: gotPreview });
      } catch {
        failed++;
        details.push({ name: tool.name, logo: false, preview: false });
      }
    }

    revalidateTag('ai-tools', 'max');
    return NextResponse.json({ updated, failed, total: needsFetch.length, details });
  } catch (error) {
    logger.error('batch-fetch-images error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
