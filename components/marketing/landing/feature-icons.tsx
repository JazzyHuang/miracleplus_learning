/**
 * Landing 页特性卡片自定义图标
 *
 * 替代通用 Lucide 图标，增加品牌辨识度。
 * 每个图标 24×24 viewBox，使用 currentColor 着色。
 */

interface FeatureIconProps {
  className?: string;
}

/** AI 工具体验台 — 机器人 + 闪光装饰 */
export function AIToolsIcon({ className }: FeatureIconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="4" y="8" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      {/* 眼睛 */}
      <circle cx="9" cy="14" r="1.5" fill="currentColor" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" />
      {/* 天线 */}
      <path d="M12 8V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="4" r="1" fill="currentColor" />
      {/* 闪光装饰 */}
      <path d="M20 4l1-1M22 6l1-0.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M2 6l-1-0.5M3 3.5l-1-1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** 积分排行榜 — 奖杯 + 星芒 */
export function GamificationIcon({ className }: FeatureIconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* 奖杯主体 */}
      <path d="M7 4h10v7a5 5 0 01-10 0V4z" stroke="currentColor" strokeWidth="1.5" />
      {/* 把手 */}
      <path d="M7 6H5a2 2 0 00-2 2v1a3 3 0 003 3h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 6h2a2 2 0 012 2v1a3 3 0 01-3 3h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* 底座 */}
      <path d="M12 16v2M9 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* 星芒 */}
      <path d="M12 2v1M9 2.5l0.5 0.8M15 2.5l-0.5 0.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** 实战课程 — 播放按钮 + 进度弧线 */
export function CoursesIcon({ className }: FeatureIconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* 圆形背景 */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      {/* 播放三角 */}
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" />
      {/* 进度弧线 */}
      <path
        d="M12 3a9 9 0 016.36 2.64"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* 章节标记 */}
      <circle cx="19.5" cy="7" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/** 工作坊 & 社区 — 人群 + 连接线 */
export function CommunityIcon({ className }: FeatureIconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* 中心人物 */}
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 20v-1a5 5 0 0110 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* 左侧人物 */}
      <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <path d="M2 18v-0.5a3 3 0 016 0V18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      {/* 右侧人物 */}
      <circle cx="19" cy="10" r="2" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <path d="M16 18v-0.5a3 3 0 016 0V18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      {/* 连接线 */}
      <path d="M8 9.5l-1.5 1M16 9.5l1.5 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" strokeDasharray="1 1.5" />
    </svg>
  );
}
