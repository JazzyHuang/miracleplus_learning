import { Metadata } from 'next';
import { createCacheClient } from '@/lib/supabase/server';
import { CheckCircle2, XCircle, Shield } from 'lucide-react';
import { DB } from '@/lib/db-tables';

// 强制动态渲染，因为证书验证需要实时数据
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ certificateNumber: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { certificateNumber } = await params;
  return {
    title: `证书验证 ${certificateNumber} - Miracle Learning`,
    description: '验证 Miracle Learning 颁发的证书真伪',
  };
}

interface Certificate {
  certificate_number: string;
  type: 'ai_navigator' | 'completion' | 'achievement';
  created_at: string;
  user: { name: string | null; avatar_url: string | null } | null;
}

/**
 * 证书公开验证页面
 *
 * 无需登录即可访问，通过证书编号验证证书真伪。
 * QR码扫描后跳转到此页面。
 */
export default async function CertificateVerifyPage({ params }: Props) {
  const { certificateNumber } = await params;
  const supabase = createCacheClient();

  const { data: certificate } = await supabase
    .from(DB.certificates)
    .select(`
      *,
      user:${DB.users} (name, avatar_url)
    `)
    .eq('certificate_number', certificateNumber)
    .single() as { data: Certificate | null };

  const isValid = !!certificate;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex rounded-full bg-primary/10 p-3 mb-3">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Miracle Learning</h1>
          <p className="text-sm text-muted-foreground">证书验证</p>
        </div>

        {/* Result card */}
        <div className={`rounded-2xl border p-8 text-center space-y-4 ${
          isValid
            ? 'border-success/30 bg-success/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}>
          {isValid ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
              <div>
                <h2 className="text-lg font-semibold text-success/80">证书有效</h2>
                <p className="text-sm text-muted-foreground mt-1">该证书信息已通过验证</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <InfoRow label="持证人" value={certificate.user?.name ?? '未知'} />
                <InfoRow
                  label="证书类型"
                  value={
                    certificate.type === 'ai_navigator' ? 'AI 领航员认证' :
                    certificate.type === 'completion' ? '课程完成认证' : '特别成就认证'
                  }
                />
                <InfoRow label="证书编号" value={certificate.certificate_number} />
                <InfoRow
                  label="颁发日期"
                  value={new Date(certificate.created_at).toLocaleDateString('zh-CN')}
                />
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto" />
              <div>
                <h2 className="text-lg font-semibold text-red-300">未找到证书</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  未找到编号为 <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">{certificateNumber}</code> 的证书
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Miracle Learning. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
