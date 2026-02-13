'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Trophy,
  Flame,
  Star,
  Award,
  TrendingUp,
  Calendar,
  BookOpen,
  Target,
  ChevronRight,
  Edit2,
  Zap,
  Briefcase,
  BarChart3,
} from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  createPointsService,
  createBadgesService,
  getUserLevel,
  getPointsToNextLevel,
  USER_LEVELS,
  getLevelImage,
  getBadgeImage,
  getBadgeTierRingStyle,
  type PointBalance,
  type UserStreak,
  type UserBadge,
  type PointTransaction,
} from '@/lib/points';
import dynamic from 'next/dynamic';

// 性能优化：动态导入 EditProfileDialog（包含图片上传），减少初始 Bundle
const EditProfileDialog = dynamic(() => import('@/components/profile/edit-profile-dialog').then(m => ({ default: m.EditProfileDialog })));
import { EnergyBar, GrowthTree } from '@/components/gamification';

interface ProfileContentProps {
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatar_url?: string | null;
  };
  initialPointBalance: PointBalance | null;
  initialStreak: UserStreak | null;
  initialBadges: UserBadge[];
  initialTransactions: PointTransaction[];
  initialWorkshopProgress: { checkin_count: number; total_workshops: number };
  initialCourseCompletion: { completed: number; total: number };
  initialPortfolioStats: { submissions: number; experiences: number; cases: number; notes: number; total_likes: number };
}

/**
 * Profile Content - Resend inspired developer portfolio design
 * 性能优化：
 * - workshopProgress/courseCompletion/portfolioStats 从服务端传入，消除 3 次客户端请求瀑布
 * - Framer Motion m.div 替换为 CSS animate-fade-up，减少 JS bundle
 */
export function ProfileContent({
  user,
  initialPointBalance,
  initialStreak,
  initialBadges,
  initialTransactions,
  initialWorkshopProgress,
  initialCourseCompletion,
  initialPortfolioStats,
}: ProfileContentProps) {
  const router = useRouter();
  const [pointBalance, setPointBalance] = useState<PointBalance | null>(initialPointBalance);
  const [streak, setStreak] = useState<UserStreak | null>(initialStreak);
  const [badges, setBadges] = useState<UserBadge[]>(initialBadges);
  const [recentTransactions, setRecentTransactions] = useState<PointTransaction[]>(initialTransactions);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'badges' | 'transactions' | 'stats' | 'portfolio'>('badges');

  const workshopProgress = initialWorkshopProgress;
  const courseCompletion = initialCourseCompletion;
  const portfolioStats = initialPortfolioStats;

  const refreshData = useCallback(async () => {
    const supabase = createClient();
    const pointsService = createPointsService(supabase);
    const badgesService = createBadgesService(supabase);
    const [balance, userStreak, userBadges, transactions] = await Promise.all([
      pointsService.getPointBalance(user.id),
      pointsService.getUserStreak(user.id),
      badgesService.getUserBadges(user.id),
      pointsService.getPointTransactions(user.id, 10),
    ]);
    setPointBalance(balance);
    setStreak(userStreak);
    setBadges(userBadges);
    setRecentTransactions(transactions);
  }, [user.id]);

  const currentLevel = pointBalance ? getUserLevel(pointBalance.totalPoints) : USER_LEVELS[0];
  const pointsToNext = pointBalance ? getPointsToNextLevel(pointBalance.totalPoints) : null;
  const progressToNextLevel = pointsToNext !== null && currentLevel.maxPoints !== Infinity
    ? ((pointBalance?.totalPoints || 0) - currentLevel.minPoints) / (currentLevel.maxPoints - currentLevel.minPoints + 1) * 100
    : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div
        className="relative rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm animate-fade-up"
      >
        {/* Background gradient */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-border shadow-lg">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-3xl">
                  {user.name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full border-4 border-card" />
            </div>

            {/* User info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-medium text-card-foreground tracking-tight mb-1">
                    {user.name || '未设置昵称'}
                  </h1>
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                </div>
                <button
                  onClick={() => setShowEditDialog(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground text-sm hover:bg-muted hover:text-card-foreground transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  编辑
                </button>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-6 mt-6">
                {/* Level stat with badge image */}
                <div className="flex items-center gap-3">
                  <Image
                    src={getLevelImage(currentLevel.level, 'sm')}
                    alt={currentLevel.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">等级</p>
                    <p className="font-medium text-card-foreground">{currentLevel.name}</p>
                  </div>
                </div>
                {/* Other stats */}
                {[
                  { label: '积分', value: pointBalance?.totalPoints || 0, icon: Star, color: 'from-primary to-primary/80' },
                  { label: '连续登录', value: `${streak?.currentStreak || 0} 天`, icon: Flame, color: 'from-destructive to-destructive/80' },
                  { label: '勋章', value: `${badges.length} 枚`, icon: Award, color: 'from-primary to-primary/80' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                      <stat.icon className="w-5 h-5 text-card-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="font-medium text-card-foreground">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level Progress */}
      <div
        className="p-6 rounded-xl bg-card border border-border/50 shadow-sm animate-fade-up animate-delay-100"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-medium text-card-foreground">成长进度</h2>
        </div>
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex items-center gap-2">
            <Image
              src={getLevelImage(currentLevel.level, 'sm')}
              alt={currentLevel.name}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span className="text-muted-foreground">{currentLevel.name}</span>
          </div>
          {pointsToNext !== null && (
            <span className="text-muted-foreground">
              距离下一级还需 <span className="text-primary font-medium">{pointsToNext}</span> 积分
            </span>
          )}
        </div>
        <Progress value={progressToNextLevel} variant="gradient" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{currentLevel.minPoints}</span>
          {currentLevel.maxPoints !== Infinity && (
            <span>{currentLevel.maxPoints + 1}</span>
          )}
        </div>
      </div>

      {/* Energy Bar & Growth Tree */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up animate-delay-200"
      >
        {/* Workshop Energy Bar */}
        <div className="p-6 rounded-xl bg-card border border-border/50 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="font-medium text-card-foreground">Workshop 能量槽</h2>
          </div>
          <EnergyBar
            current={workshopProgress?.checkin_count ?? 0}
            total={workshopProgress?.total_workshops ?? 6}
            size="md"
          />
        </div>

        {/* Course Growth Tree */}
        <div className="p-6 rounded-xl bg-card border border-border/50 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-success" />
            <h2 className="font-medium text-card-foreground">AI 认知成长树</h2>
          </div>
          <GrowthTree
            completedCourses={courseCompletion?.completed ?? 0}
            totalCourses={courseCompletion?.total ?? 6}
            size="md"
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="animate-fade-up animate-delay-200"
      >
        {/* Tab buttons */}
        <div className="flex items-center gap-1 p-1 mb-4 rounded-xl bg-card border border-border/50 shadow-sm w-fit overflow-x-auto">
          {[
            { id: 'badges', label: '勋章墙', icon: Award },
            { id: 'transactions', label: '积分明细', icon: Star },
            { id: 'stats', label: '学习统计', icon: Target },
            { id: 'portfolio', label: '作品集', icon: Briefcase },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-card-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden">
          {/* Badges */}
          {activeTab === 'badges' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-card-foreground">我的勋章</h3>
                <button
                  onClick={() => router.push('/profile/badges')}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  查看全部
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {badges.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">还没有获得勋章</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">完成学习任务即可解锁勋章</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                  {badges.slice(0, 12).map((userBadge) => {
                    const badgeImgSrc = getBadgeImage(userBadge.badge.code, 64);
                    const tierRing = getBadgeTierRingStyle(userBadge.badge.tier);
                    return (
                      <div
                        key={userBadge.badge.id}
                        className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform"
                      >
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden ring ${tierRing.ringWidth} ${tierRing.ringColor} ${tierRing.glowShadow}`}
                        >
                          {badgeImgSrc ? (
                            <Image
                              src={badgeImgSrc}
                              alt={userBadge.badge.name}
                              width={56}
                              height={56}
                            />
                          ) : (
                            <div
                              className={`w-full h-full flex items-center justify-center ${
                                userBadge.badge.tier === 3
                                  ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                                  : userBadge.badge.tier === 2
                                    ? 'bg-gradient-to-br from-slate-300 to-gray-400'
                                    : 'bg-gradient-to-br from-orange-300 to-amber-400'
                              }`}
                            >
                              <Award className="w-7 h-7 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground text-center truncate w-full group-hover:text-card-foreground transition-colors">
                          {userBadge.badge.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Transactions */}
          {activeTab === 'transactions' && (
            <div>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">暂无积分记录</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          transaction.points > 0 ? 'bg-success/10' : 'bg-red-500/10'
                        }`}>
                          <Zap className={`w-4 h-4 ${
                            transaction.points > 0 ? 'text-success' : 'text-red-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-card-foreground">
                            {transaction.description || transaction.actionType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.createdAt), 'MM月dd日 HH:mm', {
                              locale: zhCN,
                            })}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-medium ${
                          transaction.points > 0 ? 'text-success' : 'text-red-400'
                        }`}
                      >
                        {transaction.points > 0 ? '+' : ''}{transaction.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {activeTab === 'stats' && (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  icon={Calendar}
                  label="最长连续登录"
                  value={`${streak?.longestStreak || 0} 天`}
                  color="from-primary to-primary/80"
                />
                <StatCard
                  icon={Flame}
                  label="当前连续登录"
                  value={`${streak?.currentStreak || 0} 天`}
                  color="from-destructive to-destructive/80"
                />
                <StatCard
                  icon={BookOpen}
                  label="已完成课程"
                  value={`${courseCompletion?.completed ?? 0} / ${courseCompletion?.total ?? 6}`}
                  color="from-primary to-primary/80"
                />
                <StatCard
                  icon={Trophy}
                  label="累计积分"
                  value={`${pointBalance?.totalPoints || 0}`}
                  color="from-warning to-warning/80"
                />
                <StatCard
                  icon={Zap}
                  label="Workshop参与"
                  value={`${workshopProgress?.checkin_count ?? 0} / ${workshopProgress?.total_workshops ?? 6}`}
                  color="from-primary to-primary/80"
                />
                <StatCard
                  icon={Briefcase}
                  label="作品总数"
                  value={`${(portfolioStats?.submissions ?? 0) + (portfolioStats?.experiences ?? 0) + (portfolioStats?.cases ?? 0)}`}
                  color="from-success to-success/80"
                />
              </div>
            </div>
          )}

          {/* Portfolio */}
          {activeTab === 'portfolio' && (
            <div className="p-6">
              {/* Portfolio summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-2xl font-bold text-card-foreground">{portfolioStats?.submissions ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Workshop 作品</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-2xl font-bold text-card-foreground">{portfolioStats?.experiences ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">工具体验</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-2xl font-bold text-card-foreground">{portfolioStats?.cases ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">应用案例</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-2xl font-bold text-card-foreground">{portfolioStats?.total_likes ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">获赞总数</p>
                </div>
              </div>

              {/* Empty state */}
              {(portfolioStats?.submissions ?? 0) + (portfolioStats?.experiences ?? 0) + (portfolioStats?.cases ?? 0) === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">还没有作品</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">参加 Workshop 或体验 AI 工具来创建你的作品集</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    你的作品分布在不同板块，点击查看详情：
                  </p>
                  {(portfolioStats?.submissions ?? 0) > 0 && (
                    <button
                      onClick={() => router.push('/workshop')}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Star className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm text-card-foreground">Workshop 作品 ({portfolioStats?.submissions})</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  {(portfolioStats?.experiences ?? 0) > 0 && (
                    <button
                      onClick={() => router.push('/ai-tools')}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm text-card-foreground">AI 工具体验 ({portfolioStats?.experiences})</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  {(portfolioStats?.notes ?? 0) > 0 && (
                    <button
                      onClick={() => router.push('/courses')}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-success" />
                        </div>
                        <span className="text-sm text-card-foreground">学习笔记 ({portfolioStats?.notes})</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSuccess={refreshData}
      />
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/30">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-card-foreground">{value}</p>
      </div>
    </div>
  );
}
