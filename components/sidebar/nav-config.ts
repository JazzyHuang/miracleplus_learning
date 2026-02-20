import type { LucideIcon } from 'lucide-react';
import {
  Home,
  BookOpen,
  CalendarDays,
  Brain,
  Bot,
  Newspaper,
  BarChart3,
  MessageSquare,
  Users,
  Trophy,
  ShoppingBag,
  UserPlus,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    id: 'learning',
    label: '学习中心',
    items: [
      { label: '首页', href: '/dashboard', icon: Home, keywords: ['home', 'dashboard', '仪表盘'] },
      { label: '课程资源', href: '/courses', icon: BookOpen, keywords: ['course', 'learn', '学习', '课程'] },
      { label: 'Workshop', href: '/workshop', icon: CalendarDays, keywords: ['workshop', 'event', '活动', '线下'] },
      { label: '每日复习', href: '/review', icon: Brain, keywords: ['review', '复习', '记忆'] },
    ],
  },
  {
    id: 'resources',
    label: '资源与工具',
    items: [
      { label: 'AI 工具', href: '/ai-tools', icon: Bot, keywords: ['ai', 'tool', '工具', '人工智能'] },
      { label: '日报月报', href: '/articles', icon: Newspaper, keywords: ['article', 'news', '日报', '月报', '文章'] },
      { label: '学习报告', href: '/report', icon: BarChart3, keywords: ['report', '报告', '统计'] },
    ],
  },
  {
    id: 'community',
    label: '互动社区',
    items: [
      { label: '社区讨论', href: '/discussions', icon: MessageSquare, keywords: ['discussion', 'community', '讨论', '社区'] },
      { label: '学习小组', href: '/groups', icon: Users, keywords: ['group', '小组', '学习'] },
      { label: '排行榜', href: '/leaderboard', icon: Trophy, keywords: ['leaderboard', 'rank', '排行', '积分'] },
    ],
  },
  {
    id: 'growth',
    label: '成长激励',
    items: [
      { label: '积分商城', href: '/shop', icon: ShoppingBag, keywords: ['shop', 'store', '商城', '兑换'] },
      { label: '邀请好友', href: '/invite', icon: UserPlus, keywords: ['invite', 'friend', '邀请', '好友'] },
    ],
  },
];

/** 所有导航项的扁平列表（供 Command Palette 和路由预取使用） */
export const allNavItems: NavItem[] = navGroups.flatMap(g => g.items);

/** 根据 pathname 查找所属分组 ID */
export function findGroupByHref(pathname: string): string | null {
  for (const group of navGroups) {
    if (group.items.some(item =>
      item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.href)
    )) {
      return group.id;
    }
  }
  return null;
}
