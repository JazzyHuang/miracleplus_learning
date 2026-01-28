'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  Plus,
  ThumbsUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExperienceForm } from '@/components/ai-tools';
import { LikeButton } from '@/components/common/like-button';
import { createAIToolsService } from '@/lib/ai-tools';
import { cn } from '@/lib/utils';
import type { AITool, ToolExperience } from '@/types/database';

interface ToolDetailContentProps {
  tool: AITool;
  initialExperiences: ToolExperience[];
}

const pricingLabels = {
  free: { label: '免费', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  freemium: { label: '免费增值', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  paid: { label: '付费', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

/**
 * 工具详情页内容组件
 */
export function ToolDetailContent({ tool, initialExperiences }: ToolDetailContentProps) {
  const { user } = useUser();
  const [experiences, setExperiences] = useState<ToolExperience[]>(initialExperiences);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const pricing = pricingLabels[tool.pricing_type];

  // 提交评分
  const handleRating = async (rating: number) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    try {
      const supabase = createClient();
      const aiToolsService = createAIToolsService(supabase);
      const result = await aiToolsService.submitRating(user.id, tool.id, rating);

      if (result.success) {
        setUserRating(rating);
        if (result.pointsEarned && result.pointsEarned > 0) {
          toast.success(`评分成功！+${result.pointsEarned} 积分`);
        } else {
          toast.success('评分已更新');
        }
      } else {
        toast.error(result.error || '评分失败');
      }
    } catch (err) {
      toast.error('评分失败');
    }
  };

  // 切换收藏
  const handleToggleBookmark = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    try {
      const supabase = createClient();
      const aiToolsService = createAIToolsService(supabase);
      const result = await aiToolsService.toggleBookmark(user.id, 'tool', tool.id);

      if (result.error) {
        toast.error(result.error);
      } else {
        setIsBookmarked(result.bookmarked);
        toast.success(result.bookmarked ? '已收藏' : '已取消收藏');
      }
    } catch (err) {
      toast.error('操作失败');
    }
  };

  // 刷新灵感碎片
  const refreshExperiences = async () => {
    const supabase = createClient();
    const aiToolsService = createAIToolsService(supabase);
    const data = await aiToolsService.getExperiences(tool.id, 10);
    setExperiences(data);
  };

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto"
    >
      {/* 返回按钮 */}
      <Link href="/ai-tools">
        <Button variant="ghost" className="mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回工具库
        </Button>
      </Link>

      {/* 工具头部 */}
      <Card className="border-0 shadow-lg overflow-hidden mb-8">
        <CardContent className="p-6">
          <div className="flex gap-6">
            {/* Logo */}
            <div className="shrink-0">
              {tool.logo_url ? (
                <Image
                  src={tool.logo_url}
                  alt={tool.name}
                  width={96}
                  height={96}
                  className="rounded-2xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">
                    {tool.name[0]}
                  </span>
                </div>
              )}
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{tool.name}</h1>
                  {tool.category && (
                    <p className="text-muted-foreground mt-1">
                      {tool.category.name}
                    </p>
                  )}
                </div>
                <Badge className={cn('shrink-0', pricing.color)}>
                  {pricing.label}
                </Badge>
              </div>

              <p className="text-muted-foreground mt-3">
                {tool.description}
              </p>

              {/* 统计 */}
              <div className="flex items-center gap-6 mt-4">
                {/* 评分 */}
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-lg">
                    {tool.avg_rating > 0 ? tool.avg_rating.toFixed(1) : '-'}
                  </span>
                  {tool.rating_count > 0 && (
                    <span className="text-muted-foreground text-sm">
                      ({tool.rating_count} 评分)
                    </span>
                  )}
                </div>

                {/* 体验数 */}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span>{tool.experience_count} 灵感碎片</span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-3 mt-4">
                {tool.website_url && (
                  <a
                    href={tool.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      访问官网
                    </Button>
                  </a>
                )}
                <Button
                  variant="outline"
                  onClick={handleToggleBookmark}
                >
                  {isBookmarked ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 mr-2" />
                      已收藏
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 mr-2" />
                      收藏
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户评分区 */}
      {user && (
        <Card className="border-0 shadow-md mb-8">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">为这个工具评分</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'w-6 h-6 transition-colors',
                        (hoveredStar !== null ? star <= hoveredStar : star <= (userRating || 0))
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-muted-foreground'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 标签页 */}
      <Tabs defaultValue="experiences" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="experiences" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            灵感碎片 ({experiences.length})
          </TabsTrigger>
          <TabsTrigger value="about">
            关于工具
          </TabsTrigger>
        </TabsList>

        {/* 灵感碎片 */}
        <TabsContent value="experiences">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                灵感碎片
              </CardTitle>
              {user && (
                <Button onClick={() => setShowExperienceForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  分享心得
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!user && (
                <div className="text-center py-8 text-muted-foreground">
                  登录后可以分享使用心得
                </div>
              )}

              {experiences.length === 0 ? (
                <div className="text-center py-12">
                  <Lightbulb className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">还没有灵感碎片</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    成为第一个分享使用心得的人吧！
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {experiences.map((exp) => (
                    <ExperienceCard key={exp.id} experience={exp} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 关于工具 */}
        <TabsContent value="about">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="prose dark:prose-invert max-w-none">
                {tool.long_description ? (
                  <p>{tool.long_description}</p>
                ) : (
                  <p>{tool.description}</p>
                )}

                {tool.pricing_details && (
                  <>
                    <h3>定价说明</h3>
                    <p>{tool.pricing_details}</p>
                  </>
                )}

                {tool.tags && tool.tags.length > 0 && (
                  <>
                    <h3>标签</h3>
                    <div className="flex flex-wrap gap-2 not-prose">
                      {tool.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 灵感碎片表单 */}
      <ExperienceForm
        toolId={tool.id}
        toolName={tool.name}
        open={showExperienceForm}
        onClose={() => setShowExperienceForm(false)}
        onSuccess={refreshExperiences}
      />
    </m.div>
  );
}

/**
 * 灵感碎片卡片
 */
function ExperienceCard({ experience }: { experience: ToolExperience }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-lg',
        experience.is_featured
          ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
          : 'bg-muted/50'
      )}
    >
      {experience.is_featured && (
        <div className="flex items-center gap-1 text-amber-600 text-xs mb-2">
          <Star className="w-3 h-3" />
          精选心得
        </div>
      )}

      <div className="flex gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={experience.user?.avatar_url || undefined} />
          <AvatarFallback>
            {experience.user?.name?.[0] || experience.user?.email?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {experience.user?.name || experience.user?.email || '匿名用户'}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(experience.created_at), 'MM月dd日', { locale: zhCN })}
            </span>
          </div>

          <p className="text-sm">{experience.use_case}</p>

          {(experience.pros || experience.cons) && (
            <div className="flex gap-4 mt-2 text-sm">
              {experience.pros && (
                <div className="text-green-600 dark:text-green-400">
                  <span className="font-medium">优点：</span>
                  {experience.pros}
                </div>
              )}
              {experience.cons && (
                <div className="text-red-600 dark:text-red-400">
                  <span className="font-medium">缺点：</span>
                  {experience.cons}
                </div>
              )}
            </div>
          )}

          {experience.screenshot_url && (
            <div className="mt-3">
              <Image
                src={experience.screenshot_url}
                alt="截图"
                width={300}
                height={200}
                className="rounded-lg object-cover"
              />
            </div>
          )}

          <div className="mt-2">
            <LikeButton
              targetType="comment"
              targetId={experience.id}
              initialCount={experience.like_count}
              iconType="thumbsUp"
              size="sm"
            />
          </div>
        </div>
      </div>
    </m.div>
  );
}
