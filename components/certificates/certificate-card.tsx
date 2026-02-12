'use client';

import { useRef, useState } from 'react';
import { Award, Download, Share2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CertificateCardProps {
  id: string;
  type: 'ai_navigator' | 'completion' | 'achievement';
  certificateNumber: string;
  createdAt: string;
  userName?: string;
}

const TYPE_LABELS = {
  ai_navigator: 'AI 领航员认证证书',
  completion: '课程完成证书',
  achievement: '特别成就证书',
};

const TYPE_BADGES = {
  ai_navigator: 'AI 领航员',
  completion: '课程完成',
  achievement: '成就',
};

export function CertificateCard({ type, certificateNumber, createdAt, userName }: CertificateCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `certificate-${certificateNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('证书已下载');
    } catch {
      toast.error('下载失败，请稍后重试');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/verify/${certificateNumber}`;
    const text = `我获得了 Miracle Learning 的${TYPE_LABELS[type]}！`;
    if (navigator.share) {
      try {
        await navigator.share({ title: TYPE_LABELS[type], text, url });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success('已复制到剪贴板');
    }
  };

  return (
    <div className="space-y-3">
      {/* 可视化证书卡片 */}
      <div
        ref={cardRef}
        className="relative rounded-xl overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">
              {TYPE_BADGES[type]}
            </span>
            <Award className="w-8 h-8 text-white/40" />
          </div>

          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider">Certificate of</p>
            <h3 className="text-xl font-bold mt-1">{TYPE_LABELS[type]}</h3>
          </div>

          {userName && (
            <p className="text-lg font-medium text-white/90">{userName}</p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-white/20">
            <div>
              <p className="text-xs text-white/50">证书编号</p>
              <p className="text-sm font-mono">{certificateNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50">颁发日期</p>
              <p className="text-sm">{new Date(createdAt).toLocaleDateString('zh-CN')}</p>
            </div>
          </div>

          <p className="text-xs text-white/40 text-center">Miracle Learning · 奇绩创坛学习平台</p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          {downloading ? '生成中...' : '下载证书'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="w-3.5 h-3.5 mr-1.5" />
          分享
        </Button>
        <Link href={`/verify/${certificateNumber}`}>
          <Button variant="ghost" size="sm">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            在线验证
          </Button>
        </Link>
      </div>
    </div>
  );
}
