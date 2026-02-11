'use client';

import { useState } from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { requestDataExportAction, deleteAccountAction } from '@/app/actions/settings';
import { createClient } from '@/lib/supabase/client';

interface DataSectionProps {
  userEmail: string;
}

export function DataSection({ userEmail }: DataSectionProps) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await requestDataExportAction();
      if (!result.success) {
        toast.error(result.error || '导出失败');
        return;
      }

      // 下载 JSON 文件
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `miracle-learning-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('数据导出成功');
    } catch {
      toast.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmEmail.toLowerCase() !== userEmail.toLowerCase()) {
      toast.error('邮箱地址不匹配');
      return;
    }

    const confirmed = await confirm({
      title: '确认注销账户',
      description: '此操作不可撤销。你的所有数据（包括学习进度、积分、勋章、讨论帖等）将被永久删除。建议先导出数据。',
      confirmText: '确认注销',
      cancelText: '取消',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setDeleting(true);
    try {
      const result = await deleteAccountAction({ confirmEmail });
      if (!result.success) {
        toast.error(result.error || '注销失败');
        return;
      }

      // 客户端登出
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('账户已注销');
      router.push('/');
    } catch {
      toast.error('注销失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const emailMatches = confirmEmail.toLowerCase() === userEmail.toLowerCase();

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      {/* 数据导出 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            数据导出
          </CardTitle>
          <CardDescription>
            下载你在平台上的所有数据，包括个人资料、学习进度、积分记录等
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} loading={exporting}>
            <Download className="w-4 h-4 mr-2" />
            导出数据
          </Button>
          <p className="text-xs text-muted-foreground mt-2">每天最多导出一次</p>
        </CardContent>
      </Card>

      {/* 账户注销 */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            注销账户
          </CardTitle>
          <CardDescription>
            注销账户后，你的所有数据将被永久删除，包括学习进度、积分、勋章等。此操作不可撤销。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-email">请输入你的邮箱地址以确认注销</Label>
            <Input
              id="confirm-email"
              placeholder={userEmail}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />
          </div>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!emailMatches}
            loading={deleting}
          >
            注销账户
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
