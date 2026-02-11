import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthUserWithProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { Award, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { DB } from '@/lib/db-tables';

export const metadata: Metadata = {
  title: '我的证书 - Miracle Learning',
  description: '查看和下载你获得的证书',
};

interface Certificate {
  id: string;
  type: 'ai_navigator' | 'completion' | 'achievement';
  certificate_number: string;
  created_at: string;
}

export default async function CertificatesPage() {
  const { authUser } = await getAuthUserWithProfile();
  if (!authUser) redirect('/login');

  const supabase = await createClient();
  const { data: certificates } = await supabase
    .from(DB.certificates)
    .select('*')
    .eq('user_id', authUser.id)
    .order('created_at', { ascending: false }) as { data: Certificate[] | null };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Award className="w-6 h-6 text-warning" />
          我的证书
        </h1>
        <p className="text-sm text-muted-foreground">
          达到 AI 领航员级别 (800+ 积分) 或完成特定成就可获得证书
        </p>
      </div>

      {!certificates || certificates.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-border/50 bg-card shadow-sm">
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-muted-foreground/70" />
          </div>
          <p className="text-muted-foreground">还没有获得证书</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            达到 AI 领航员级别 (800+ 积分) 将自动颁发证书
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="relative rounded-xl border border-warning/20 bg-gradient-to-br from-warning/5 to-transparent p-6 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                    {cert.type === 'ai_navigator' ? 'AI 领航员' :
                     cert.type === 'completion' ? '课程完成' : '成就'}
                  </span>
                  <h3 className="mt-2 font-medium text-card-foreground">
                    {cert.type === 'ai_navigator' ? 'AI 领航员认证证书' :
                     cert.type === 'completion' ? '课程完成证书' : '特别成就证书'}
                  </h3>
                </div>
                <Award className="w-10 h-10 text-warning/30" />
              </div>
              <p className="text-xs text-muted-foreground">
                证书编号: {cert.certificate_number}
              </p>
              <p className="text-xs text-muted-foreground/70">
                颁发日期: {new Date(cert.created_at).toLocaleDateString('zh-CN')}
              </p>
              <div className="flex gap-2 pt-2">
                <Link
                  href={`/verify/${cert.certificate_number}`}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  在线验证
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
