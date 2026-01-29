/**
 * 积分系统配置
 * 
 * 定义所有积分规则、每日上限和防刷机制
 */

/**
 * 积分行为类型
 */
export type PointActionType =
  // 基础参与
  | 'PROFILE_COMPLETE'
  | 'DAILY_LOGIN'
  | 'WEEKLY_STREAK'
  | 'MONTHLY_STREAK'
  | 'INVITE_USER'
  // Workshop
  | 'WORKSHOP_CHECKIN'
  | 'WORKSHOP_SUBMISSION'
  | 'WORKSHOP_PREVIEW'
  | 'WORKSHOP_REALTIME'
  | 'WORKSHOP_REVIEW'
  | 'WORKSHOP_ITERATION'
  | 'WORKSHOP_TOP3'
  | 'WORKSHOP_INSTRUCTOR'
  | 'WORKSHOP_FEEDBACK'
  | 'WORKSHOP_FEEDBACK_QUALITY'
  // 录播课
  | 'LESSON_MARK_COMPLETE'
  | 'COURSE_REVIEW'
  | 'COURSE_QUESTION'
  | 'COURSE_ANSWER'
  | 'COURSE_FEATURED'
  | 'COURSE_NOTE'
  | 'COURSE_MARATHON'
  | 'COURSE_50_PERCENT'
  | 'COURSE_100_PERCENT'
  // AI 体验台
  | 'TOOL_EXPERIENCE'
  | 'TOOL_RATING'
  | 'TOOL_CASE'
  | 'TOOL_COMPARISON'
  | 'TOOL_REVIEW'
  // 社区互动
  | 'ARTICLE_READ'
  | 'ARTICLE_READ_MONTHLY'
  | 'DISCUSSION_POST'
  | 'DISCUSSION_LEAD'
  | 'COMMENT';

/**
 * 积分规则配置
 */
export const POINT_RULES: Record<PointActionType, number> = {
  // 基础参与
  PROFILE_COMPLETE: 20,
  DAILY_LOGIN: 5,
  WEEKLY_STREAK: 50,
  MONTHLY_STREAK: 200,
  INVITE_USER: 80,

  // Workshop
  WORKSHOP_CHECKIN: 50,
  WORKSHOP_SUBMISSION: 200,
  WORKSHOP_PREVIEW: 30,
  WORKSHOP_REALTIME: 10,
  WORKSHOP_REVIEW: 50,
  WORKSHOP_ITERATION: 100,
  WORKSHOP_TOP3: 80,
  WORKSHOP_INSTRUCTOR: 400,
  WORKSHOP_FEEDBACK: 10,
  WORKSHOP_FEEDBACK_QUALITY: 30,

  // 录播课（飞书跳转模式）
  LESSON_MARK_COMPLETE: 50,
  COURSE_REVIEW: 50,
  COURSE_QUESTION: 15,
  COURSE_ANSWER: 30,
  COURSE_FEATURED: 80,
  COURSE_NOTE: 80,
  COURSE_MARATHON: 100,
  COURSE_50_PERCENT: 100,
  COURSE_100_PERCENT: 300,

  // AI 体验台
  TOOL_EXPERIENCE: 30,
  TOOL_RATING: 5,
  TOOL_CASE: 120,
  TOOL_COMPARISON: 100,
  TOOL_REVIEW: 150,

  // 社区互动
  ARTICLE_READ: 5,
  ARTICLE_READ_MONTHLY: 10,
  DISCUSSION_POST: 50,
  DISCUSSION_LEAD: 100,
  COMMENT: 5,
} as const;

/**
 * 每日积分上限
 */
export const DAILY_POINT_LIMIT = 300;

/**
 * 行为每日次数限制
 */
export const DAILY_LIMITS: Partial<Record<PointActionType, number>> = {
  DAILY_LOGIN: 1,
  ARTICLE_READ: 5,
  COMMENT: 20,
  COURSE_QUESTION: 10,
  WORKSHOP_REALTIME: 5,
  TOOL_RATING: 10,
  COURSE_MARATHON: 1,
} as const;

/**
 * 防刷规则配置
 */
export const ANTI_FRAUD_RULES = {
  // 时间限制
  MIN_READING_TIME: 120,        // 阅读最少停留2分钟（秒）
  MIN_COMMENT_LENGTH: 20,       // 评论/提问最少20字
  MIN_REVIEW_LENGTH: 50,        // 感想最少50字

  // 频率限制
  DAILY_POINT_LIMIT: 300,       // 每日积分上限
  DAILY_ARTICLE_READ_LIMIT: 5,  // 每日阅读上限
  DAILY_COMMENT_LIMIT: 20,      // 每日评论上限
  DAILY_QUESTION_LIMIT: 10,     // 每日提问上限

  // 内容审核
  REQUIRE_SCREENSHOT: true,     // AI工具体验需截图
  REQUIRE_FORM_FILL: true,      // 体验需填写表单
  SUBMISSION_REVIEW: true,      // 作品提交需审核

  // 异常检测
  RAPID_ACTION_THRESHOLD: 10,   // 短时间（1分钟）重复操作阈值
  DUPLICATE_CONTENT_CHECK: true, // 重复内容检测
} as const;

/**
 * 用户等级配置
 */
export const USER_LEVELS = [
  { level: 1, name: '观察员', minPoints: 0, maxPoints: 99 },
  { level: 2, name: '学习者', minPoints: 100, maxPoints: 499 },
  { level: 3, name: '实践家', minPoints: 500, maxPoints: 1999 },
  { level: 4, name: 'AI 领航员', minPoints: 2000, maxPoints: Infinity },
] as const;

/**
 * 根据积分获取用户等级
 */
export function getUserLevel(points: number): typeof USER_LEVELS[number] {
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    const level = USER_LEVELS[i];
    if (level && points >= level.minPoints) {
      return level;
    }
  }
  return USER_LEVELS[0]!;
}

/**
 * 获取下一等级所需积分
 */
export function getPointsToNextLevel(points: number): number | null {
  const currentLevel = getUserLevel(points);
  const nextLevel = USER_LEVELS.find(l => l.level === currentLevel.level + 1);
  if (!nextLevel) return null;
  return nextLevel.minPoints - points;
}

/**
 * 勋章类别
 */
export const BADGE_CATEGORIES = {
  learning: '学习勋章',
  workshop: 'Workshop 勋章',
  community: '社区勋章',
  achievement: '成就勋章',
} as const;

/**
 * 勋章等级
 */
export const BADGE_TIERS = {
  1: { name: '铜', color: '#CD7F32' },
  2: { name: '银', color: '#C0C0C0' },
  3: { name: '金', color: '#FFD700' },
} as const;
