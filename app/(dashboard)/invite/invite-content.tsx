'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  UserPlus,
  Copy,
  Check,
  Gift,
  Users,
  CheckCircle,
  Clock,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createInvitationsService } from '@/lib/community';
import { cn } from '@/lib/utils';
import type { UserInvitation } from '@/types/database';

/**
 * 邀请页面内容组件
 */
export function InviteContent() {
  const { user } = useUser();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    registered: 0,
    completed: 0,
    pointsEarned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // 获取邀请链接
  const inviteLink = inviteCode
    ? `${window.location.origin}/register?invite=${inviteCode}`
    : '';

  // 加载数据
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const invitationsService = createInvitationsService(supabase);

      const [code, invitationList, inviteStats] = await Promise.all([
        invitationsService.getOrCreateInviteCode(user.id),
        invitationsService.getUserInvitations(user.id),
        invitationsService.getInvitationStats(user.id),
      ]);

      setInviteCode(code);
      setInvitations(invitationList);
      setStats(inviteStats);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // 复制邀请链接
  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('邀请链接已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('复制失败');
    }
  };

  // 分享
  const handleShare = async () => {
    if (!inviteLink || !navigator.share) {
      handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: '加入 Miracle Learning',
        text: '和我一起学习 AI，成为 AI 时代的领航者！',
        url: inviteLink,
      });
    } catch (err) {
      // 用户取消分享
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <UserPlus className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">请先登录</h2>
        <p className="text-muted-foreground">登录后可以获取你的专属邀请链接</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      <PageHeader
        icon={UserPlus}
        title="邀请好友"
        description="邀请好友一起学习，获得积分奖励"
      />

      {/* 邀请链接卡片 */}
      <Card className="border-0 shadow-lg mb-8 bg-linear-to-br from-violet-50 via-purple-50 to-transparent dark:from-violet-950/20 dark:via-purple-950/10">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">邀请奖励</h2>
            <p className="text-muted-foreground">
              每位好友完成首次学习后，你将获得 <strong className="text-primary">80 积分</strong>
            </p>
          </div>

          {/* 邀请链接 */}
          <div className="space-y-3">
            <p className="text-sm font-medium">你的专属邀请链接</p>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="bg-background"
              />
              <Button
                variant="outline"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              邀请码：<strong>{inviteCode}</strong>
            </p>
          </div>

          {/* 分享按钮 */}
          <div className="flex gap-3 mt-6">
            <Button className="flex-1" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              分享给好友
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              复制链接
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">已邀请</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.registered}</p>
            <p className="text-xs text-muted-foreground">已注册</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">已完成</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <Gift className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.pointsEarned}</p>
            <p className="text-xs text-muted-foreground">获得积分</p>
          </CardContent>
        </Card>
      </div>

      {/* 邀请记录 */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">邀请记录</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p>还没有邀请记录</p>
              <p className="text-sm mt-1">分享邀请链接给好友吧！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <InvitationItem key={invitation.id} invitation={invitation} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 规则说明 */}
      <div className="mt-8 p-4 rounded-lg bg-muted/50">
        <h3 className="font-medium mb-2">邀请规则</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 好友通过你的邀请链接注册并完成首次学习后，你将获得 80 积分</li>
          <li>• 每个邀请码只能被使用一次</li>
          <li>• 积分可在积分商城兑换奖品</li>
          <li>• 严禁刷单行为，违规者将取消奖励资格</li>
        </ul>
      </div>
    </m.div>
  );
}

/**
 * 邀请记录项
 */
function InvitationItem({ invitation }: { invitation: UserInvitation }) {
  const statusConfig = {
    pending: { label: '待注册', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    registered: { label: '已注册', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  };

  const status = statusConfig[invitation.status];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      {invitation.invitee ? (
        <Avatar className="w-10 h-10">
          <AvatarImage src={invitation.invitee.avatar_url || undefined} />
          <AvatarFallback>
            {invitation.invitee.name?.[0] || invitation.invitee.email?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {invitation.invitee
            ? invitation.invitee.name || invitation.invitee.email
            : `邀请码: ${invitation.invite_code}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(invitation.created_at), 'MM月dd日 HH:mm', { locale: zhCN })}
        </p>
      </div>

      <Badge className={cn('shrink-0', status.color)}>
        {status.label}
      </Badge>

      {invitation.reward_claimed && (
        <Badge variant="secondary" className="shrink-0">
          +80
        </Badge>
      )}
    </div>
  );
}
