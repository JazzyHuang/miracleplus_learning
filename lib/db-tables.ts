// =============================================================
// Database Table Names & RPC Function Names
// All Supabase .from() and .rpc() calls MUST use these constants
// to ensure correct prefixed table/function names in shared DB.
//
// Table prefix: miracle_learning_20260209_
// Function prefix: ml_
// =============================================================

const TABLE_PREFIX = 'miracle_learning_20260209_' as const;

/**
 * Database table name constants.
 * Usage: supabase.from(DB.users).select(...)
 */
export const DB = {
  // Core user & auth
  users: `${TABLE_PREFIX}users`,

  // Courses
  courses: `${TABLE_PREFIX}courses`,
  chapters: `${TABLE_PREFIX}chapters`,
  lessons: `${TABLE_PREFIX}lessons`,
  questions: `${TABLE_PREFIX}questions`,
  user_answers: `${TABLE_PREFIX}user_answers`,
  user_lesson_progress: `${TABLE_PREFIX}user_lesson_progress`,
  course_reviews: `${TABLE_PREFIX}course_reviews`,
  course_notes: `${TABLE_PREFIX}course_notes`,
  note_bookmarks: `${TABLE_PREFIX}note_bookmarks`,
  qa_questions: `${TABLE_PREFIX}qa_questions`,
  qa_answers: `${TABLE_PREFIX}qa_answers`,
  course_milestones: `${TABLE_PREFIX}course_milestones`,
  course_easter_eggs: `${TABLE_PREFIX}course_easter_eggs`,
  user_easter_egg_finds: `${TABLE_PREFIX}user_easter_egg_finds`,

  // Workshops
  workshops: `${TABLE_PREFIX}workshops`,
  workshop_checkins: `${TABLE_PREFIX}workshop_checkins`,
  workshop_submissions: `${TABLE_PREFIX}workshop_submissions`,
  workshop_materials: `${TABLE_PREFIX}workshop_materials`,
  workshop_feedback: `${TABLE_PREFIX}workshop_feedback`,
  user_material_progress: `${TABLE_PREFIX}user_material_progress`,
  instructor_applications: `${TABLE_PREFIX}instructor_applications`,

  // Gamification & Points
  point_rules: `${TABLE_PREFIX}point_rules`,
  user_point_balance: `${TABLE_PREFIX}user_point_balance`,
  point_transactions: `${TABLE_PREFIX}point_transactions`,
  user_streaks: `${TABLE_PREFIX}user_streaks`,
  badges: `${TABLE_PREFIX}badges`,
  user_badges: `${TABLE_PREFIX}user_badges`,
  achievements: `${TABLE_PREFIX}achievements`,
  user_achievements: `${TABLE_PREFIX}user_achievements`,

  // AI Tools
  tool_categories: `${TABLE_PREFIX}tool_categories`,
  ai_tools: `${TABLE_PREFIX}ai_tools`,
  tool_ratings: `${TABLE_PREFIX}tool_ratings`,
  tool_experiences: `${TABLE_PREFIX}tool_experiences`,
  tool_cases: `${TABLE_PREFIX}tool_cases`,
  tool_comparisons: `${TABLE_PREFIX}tool_comparisons`,
  user_bookmarks: `${TABLE_PREFIX}user_bookmarks`,
  weekly_picks: `${TABLE_PREFIX}weekly_picks`,

  // Community
  discussions: `${TABLE_PREFIX}discussions`,
  discussion_participants: `${TABLE_PREFIX}discussion_participants`,
  comments: `${TABLE_PREFIX}comments`,
  likes: `${TABLE_PREFIX}likes`,
  user_invitations: `${TABLE_PREFIX}user_invitations`,

  // Rewards & Certificates
  reward_items: `${TABLE_PREFIX}reward_items`,
  reward_orders: `${TABLE_PREFIX}reward_orders`,
  certificates: `${TABLE_PREFIX}certificates`,

  // Articles
  articles: `${TABLE_PREFIX}articles`,
  article_reads: `${TABLE_PREFIX}article_reads`,

  // Study Groups
  study_groups: `${TABLE_PREFIX}study_groups`,
  study_group_members: `${TABLE_PREFIX}study_group_members`,

  // Admin & Audit
  admin_audit_logs: `${TABLE_PREFIX}admin_audit_logs`,

  // Rate Limiting
  rate_limit_entries: `${TABLE_PREFIX}rate_limit_entries`,

  // User Settings
  user_settings: `${TABLE_PREFIX}user_settings`,

  // Daily Quests
  daily_quests: `${TABLE_PREFIX}daily_quests`,

  // Notifications
  notifications: `${TABLE_PREFIX}notifications`,

  // Spaced Repetition
  review_schedule: `${TABLE_PREFIX}review_schedule`,

  // Views
  leaderboard_view: 'ml_leaderboard_view',

  // Analytics Views
  analytics_daily_activity: 'ml_analytics_daily_activity',
  analytics_cohort_retention: 'ml_analytics_cohort_retention',
  analytics_user_engagement: 'ml_analytics_user_engagement',
} as const;

/**
 * RPC function name constants.
 * Usage: supabase.rpc(RPC.add_user_points, { ... })
 */
export const RPC = {
  // Points & Gamification
  add_user_points: 'ml_add_user_points',
  update_user_streak: 'ml_update_user_streak',
  refresh_leaderboard: 'ml_refresh_leaderboard',
  get_today_points_sum: 'ml_get_today_points_sum',
  calculate_user_level: 'ml_calculate_user_level',

  // Course
  mark_lesson_complete: 'ml_mark_lesson_complete',
  upsert_lesson_time_spent: 'ml_upsert_lesson_time_spent',
  get_user_course_progress: 'ml_get_user_course_progress',
  submit_course_review: 'ml_submit_course_review',

  // Q&A
  accept_answer: 'ml_accept_answer',
  submit_question_with_bounty: 'ml_submit_question_with_bounty',
  submit_answer: 'ml_submit_answer',

  // Community
  increment_discussion_view_count: 'ml_increment_discussion_view_count',
  generate_invite_code: 'ml_generate_invite_code',
  check_email_exists: 'ml_check_email_exists',

  // Auth helpers
  is_admin: 'ml_is_admin',

  // Admin & Audit
  log_admin_action: 'ml_log_admin_action',

  // Rate Limiting
  check_rate_limit: 'ml_check_rate_limit',

  // Stats
  get_workshop_progress: 'ml_get_workshop_progress',
  get_course_completion_count: 'ml_get_course_completion_count',
  get_user_portfolio_stats: 'ml_get_user_portfolio_stats',
  get_weekly_top_gainers: 'ml_get_weekly_top_gainers',
  get_user_dashboard_stats: 'ml_get_user_dashboard_stats',

  // Articles
  increment_article_view_count: 'ml_increment_article_view_count',

  // Tags
  get_popular_tags: 'ml_get_popular_tags',

  // Tool Rating (atomic)
  submit_tool_rating: 'ml_submit_tool_rating',

  // Certificate
  generate_certificate_number: 'ml_generate_certificate_number',

  // Search
  search_content: 'ml_search_content',

  // Performance RPCs (055)
  get_comments_with_replies: 'ml_get_comments_with_replies',
  get_leaderboard_fallback: 'ml_get_leaderboard_fallback',
  get_last_learned_lesson: 'ml_get_last_learned_lesson',

  // Atomic purchase RPCs (056)
  purchase_streak_freeze: 'ml_purchase_streak_freeze',

  // Spaced Repetition
  get_due_review_count: 'ml_get_due_review_count',

  // Audit
  cleanup_old_audit_logs: 'ml_cleanup_old_audit_logs',

  // Analytics
  analytics_overview: 'ml_analytics_overview',
  analytics_activity_trends: 'ml_analytics_activity_trends',
  analytics_learning_funnel: 'ml_analytics_learning_funnel',
  analytics_user_segments: 'ml_analytics_user_segments',
  analytics_content_stats: 'ml_analytics_content_stats',
  analytics_user_detail: 'ml_analytics_user_detail',
  analytics_engagement_distribution: 'ml_analytics_engagement_distribution',
  analytics_action_breakdown: 'ml_analytics_action_breakdown',
} as const;

/**
 * Storage bucket name constant.
 */
export const STORAGE_BUCKET = 'ml_images' as const;
