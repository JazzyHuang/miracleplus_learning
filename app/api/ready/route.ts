import { NextResponse } from 'next/server';

/**
 * 就绪检查端点
 *
 * GET /api/ready
 *
 * 检查服务是否准备好接收请求
 * 用于 Kubernetes/Vercel 就绪探针
 */
export async function GET() {
  // 简单的就绪检查 - 服务正在运行即可
  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
}
