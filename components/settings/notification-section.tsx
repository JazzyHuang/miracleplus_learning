'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { updateNotificationSettingsAction } from '@/app/actions/settings';
import type { UserSettings } from '@/types/database';

const NOTIFICATION_ITEMS = [
  {
    key: 'email_course_updates' as const,
    label: '课程更新',
    description: '课程内容更新时通知你',
  },
  {
    key: 'email_community_replies' as const,
    label: '社区回复',
    description: '有人回复你的讨论或评论时通知你',
  },
  {
    key: 'email_weekly_digest' as const,
    label: '每周学习周报',
    description: '每周发送学习进度总结',
  },
  {
    key: 'email_point_milestones' as const,
    label: '积分里程碑',
    description: '达到积分里程碑时通知你',
  },
];

type NotificationKey = (typeof NOTIFICATION_ITEMS)[number]['key'];

interface NotificationSectionProps {
  settings: UserSettings | null;
}

export function NotificationSection({ settings }: NotificationSectionProps) {
  const [values, setValues] = useState<Record<NotificationKey, boolean>>({
    email_course_updates: settings?.email_course_updates ?? true,
    email_community_replies: settings?.email_community_replies ?? true,
    email_weekly_digest: settings?.email_weekly_digest ?? true,
    email_point_milestones: settings?.email_point_milestones ?? true,
  });
  const [isPending, startTransition] = useTransition();

  const handleToggle = (key: NotificationKey, checked: boolean) => {
    const prev = values[key];
    setValues((v) => ({ ...v, [key]: checked }));

    startTransition(async () => {
      const result = await updateNotificationSettingsAction({
        ...values,
        [key]: checked,
      });
      if (!result.success) {
        setValues((v) => ({ ...v, [key]: prev }));
        toast.error(result.error || '保存失败');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>通知偏好</CardTitle>
        <CardDescription>
          管理你接收的邮件通知类型
          <span className="block mt-1 text-xs text-muted-foreground/70">
            邮件发送功能即将上线
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {NOTIFICATION_ITEMS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 px-1"
            >
              <div className="space-y-0.5 pr-4">
                <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">
                  {item.label}
                </Label>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={item.key}
                checked={values[item.key]}
                onCheckedChange={(checked) => handleToggle(item.key, checked)}
                disabled={isPending}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
