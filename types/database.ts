export type UserRole = 'user' | 'admin';

export type QuestionType = 'single' | 'multiple' | 'boolean';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface Workshop {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  event_date: string;
  is_active: boolean;
  feishu_url: string | null;
  created_at: string;
}

export interface WorkshopCheckin {
  id: string;
  user_id: string;
  workshop_id: string;
  image_url: string;
  created_at: string;
  user?: User;
  workshop?: Workshop;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
  chapters?: Chapter[];
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  content: string;
  feishu_url: string | null;
  order_index: number;
  created_at: string;
  questions?: Question[];
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  lesson_id: string;
  type: QuestionType;
  question_text: string;
  options: QuestionOption[];
  correct_answer: string | string[]; // single answer for single/boolean, array for multiple
  explanation?: string;
  order_index: number;
  created_at: string;
}

export interface UserAnswer {
  id: string;
  user_id: string;
  question_id: string;
  answer: string | string[];
  is_correct: boolean;
  created_at: string;
}

/**
 * 用户课时学习进度
 * 对应 user_lesson_progress 表
 */
export interface UserLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  is_completed: boolean;
  last_position: number;
  time_spent: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // 关联
  user?: User;
  lesson?: Lesson;
  course?: Course;
}

// Database response types with relations
export interface CourseWithChapters extends Course {
  chapters: ChapterWithLessons[];
}

export interface ChapterWithLessons extends Chapter {
  lessons: Lesson[];
}

export interface LessonWithQuestions extends Lesson {
  questions: Question[];
}

// AI Question Generation types
export interface AIGenerateQuestionsRequest {
  lessonId: string;
  questionTypes: QuestionType[];
  count: number;
}

export interface AIGeneratedQuestion {
  type: QuestionType;
  question_text: string;
  options: QuestionOption[];
  correct_answer: string | string[];
  explanation: string;
}

export interface AIGenerateQuestionsResponse {
  success: boolean;
  questions?: Question[];
  generatedCount?: number;
  error?: string;
}

// ==================== 积分系统类型 ====================

/**
 * 积分规则
 */
export interface PointRule {
  id: string;
  action_type: string;
  points: number;
  daily_limit: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 用户积分余额
 */
export interface UserPointBalance {
  user_id: string;
  total_points: number;
  available_points: number;
  spent_points: number;
  level: number;
  created_at: string;
  updated_at: string;
}

/**
 * 积分流水记录
 */
export interface PointTransaction {
  id: string;
  user_id: string;
  points: number;
  action_type: string;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  created_at: string;
}

/**
 * 用户连续登录记录
 */
export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_login_date: string | null;
  streak_start_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 勋章定义
 */
export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  category: string;
  tier: number;
  points_reward: number;
  requirement_type: string | null;
  requirement_value: number | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

/**
 * 用户勋章
 */
export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
  badge?: Badge;
}

/**
 * 成就定义
 */
export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  category: string;
  max_progress: number;
  points_reward: number;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

/**
 * 用户成就进度
 */
export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  current_progress: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  achievement?: Achievement;
}

/**
 * 排行榜条目
 */
export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  total_points: number;
  level: number;
  current_streak: number;
  badge_count: number;
  rank: number;
}

// ==================== AI 体验台类型 ====================

/**
 * AI 工具分类
 */
export interface ToolCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

/**
 * AI 工具定价类型
 */
export type PricingType = 'free' | 'freemium' | 'paid';

/**
 * AI 工具
 */
export interface AITool {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  logo_url: string | null;
  website_url: string | null;
  pricing_type: PricingType;
  pricing_details: string | null;
  avg_rating: number;
  rating_count: number;
  experience_count: number;
  case_count: number;
  is_featured: boolean;
  is_active: boolean;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  category?: ToolCategory;
}

/**
 * 工具评分
 */
export interface ToolRating {
  user_id: string;
  tool_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

/**
 * 灵感碎片/使用心得
 */
export interface ToolExperience {
  id: string;
  user_id: string;
  tool_id: string;
  use_case: string;
  pros: string | null;
  cons: string | null;
  screenshot_url: string;
  like_count: number;
  is_featured: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user?: User;
  tool?: AITool;
}

/**
 * 应用案例
 */
export interface ToolCase {
  id: string;
  user_id: string;
  tool_id: string;
  title: string;
  problem_background: string;
  solution: string;
  result: string | null;
  images: string[] | null;
  tags: string[] | null;
  like_count: number;
  bookmark_count: number;
  view_count: number;
  is_featured: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'featured';
  created_at: string;
  updated_at: string;
  user?: User;
  tool?: AITool;
}

/**
 * 工具对比
 */
export interface ToolComparison {
  id: string;
  user_id: string;
  title: string;
  tool_ids: string[];
  comparison_content: Record<string, unknown>;
  conclusion: string | null;
  like_count: number;
  view_count: number;
  is_featured: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'featured';
  created_at: string;
  user?: User;
  tools?: AITool[];
}

/**
 * 用户收藏
 */
export interface UserBookmark {
  user_id: string;
  target_type: 'tool' | 'case' | 'comparison';
  target_id: string;
  created_at: string;
}

/**
 * 每周推荐
 */
export interface WeeklyPick {
  id: string;
  tool_id: string;
  week_start: string;
  reason: string | null;
  picked_by: string | null;
  vote_count: number;
  created_at: string;
  tool?: AITool;
}

// ==================== 社区功能类型 ====================

/**
 * 讨论话题
 */
export interface Discussion {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[] | null;
  participant_count: number;
  comment_count: number;
  like_count: number;
  view_count: number;
  is_pinned: boolean;
  is_featured: boolean;
  status: 'active' | 'closed' | 'deleted';
  created_at: string;
  updated_at: string;
  user?: User;
}

/**
 * 邀请记录
 */
export interface UserInvitation {
  id: string;
  inviter_id: string;
  invitee_id: string | null;
  invite_code: string;
  status: 'pending' | 'registered' | 'completed';
  reward_claimed: boolean;
  created_at: string;
  registered_at: string | null;
  completed_at: string | null;
  inviter?: User;
  invitee?: User;
}

/**
 * 兑换商品
 */
export interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  points_cost: number;
  stock: number;
  max_per_user: number;
  is_active: boolean;
  is_featured: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * 兑换订单状态
 */
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';

/**
 * 兑换订单
 */
export interface RewardOrder {
  id: string;
  user_id: string;
  item_id: string;
  points_spent: number;
  quantity: number;
  status: OrderStatus;
  shipping_info: {
    name?: string;
    phone?: string;
    address?: string;
  } | null;
  notes: string | null;
  processed_at: string | null;
  completed_at: string | null;
  created_at: string;
  item?: RewardItem;
}

/**
 * 证书类型
 */
export type CertificateType = 'ai_navigator' | 'completion' | 'achievement';

/**
 * 证书记录
 */
export interface Certificate {
  id: string;
  user_id: string;
  type: CertificateType;
  certificate_number: string;
  title: string;
  issued_at: string;
  metadata: Record<string, unknown> | null;
}
