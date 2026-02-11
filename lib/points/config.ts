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
  | 'WORKSHOP_INTERACTION'   // 现场互动(投票/问答)
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
  | 'COURSE_REFLECTION'     // 发表课程感想
  | 'QUIZ_PERFECT'          // 知识闯关全对
  | 'EASTER_EGG_FOUND'      // 找到知识彩蛋
  | 'NOTE_UPLOAD'           // 上传学习笔记
  | 'FEATURED_REPLY'        // 精选回复
  | 'QUALITY_COMMENT'       // 优质评论
  // AI 体验台
  | 'TOOL_EXPERIENCE'
  | 'TOOL_RATING'
  | 'TOOL_CASE'
  | 'TOOL_COMPARISON'
  | 'TOOL_REVIEW'
  | 'TOOL_SHARE'            // 基础AI工具分享
  // 社区互动
  | 'ARTICLE_READ'
  | 'ARTICLE_READ_MONTHLY'
  | 'DISCUSSION_POST'
  | 'DISCUSSION_LEAD'
  | 'COMMENT'
  | 'TOPIC_LEADER'          // 引领话题讨论(>10人参与)
  // 系统类型
  | 'BADGE_REWARD'
  | 'SPEND'
  | 'CREATE_DISCUSSION'
  | 'INVITE_COMPLETE'
  | 'POPULAR_DISCUSSION'
  | 'STREAK_100';

/**
 * 积分规则配置
 */
export const POINT_RULES: Record<PointActionType, number> = {
  // 基础参与
  PROFILE_COMPLETE: 20,    // 完善个人资料（一次性）
  DAILY_LOGIN: 5,
  WEEKLY_STREAK: 50,       // 连续登录7天
  MONTHLY_STREAK: 200,     // 连续登录30天
  INVITE_USER: 80,         // 邀请新人注册并完成首次学习

  // Workshop
  WORKSHOP_CHECKIN: 50,        // Workshop签到
  WORKSHOP_SUBMISSION: 200,    // 作品提交
  WORKSHOP_PREVIEW: 30,        // 完成预习任务
  WORKSHOP_REALTIME: 10,       // 现场互动(投票/问答) - 旧名保留兼容
  WORKSHOP_REVIEW: 50,         // 课后复盘提交
  WORKSHOP_ITERATION: 100,     // 作品迭代
  WORKSHOP_TOP3: 80,           // 作品获赞TOP3
  WORKSHOP_INSTRUCTOR: 400,    // 担任Workshop讲师
  WORKSHOP_FEEDBACK: 10,       // 课程反馈问卷
  WORKSHOP_FEEDBACK_QUALITY: 30, // 优质迭代意见
  WORKSHOP_INTERACTION: 10,    // 现场互动(投票/问答)

  // 录播课
  LESSON_MARK_COMPLETE: 50,    // 完成一期课程
  COURSE_REVIEW: 50,           // 发表课程感想（旧名保留兼容）
  COURSE_QUESTION: 15,         // 课程提问
  COURSE_ANSWER: 30,           // 回答问题
  COURSE_FEATURED: 80,         // 精选回复（旧名保留兼容）
  COURSE_NOTE: 80,             // 上传学习笔记（旧名保留兼容）
  COURSE_MARATHON: 100,        // 学习马拉松（1天完成3节）
  COURSE_50_PERCENT: 100,      // 完成50%课程
  COURSE_100_PERCENT: 300,     // 完成100%课程
  COURSE_REFLECTION: 50,       // 发表课程感想
  QUIZ_PERFECT: 20,            // 知识闯关全对
  EASTER_EGG_FOUND: 30,        // 找到知识彩蛋
  NOTE_UPLOAD: 80,             // 上传学习笔记
  FEATURED_REPLY: 80,          // 精选回复
  QUALITY_COMMENT: 20,         // 优质评论

  // AI 体验台
  TOOL_EXPERIENCE: 30,         // 灵感碎片(使用心得)
  TOOL_RATING: 5,              // 工具评分
  TOOL_CASE: 100,              // 应用案例分享（运营计划: 100分）
  TOOL_COMPARISON: 120,        // 工具对比
  TOOL_REVIEW: 150,            // 深度评测
  TOOL_SHARE: 80,              // 基础AI工具分享

  // 社区互动
  ARTICLE_READ: 5,             // 日报阅读
  ARTICLE_READ_MONTHLY: 10,    // 月报阅读
  DISCUSSION_POST: 50,         // 分享优质学习内容
  DISCUSSION_LEAD: 100,        // 引领话题讨论
  COMMENT: 5,                  // 评论互动(>20字)
  TOPIC_LEADER: 100,           // 引领话题讨论(>10人参与)

  // 系统类型
  BADGE_REWARD: 0,
  SPEND: 0,
  CREATE_DISCUSSION: 20,
  INVITE_COMPLETE: 80,
  POPULAR_DISCUSSION: 50,
  STREAK_100: 500,
} as const;

/**
 * 每日积分上限
 */
export const DAILY_POINT_LIMIT = 300;

/**
 * 用户等级配置
 */
/**
 * 用户等级配置
 * 
 * 运营计划等级体系:
 * - AI观察员: 0-299分 (基础学习权限)
 * - AI实践家: 300-799分 (解锁学习小组, 优先参与新课程内测)
 * - AI领航员: 800+分 (颁发证书, 成为AI助教, 专属领航员社群)
 */
export const USER_LEVELS = [
  { level: 1, name: 'AI 观察员', minPoints: 0, maxPoints: 299 },
  { level: 2, name: 'AI 实践家', minPoints: 300, maxPoints: 799 },
  { level: 3, name: 'AI 领航员', minPoints: 800, maxPoints: Infinity },
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
  // USER_LEVELS 至少有一个元素，这里使用类型断言是安全的
  return USER_LEVELS[0] as typeof USER_LEVELS[number];
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
