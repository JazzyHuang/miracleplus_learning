import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { ExportService } from '@/lib/admin/export-service';
import { logger } from '@/lib/logger';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

// 强制动态渲染，因为此 API 路由需要使用 cookies() 进行身份验证
export const dynamic = 'force-dynamic';

// 导出上限：防止内存问题
const MAX_EXPORT_LIMIT = 50000;

/**
 * GET /api/admin/export/users
 * 导出用户数据（管理员权限）
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 验证管理员权限
    const { isAdmin, user } = await checkAdminAccess(supabase);
    if (!isAdmin || !user) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      );
    }

    // 速率限制检查
    const rateLimitResult = await checkRateLimit(
      `admin-export:${user.id}`,
      RATE_LIMITS.adminExport
    );
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') as 'csv' | 'json') || 'csv';
    const rawLimit = parseInt(searchParams.get('limit') || '10000', 10);

    // 限制导出上限（防止恶意用户传入极大值导致内存问题）
    const limit = Math.min(Math.max(1, rawLimit), MAX_EXPORT_LIMIT);

    // 创建导出服务
    const exportService = new ExportService(supabase);
    const data = await exportService.exportUsers({ format, limit });

    // 返回文件
    const filename = `users_${new Date().toISOString().split('T')[0]}.${format}`;
    const mimeType = format === 'json' ? 'application/json' : 'text/csv; charset=utf-8';

    // CSV 添加 BOM 以确保 Excel 正确显示中文
    const content = format === 'csv' ? '\uFEFF' + data : data;

    return new NextResponse(content, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });
  } catch (error) {
    logger.error('导出用户数据失败:', error);
    return NextResponse.json(
      { success: false, error: '导出失败' },
      { status: 500 }
    );
  }
}
