/**
 * 用户行为分析系统 - 类型定义
 */

export interface AnalyticsOverview {
  totalUsers: number;
  newUsersPeriod: number;
  newUsersPrev: number;
  dauAvg: number;
  dauAvgPrev: number;
  wau: number;
  mau: number;
  lessonsCompletedPeriod: number;
  lessonsCompletedPrev: number;
  avgTimeSpent: number;
  workshopParticipants: number;
  communityPosts: number;
  avgEngagementScore: number;
  levelDistribution: Array<{ level: number; count: number }>;
  dailyTrend: Array<{ date: string; dau: number; new_users: number }>;
}

export interface DailyActivity {
  activity_date: string;
  dau: number;
  total_actions: number;
  learning_users: number;
  workshop_users: number;
  community_users: number;
  ai_tool_users: number;
  new_users: number;
}

export interface CohortRetentionRow {
  cohort_month: string;
  month_offset: number;
  retained_users: number;
  cohort_size: number;
}

export interface LearningFunnel {
  steps: Array<{ name: string; count: number }>;
}

export interface UserSegment {
  segment: string;
  user_count: number;
  avg_engagement_score: number;
}

export interface ContentStats {
  course_id: string;
  course_title: string;
  total_lessons: number;
  total_enrollments: number;
  total_completions: number;
  completion_rate: number;
  avg_time_per_lesson: number;
  total_questions: number;
  total_reviews: number;
}

export interface UserEngagement {
  user_id: string;
  name: string;
  email: string;
  engagement_score: number;
  segment: string;
  active_days_30d: number;
  actions_30d: number;
  categories_engaged: number;
  lessons_completed: number;
  days_since_last_active: number;
}

export interface UserDetail {
  user: { id: string; name: string; email: string; avatar_url: string; level: number; total_points: number };
  engagement: { score: number; segment: string; active_days_30d: number; categories_engaged: number } | null;
  streak: { current: number; longest: number; last_login: string | null } | null;
  learning: { lessons_completed: number; courses_started: number; courses_completed: number; avg_quiz_score: number; total_time_spent: number };
  community: { discussions: number; comments: number; likes_received: number };
  recent_actions: Array<{ action_type: string; description: string | null; created_at: string; points: number }>;
}

export interface ActionBreakdown {
  action_type: string;
  count: number;
  unique_users: number;
}

export interface EngagementDistribution {
  range: string;
  count: number;
}
