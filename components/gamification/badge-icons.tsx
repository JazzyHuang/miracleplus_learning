/**
 * 缺失徽章的 SVG 图标数据
 *
 * 为 badge-card.tsx 中无 PNG 的徽章提供 inline SVG fallback。
 * 每个图标在 24×24 viewBox 内设计，统一 stroke-width=1.5，圆角风格。
 */

import { cn } from '@/lib/utils';

interface BadgeIconProps {
  className?: string;
  size?: number;
}

// --- 学习类 ---

/** 初学者 — 打开的书本 + 闪光 */
export function FirstLessonIcon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <path d="M2 6s2-2 5-2 5 2 5 2v12s-2-1.5-5-1.5S2 18 2 18V6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6s2-2 5-2 5 2 5 2v12s-2-1.5-5-1.5-5 1.5-5 1.5V6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3l1-1m2 3l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** 学习达人 — 书本堆叠 + 向上箭头 */
export function Lesson10Icon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <rect x="4" y="10" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="7" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="8" y="4" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M19 8V3m0 0l-2 2m2-2l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 学霸 — 学士帽 + 星芒 */
export function Lesson50Icon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <path d="M12 3L2 8l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 10.5v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="15" r="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/** 毕业生 — 证书/卷轴 */
export function CourseCompleteIcon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h8M8 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 15v1h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 全科状元 — 皇冠 + 书本 */
export function AllCoursesIcon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <path d="M3 8l3 10h12l3-10-4 4-5-6-5 6-4-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 18h12v2H6v-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// --- Workshop 类 ---

/** 首次签到 — 打勾的日历 */
export function FirstCheckinIcon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 活跃参与者 — 日历 + 连续打勾 */
export function Checkin5Icon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 13l1.5 1.5L11 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 13l1.5 1.5L17 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 16.5l1 1L13 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </svg>
  );
}

/** 全勤学员 — 金色日历 + 完美标记 */
export function CheckinAllIcon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="15" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 15l1.5 1.5L14 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 创作新星 — 火箭 */
export function FirstSubmissionIcon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <path d="M12 2c0 0-4 4-4 10s4 10 4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 2c0 0 4 4 4 10s-4 10-4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 15c0-2 3-3 7-3s7 1 7 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 20l-2 2M16 20l2 2M12 22v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** TOP3 作品 — 奖杯 + "3" */
export function SubmissionTop3Icon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <path d="M6 3h12v6a6 6 0 01-12 0V3z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 5H3v2a3 3 0 003 3M18 5h3v2a3 3 0 01-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 15v3M8 20h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <text x="12" y="11" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor" fontFamily="system-ui">3</text>
    </svg>
  );
}

/** 讲师 — 麦克风 */
export function InstructorIcon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <rect x="9" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 10a7 7 0 0014 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 17v4M8 21h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// --- 积分类 ---

/** 积分新手 — 铜色硬币 */
export function Points500Icon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" fontFamily="system-ui">$</text>
    </svg>
  );
}

/** 积分达人 — 硬币堆 */
export function Points2000Icon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <ellipse cx="12" cy="18" rx="7" ry="3" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="14" rx="7" ry="3" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="10" rx="7" ry="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 10v8M19 10v8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** 积分王者 — 宝箱 */
export function Points5000Icon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <rect x="3" y="10" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 14h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 10V8a7 7 0 0114 0v2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="12" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// --- 社区类 ---

/** 笔记达人 — 笔记本 + 铅笔 */
export function NoteTakerIcon({ className, size = 24 }: BadgeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('shrink-0', className)}>
      <rect x="4" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h6M8 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 10l3-3 1.5 1.5-3 3L17 12v-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

// --- Badge code → Component 映射 ---

export const BADGE_ICON_MAP: Record<string, React.ComponentType<BadgeIconProps>> = {
  'first-lesson': FirstLessonIcon,
  'lesson-10': Lesson10Icon,
  'lesson-50': Lesson50Icon,
  'course-complete': CourseCompleteIcon,
  'all-courses': AllCoursesIcon,
  'first-checkin': FirstCheckinIcon,
  'checkin-5': Checkin5Icon,
  'checkin-all': CheckinAllIcon,
  'first-submission': FirstSubmissionIcon,
  'submission-top3': SubmissionTop3Icon,
  'instructor': InstructorIcon,
  'points-500': Points500Icon,
  'points-2000': Points2000Icon,
  'points-5000': Points5000Icon,
  'note-taker': NoteTakerIcon,
};
