/**
 * 徽章图片资源映射
 *
 * 集中管理所有徽章 code → 图片路径的映射关系，
 * 以及用户等级 → 等级徽章图片的映射。
 */

// ---------------------------------------------------------------------------
// 成就徽章 code → 基础图片名映射
// 同一张图可能映射到多个 code（不同 tier），通过 CSS 光环区分等级
// ---------------------------------------------------------------------------

/** 有 PNG 文件的徽章 */
const BADGE_PNG_IMAGES: Record<string, string> = {
  // 全勤王 → 连续登录系列
  STREAK_7: 'perfect-attendance',
  STREAK_30: 'perfect-attendance',
  STREAK_100: 'perfect-attendance',

  // 热心助人 → 回答/帮助系列
  HELPFUL: 'helpful',
  EXPERT: 'helpful',
  HELPFUL_EXPERT: 'helpful',

  // 社交达人 → 社区互动系列
  SOCIAL_STAR: 'social-star',
  FIRST_COMMENT: 'social-star',

  // 提问达人
  QUESTIONER: 'question-master',

  // 工具达人 → AI 工具系列
  TOOL_EXPLORER: 'tool-master',
  TOOL_HUNTER: 'tool-master',
  CASE_WRITER: 'tool-master',

  // 笔记达人
  NOTE_MASTER: 'note-master',
};

/** 仅有 SVG fallback 的徽章（无 PNG 文件） */
const BADGE_SVG_ONLY: Record<string, string> = {
  // 学习类
  FIRST_LESSON: 'first-lesson',
  LESSON_10: 'lesson-10',
  LESSON_50: 'lesson-50',
  COURSE_COMPLETE: 'course-complete',
  ALL_COURSES: 'all-courses',
  // Workshop 类
  FIRST_CHECKIN: 'first-checkin',
  CHECKIN_5: 'checkin-5',
  CHECKIN_ALL: 'checkin-all',
  FIRST_SUBMISSION: 'first-submission',
  SUBMISSION_TOP3: 'submission-top3',
  INSTRUCTOR: 'instructor',
  // 社区类
  NOTE_TAKER: 'note-taker',
  // 积分类
  POINTS_500: 'points-500',
  POINTS_2000: 'points-2000',
  POINTS_5000: 'points-5000',
};

// ---------------------------------------------------------------------------
// 等级徽章映射
// ---------------------------------------------------------------------------

export const LEVEL_IMAGES: Record<number, { sm: string; md: string; lg: string }> = {
  1: {
    sm: '/badges/levels/ai-observer-64.png',
    md: '/badges/levels/ai-observer-128.png',
    lg: '/badges/levels/ai-observer-256.png',
  },
  2: {
    sm: '/badges/levels/ai-practitioner-64.png',
    md: '/badges/levels/ai-practitioner-128.png',
    lg: '/badges/levels/ai-practitioner-256.png',
  },
  3: {
    sm: '/badges/levels/ai-navigator-64.png',
    md: '/badges/levels/ai-navigator-128.png',
    lg: '/badges/levels/ai-navigator-256.png',
  },
};

// ---------------------------------------------------------------------------
// 公共 API
// ---------------------------------------------------------------------------

/**
 * 获取徽章图片路径
 * @param code 徽章 code（如 'STREAK_7'）
 * @param size 图片尺寸 64 | 128
 * @returns 图片路径，无匹配时返回 null
 */
export function getBadgeImage(code: string, size: 64 | 128 = 64): string | null {
  const baseName = BADGE_PNG_IMAGES[code];
  if (!baseName) return null;
  return `/badges/achievements/${baseName}-${size}.png`;
}

/**
 * 获取徽章的 base name（用于 SVG fallback 查找）
 * @param code 徽章 code（如 'FIRST_LESSON'）
 * @returns base name（如 'first-lesson'），无匹配时返回 null
 */
export function getBadgeBaseName(code: string): string | null {
  return BADGE_PNG_IMAGES[code] ?? BADGE_SVG_ONLY[code] ?? null;
}

/**
 * 获取等级徽章图片路径
 * @param level 用户等级 1-3
 * @param size 'sm' (64px) | 'md' (128px) | 'lg' (256px)
 */
export function getLevelImage(level: number, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const images = LEVEL_IMAGES[level] ?? LEVEL_IMAGES[1]!;
  return images[size];
}

/**
 * 获取徽章等级对应的 CSS 光环样式
 * 用于同一张图映射到不同 tier 时的视觉区分
 */
export function getBadgeTierRingStyle(tier: 1 | 2 | 3): {
  ringColor: string;
  glowShadow: string;
  ringWidth: string;
} {
  switch (tier) {
    case 3:
      return {
        ringColor: 'ring-[#FFD700]',
        glowShadow: 'shadow-[0_0_12px_rgba(255,215,0,0.4)]',
        ringWidth: 'ring-[2.5px]',
      };
    case 2:
      return {
        ringColor: 'ring-[#C0C0C0]',
        glowShadow: 'shadow-[0_0_8px_rgba(192,192,192,0.3)]',
        ringWidth: 'ring-2',
      };
    default:
      return {
        ringColor: 'ring-[#CD7F32]',
        glowShadow: '',
        ringWidth: 'ring-[1.5px]',
      };
  }
}
