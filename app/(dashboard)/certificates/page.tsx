import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthUserWithProfile } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { Award } from 'lucide-react';
import { DB } from '@/lib/db-tables';
import { CertificateCard } from '@/components/certificates/certificate-card';

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
  const { authUser, profile } = await getAuthUserWithProfile();
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <CertificateCard
              key={cert.id}
              id={cert.id}
              type={cert.type}
              certificateNumber={cert.certificate_number}
              createdAt={cert.created_at}
              userName={profile?.name || undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
