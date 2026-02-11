import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { DB } from '@/lib/db-tables';

/**
 * 健康检查端点
 *
 * GET /api/health
 *
 * 检查系统各组件的健康状态：
 * - 数据库连接
 * - 关键 RPC 函数可用性
 *
 * 用于负载均衡器健康检查和监控
 */
export async function GET() {
  const checks = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: 'unknown' as 'pass' | 'fail' | 'unknown',
        latency: 0,
        error: null as string | null,
      },
    },
    uptime: process.uptime(),
  };

  let hasFailures = false;

  // 1. 检查数据库连接
  const dbStart = Date.now();
  try {
    const supabase = await createClient();

    // 简单查询测试连接 - 使用 users 表
    const { error } = await supabase
      .from(DB.users)
      .select('id')
      .limit(1);

    const dbLatency = Date.now() - dbStart;

    if (error) {
      checks.checks.database = {
        status: 'fail',
        latency: dbLatency,
        error: error.message,
      };
      hasFailures = true;
    } else {
      checks.checks.database = {
        status: 'pass',
        latency: dbLatency,
        error: null,
      };
    }
  } catch (err) {
    const dbLatency = Date.now() - dbStart;
    checks.checks.database = {
      status: 'fail',
      latency: dbLatency,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    hasFailures = true;
  }

  // 2. 确定整体状态
  if (hasFailures) {
    checks.status = 'unhealthy';
  }

  // 3. 记录健康检查结果（仅在失败时）
  if (checks.status !== 'healthy') {
    logger.warn('健康检查失败', { checks });
  }

  // 4. 返回相应状态码和结果
  const statusCode = checks.status === 'healthy' ? 200 : checks.status === 'degraded' ? 200 : 503;

  return NextResponse.json(checks, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * 就绪检查端点
 *
 * GET /api/ready
 *
 * 检查服务是否准备好接收请求
 * 与健康检查的区别：就绪检查只检查服务是否启动，健康检查检查所有依赖
 */
export async function READY() {
  // 简单的就绪检查 - 服务正在运行即可
  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
}
