'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { updatePrivacySettingsAction } from '@/app/actions/settings';
import type { UserSettings } from '@/types/database';

const PRIVACY_ITEMS = [
  {
    key: 'show_on_leaderboard' as const,
    label: '在排行榜中显示',
    description: '关闭后你的排名将不会出现在排行榜中',
  },
  {
    key: 'show_profile_public' as const,
    label: '公开个人资料',
    description: '关闭后其他用户无法查看你的详细资料',
  },
  {
    key: 'show_activity' as const,
    label: '显示学习动态',
    description: '关闭后你的学习活动将不会对其他用户可见',
  },
];

type PrivacyKey = (typeof PRIVACY_ITEMS)[number]['key'];

interface PrivacySectionProps {
  settings: UserSettings | null;
}

export function PrivacySection({ settings }: PrivacySectionProps) {
  const [values, setValues] = useState<Record<PrivacyKey, boolean>>({
    show_on_leaderboard: settings?.show_on_leaderboard ?? true,
    show_profile_public: settings?.show_profile_public ?? true,
    show_activity: settings?.show_activity ?? true,
  });
  const [isPending, startTransition] = useTransition();

  const handleToggle = (key: PrivacyKey, checked: boolean) => {
    const prev = values[key];
    setValues((v) => ({ ...v, [key]: checked }));

    startTransition(async () => {
      const result = await updatePrivacySettingsAction({
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
        <CardTitle>隐私设置</CardTitle>
        <CardDescription>控制你的个人信息可见范围</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {PRIVACY_ITEMS.map((item) => (
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
