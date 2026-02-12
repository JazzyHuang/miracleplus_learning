'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { updateLearningSettingsAction } from '@/app/actions/settings';
import type { UserSettings } from '@/types/database';

const FONT_SIZES = [
  { value: 'sm' as const, label: '小', size: '14px' },
  { value: 'md' as const, label: '标准', size: '16px' },
  { value: 'lg' as const, label: '大', size: '18px' },
];

const THEME_OPTIONS = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
];

interface LearningSectionProps {
  settings: UserSettings | null;
}

export function LearningSection({ settings }: LearningSectionProps) {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(settings?.font_size ?? 'md');
  const [reduceMotion, setReduceMotion] = useState(settings?.reduce_motion ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateLearningSettingsAction({
        font_size: fontSize,
        reduce_motion: reduceMotion,
      });

      if (!result.success) {
        toast.error(result.error || '保存失败');
        return;
      }

      // 应用到 localStorage + DOM
      localStorage.setItem('ml-font-size', fontSize);
      localStorage.setItem('ml-reduce-motion', String(reduceMotion));
      document.documentElement.setAttribute('data-font-size', fontSize === 'md' ? '' : fontSize);
      document.documentElement.setAttribute('data-reduce-motion', String(reduceMotion));

      toast.success('学习偏好已保存');
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const previewSize = FONT_SIZES.find((f) => f.value === fontSize)?.size ?? '16px';

  return (
    <Card>
      <CardHeader>
        <CardTitle>学习偏好</CardTitle>
        <CardDescription>自定义你的学习体验</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 字体大小 */}
        <div className="space-y-3">
          <Label>字体大小</Label>
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit">
            {FONT_SIZES.map((item) => (
              <button
                key={item.value}
                onClick={() => setFontSize(item.value)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  fontSize === item.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
            <p style={{ fontSize: previewSize }} className="text-foreground transition-all">
              这是一段预览文字，用于展示当前字体大小的效果。
            </p>
          </div>
        </div>

        {/* 主题模式 */}
        <div className="space-y-3">
          <Label>主题模式</Label>
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit">
            {THEME_OPTIONS.map((item) => (
              <button
                key={item.value}
                onClick={() => setTheme(item.value)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  theme === item.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            主题切换即时生效，无需保存
          </p>
        </div>

        {/* 减少动画 */}
        <div className="flex items-center justify-between py-3 px-1">
          <div className="space-y-0.5 pr-4">
            <Label htmlFor="reduce-motion" className="text-sm font-medium cursor-pointer">
              减少动画
            </Label>
            <p className="text-xs text-muted-foreground">
              关闭页面过渡动画和装饰性动效
            </p>
          </div>
          <Switch
            id="reduce-motion"
            checked={reduceMotion}
            onCheckedChange={setReduceMotion}
          />
        </div>

        <Button onClick={handleSave} loading={saving}>
          保存
        </Button>
      </CardContent>
    </Card>
  );
}
