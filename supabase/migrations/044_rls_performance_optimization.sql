-- Migration 044: RLS Performance Optimization
-- Replaces auth.uid() with (select auth.uid()) in all RLS policies
-- Supabase official benchmark: 20-14833x speedup on large tables
-- Also adds missing composite indexes for query performance

-- ============================================================
-- Helper: Reusable auth check (evaluated once per query)
-- ============================================================

-- ============================================================
-- 1. USERS table policies
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own profile" ON miracle_learning_20260209_users;
CREATE POLICY "[ML] Users can view own profile"
  ON miracle_learning_20260209_users FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can update own profile" ON miracle_learning_20260209_users;
CREATE POLICY "[ML] Users can update own profile"
  ON miracle_learning_20260209_users FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Public profiles are viewable" ON miracle_learning_20260209_users;
CREATE POLICY "[ML] Public profiles are viewable"
  ON miracle_learning_20260209_users FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Admins can view all users" ON miracle_learning_20260209_users;
CREATE POLICY "[ML] Admins can view all users"
  ON miracle_learning_20260209_users FOR SELECT TO authenticated
  USING ((select ml_is_admin()));

DROP POLICY IF EXISTS "[ML] Admins can update all users" ON miracle_learning_20260209_users;
CREATE POLICY "[ML] Admins can update all users"
  ON miracle_learning_20260209_users FOR UPDATE TO authenticated
  USING ((select ml_is_admin()))
  WITH CHECK ((select ml_is_admin()));

-- ============================================================
-- 2. USER_LESSON_PROGRESS (highest frequency - every lesson page)
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own progress" ON miracle_learning_20260209_user_lesson_progress;
CREATE POLICY "[ML] Users can view own progress"
  ON miracle_learning_20260209_user_lesson_progress FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own progress" ON miracle_learning_20260209_user_lesson_progress;
CREATE POLICY "[ML] Users can insert own progress"
  ON miracle_learning_20260209_user_lesson_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can update own progress" ON miracle_learning_20260209_user_lesson_progress;
CREATE POLICY "[ML] Users can update own progress"
  ON miracle_learning_20260209_user_lesson_progress FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 3. USER_POINT_BALANCE / USER_STREAKS (Dashboard)
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own point balance" ON miracle_learning_20260209_user_point_balance;
CREATE POLICY "[ML] Users can view own point balance"
  ON miracle_learning_20260209_user_point_balance FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can view own streaks" ON miracle_learning_20260209_user_streaks;
CREATE POLICY "[ML] Users can view own streaks"
  ON miracle_learning_20260209_user_streaks FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 4. POINT_TRANSACTIONS (Profile page)
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own transactions" ON miracle_learning_20260209_point_transactions;
CREATE POLICY "[ML] Users can view own transactions"
  ON miracle_learning_20260209_point_transactions FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 5. USER_BADGES (Profile/Badges page)
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own badges" ON miracle_learning_20260209_user_badges;
CREATE POLICY "[ML] Users can view own badges"
  ON miracle_learning_20260209_user_badges FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own badges" ON miracle_learning_20260209_user_badges;
CREATE POLICY "[ML] Users can insert own badges"
  ON miracle_learning_20260209_user_badges FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 6. LIKES (Discussion/detail pages)
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view likes" ON miracle_learning_20260209_likes;
CREATE POLICY "[ML] Users can view likes"
  ON miracle_learning_20260209_likes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Users can insert own likes" ON miracle_learning_20260209_likes;
CREATE POLICY "[ML] Users can insert own likes"
  ON miracle_learning_20260209_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can delete own likes" ON miracle_learning_20260209_likes;
CREATE POLICY "[ML] Users can delete own likes"
  ON miracle_learning_20260209_likes FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 7. COMMENTS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view comments" ON miracle_learning_20260209_comments;
CREATE POLICY "[ML] Users can view comments"
  ON miracle_learning_20260209_comments FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Users can insert own comments" ON miracle_learning_20260209_comments;
CREATE POLICY "[ML] Users can insert own comments"
  ON miracle_learning_20260209_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can update own comments" ON miracle_learning_20260209_comments;
CREATE POLICY "[ML] Users can update own comments"
  ON miracle_learning_20260209_comments FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can soft-delete own comments" ON miracle_learning_20260209_comments;
CREATE POLICY "[ML] Users can soft-delete own comments"
  ON miracle_learning_20260209_comments FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Admins can manage comments" ON miracle_learning_20260209_comments;
CREATE POLICY "[ML] Admins can manage comments"
  ON miracle_learning_20260209_comments FOR ALL TO authenticated
  USING ((select ml_is_admin()));

-- ============================================================
-- 8. WORKSHOP_CHECKINS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view checkins" ON miracle_learning_20260209_workshop_checkins;
CREATE POLICY "[ML] Users can view checkins"
  ON miracle_learning_20260209_workshop_checkins FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Users can insert own checkins" ON miracle_learning_20260209_workshop_checkins;
CREATE POLICY "[ML] Users can insert own checkins"
  ON miracle_learning_20260209_workshop_checkins FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 9. WORKSHOP_SUBMISSIONS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view submissions" ON miracle_learning_20260209_workshop_submissions;
CREATE POLICY "[ML] Users can view submissions"
  ON miracle_learning_20260209_workshop_submissions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Users can insert own submissions" ON miracle_learning_20260209_workshop_submissions;
CREATE POLICY "[ML] Users can insert own submissions"
  ON miracle_learning_20260209_workshop_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can update own submissions" ON miracle_learning_20260209_workshop_submissions;
CREATE POLICY "[ML] Users can update own submissions"
  ON miracle_learning_20260209_workshop_submissions FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Admins can manage submissions" ON miracle_learning_20260209_workshop_submissions;
CREATE POLICY "[ML] Admins can manage submissions"
  ON miracle_learning_20260209_workshop_submissions FOR ALL TO authenticated
  USING ((select ml_is_admin()));

-- ============================================================
-- 10. DISCUSSIONS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Anyone can view active discussions" ON miracle_learning_20260209_discussions;
CREATE POLICY "[ML] Anyone can view active discussions"
  ON miracle_learning_20260209_discussions FOR SELECT TO authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "[ML] Users can insert own discussions" ON miracle_learning_20260209_discussions;
CREATE POLICY "[ML] Users can insert own discussions"
  ON miracle_learning_20260209_discussions FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can update own discussions" ON miracle_learning_20260209_discussions;
CREATE POLICY "[ML] Users can update own discussions"
  ON miracle_learning_20260209_discussions FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Admins can manage discussions" ON miracle_learning_20260209_discussions;
CREATE POLICY "[ML] Admins can manage discussions"
  ON miracle_learning_20260209_discussions FOR ALL TO authenticated
  USING ((select ml_is_admin()));

-- ============================================================
-- 11. DISCUSSION_PARTICIPANTS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view participants" ON miracle_learning_20260209_discussion_participants;
CREATE POLICY "[ML] Users can view participants"
  ON miracle_learning_20260209_discussion_participants FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Users can insert own participation" ON miracle_learning_20260209_discussion_participants;
CREATE POLICY "[ML] Users can insert own participation"
  ON miracle_learning_20260209_discussion_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 12. USER_ANSWERS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own answers" ON miracle_learning_20260209_user_answers;
CREATE POLICY "[ML] Users can view own answers"
  ON miracle_learning_20260209_user_answers FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own answers" ON miracle_learning_20260209_user_answers;
CREATE POLICY "[ML] Users can insert own answers"
  ON miracle_learning_20260209_user_answers FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 13. TOOL_RATINGS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view ratings" ON miracle_learning_20260209_tool_ratings;
CREATE POLICY "[ML] Users can view ratings"
  ON miracle_learning_20260209_tool_ratings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Users can upsert own ratings" ON miracle_learning_20260209_tool_ratings;
CREATE POLICY "[ML] Users can upsert own ratings"
  ON miracle_learning_20260209_tool_ratings FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can update own ratings" ON miracle_learning_20260209_tool_ratings;
CREATE POLICY "[ML] Users can update own ratings"
  ON miracle_learning_20260209_tool_ratings FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 14. TOOL_EXPERIENCES
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view approved experiences" ON miracle_learning_20260209_tool_experiences;
CREATE POLICY "[ML] Users can view approved experiences"
  ON miracle_learning_20260209_tool_experiences FOR SELECT TO authenticated
  USING (status = 'approved' OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own experiences" ON miracle_learning_20260209_tool_experiences;
CREATE POLICY "[ML] Users can insert own experiences"
  ON miracle_learning_20260209_tool_experiences FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Admins can manage experiences" ON miracle_learning_20260209_tool_experiences;
CREATE POLICY "[ML] Admins can manage experiences"
  ON miracle_learning_20260209_tool_experiences FOR ALL TO authenticated
  USING ((select ml_is_admin()));

-- ============================================================
-- 15. TOOL_CASES
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view approved cases" ON miracle_learning_20260209_tool_cases;
CREATE POLICY "[ML] Users can view approved cases"
  ON miracle_learning_20260209_tool_cases FOR SELECT TO authenticated
  USING (status = 'approved' OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own cases" ON miracle_learning_20260209_tool_cases;
CREATE POLICY "[ML] Users can insert own cases"
  ON miracle_learning_20260209_tool_cases FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Admins can manage cases" ON miracle_learning_20260209_tool_cases;
CREATE POLICY "[ML] Admins can manage cases"
  ON miracle_learning_20260209_tool_cases FOR ALL TO authenticated
  USING ((select ml_is_admin()));

-- ============================================================
-- 16. TOOL_COMPARISONS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view comparisons" ON miracle_learning_20260209_tool_comparisons;
CREATE POLICY "[ML] Users can view comparisons"
  ON miracle_learning_20260209_tool_comparisons FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Users can insert own comparisons" ON miracle_learning_20260209_tool_comparisons;
CREATE POLICY "[ML] Users can insert own comparisons"
  ON miracle_learning_20260209_tool_comparisons FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 17. USER_BOOKMARKS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own bookmarks" ON miracle_learning_20260209_user_bookmarks;
CREATE POLICY "[ML] Users can view own bookmarks"
  ON miracle_learning_20260209_user_bookmarks FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own bookmarks" ON miracle_learning_20260209_user_bookmarks;
CREATE POLICY "[ML] Users can insert own bookmarks"
  ON miracle_learning_20260209_user_bookmarks FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can delete own bookmarks" ON miracle_learning_20260209_user_bookmarks;
CREATE POLICY "[ML] Users can delete own bookmarks"
  ON miracle_learning_20260209_user_bookmarks FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 18. USER_INVITATIONS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own invitations" ON miracle_learning_20260209_user_invitations;
CREATE POLICY "[ML] Users can view own invitations"
  ON miracle_learning_20260209_user_invitations FOR SELECT TO authenticated
  USING (inviter_id = (select auth.uid()) OR invitee_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own invitations" ON miracle_learning_20260209_user_invitations;
CREATE POLICY "[ML] Users can insert own invitations"
  ON miracle_learning_20260209_user_invitations FOR INSERT TO authenticated
  WITH CHECK (inviter_id = (select auth.uid()));

-- ============================================================
-- 19. COURSE_NOTES
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own notes" ON miracle_learning_20260209_course_notes;
CREATE POLICY "[ML] Users can view own notes"
  ON miracle_learning_20260209_course_notes FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR is_public = true);

DROP POLICY IF EXISTS "[ML] Users can insert own notes" ON miracle_learning_20260209_course_notes;
CREATE POLICY "[ML] Users can insert own notes"
  ON miracle_learning_20260209_course_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can update own notes" ON miracle_learning_20260209_course_notes;
CREATE POLICY "[ML] Users can update own notes"
  ON miracle_learning_20260209_course_notes FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can delete own notes" ON miracle_learning_20260209_course_notes;
CREATE POLICY "[ML] Users can delete own notes"
  ON miracle_learning_20260209_course_notes FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 20. QA_QUESTIONS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view qa questions" ON miracle_learning_20260209_qa_questions;
CREATE POLICY "[ML] Users can view qa questions"
  ON miracle_learning_20260209_qa_questions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Users can insert own qa questions" ON miracle_learning_20260209_qa_questions;
CREATE POLICY "[ML] Users can insert own qa questions"
  ON miracle_learning_20260209_qa_questions FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can update own qa questions" ON miracle_learning_20260209_qa_questions;
CREATE POLICY "[ML] Users can update own qa questions"
  ON miracle_learning_20260209_qa_questions FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 21. QA_ANSWERS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view qa answers" ON miracle_learning_20260209_qa_answers;
CREATE POLICY "[ML] Users can view qa answers"
  ON miracle_learning_20260209_qa_answers FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Users can insert own qa answers" ON miracle_learning_20260209_qa_answers;
CREATE POLICY "[ML] Users can insert own qa answers"
  ON miracle_learning_20260209_qa_answers FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can update own qa answers" ON miracle_learning_20260209_qa_answers;
CREATE POLICY "[ML] Users can update own qa answers"
  ON miracle_learning_20260209_qa_answers FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 22. COURSE_REVIEWS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view reviews" ON miracle_learning_20260209_course_reviews;
CREATE POLICY "[ML] Users can view reviews"
  ON miracle_learning_20260209_course_reviews FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "[ML] Users can insert own reviews" ON miracle_learning_20260209_course_reviews;
CREATE POLICY "[ML] Users can insert own reviews"
  ON miracle_learning_20260209_course_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 23. USER_ACHIEVEMENTS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own achievements" ON miracle_learning_20260209_user_achievements;
CREATE POLICY "[ML] Users can view own achievements"
  ON miracle_learning_20260209_user_achievements FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 24. INSTRUCTOR_APPLICATIONS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own applications" ON miracle_learning_20260209_instructor_applications;
CREATE POLICY "[ML] Users can view own applications"
  ON miracle_learning_20260209_instructor_applications FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own applications" ON miracle_learning_20260209_instructor_applications;
CREATE POLICY "[ML] Users can insert own applications"
  ON miracle_learning_20260209_instructor_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Admins can manage applications" ON miracle_learning_20260209_instructor_applications;
CREATE POLICY "[ML] Admins can manage applications"
  ON miracle_learning_20260209_instructor_applications FOR ALL TO authenticated
  USING ((select ml_is_admin()));

-- ============================================================
-- 25. REWARD_ORDERS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own orders" ON miracle_learning_20260209_reward_orders;
CREATE POLICY "[ML] Users can view own orders"
  ON miracle_learning_20260209_reward_orders FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own orders" ON miracle_learning_20260209_reward_orders;
CREATE POLICY "[ML] Users can insert own orders"
  ON miracle_learning_20260209_reward_orders FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Admins can manage orders" ON miracle_learning_20260209_reward_orders;
CREATE POLICY "[ML] Admins can manage orders"
  ON miracle_learning_20260209_reward_orders FOR ALL TO authenticated
  USING ((select ml_is_admin()));

-- ============================================================
-- 26. CERTIFICATES
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own certificates" ON miracle_learning_20260209_certificates;
CREATE POLICY "[ML] Users can view own certificates"
  ON miracle_learning_20260209_certificates FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================
-- 27. USER_SETTINGS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own settings" ON miracle_learning_20260209_user_settings;
CREATE POLICY "[ML] Users can view own settings"
  ON miracle_learning_20260209_user_settings FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own settings" ON miracle_learning_20260209_user_settings;
CREATE POLICY "[ML] Users can insert own settings"
  ON miracle_learning_20260209_user_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can update own settings" ON miracle_learning_20260209_user_settings;
CREATE POLICY "[ML] Users can update own settings"
  ON miracle_learning_20260209_user_settings FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- 28. WORKSHOP_FEEDBACK
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own feedback" ON miracle_learning_20260209_workshop_feedback;
CREATE POLICY "[ML] Users can view own feedback"
  ON miracle_learning_20260209_workshop_feedback FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own feedback" ON miracle_learning_20260209_workshop_feedback;
CREATE POLICY "[ML] Users can insert own feedback"
  ON miracle_learning_20260209_workshop_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Admins can manage feedback" ON miracle_learning_20260209_workshop_feedback;
CREATE POLICY "[ML] Admins can manage feedback"
  ON miracle_learning_20260209_workshop_feedback FOR ALL TO authenticated
  USING ((select ml_is_admin()));

-- ============================================================
-- 29. ARTICLES / ARTICLE_READS
-- ============================================================
DROP POLICY IF EXISTS "[ML] Users can view own article reads" ON miracle_learning_20260209_article_reads;
CREATE POLICY "[ML] Users can view own article reads"
  ON miracle_learning_20260209_article_reads FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "[ML] Users can insert own article reads" ON miracle_learning_20260209_article_reads;
CREATE POLICY "[ML] Users can insert own article reads"
  ON miracle_learning_20260209_article_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- PHASE 2.2: Missing Composite Indexes
-- ============================================================

-- point_transactions: Profile page sorted by time
CREATE INDEX IF NOT EXISTS ml_idx_point_transactions_user_created
  ON miracle_learning_20260209_point_transactions(user_id, created_at DESC);

-- comments: Discussion detail page by target
CREATE INDEX IF NOT EXISTS ml_idx_comments_target
  ON miracle_learning_20260209_comments(target_type, target_id, created_at DESC)
  WHERE is_deleted = false;

-- likes: Like queries
CREATE INDEX IF NOT EXISTS ml_idx_likes_target_user
  ON miracle_learning_20260209_likes(target_type, target_id, user_id);

-- user_badges: Badge page
CREATE INDEX IF NOT EXISTS ml_idx_user_badges_user_id
  ON miracle_learning_20260209_user_badges(user_id);

-- RLS policy column indexes (speed up policy evaluation)
CREATE INDEX IF NOT EXISTS ml_idx_users_id_role
  ON miracle_learning_20260209_users(id, role);

-- user_lesson_progress: Lesson page (high frequency)
CREATE INDEX IF NOT EXISTS ml_idx_user_lesson_progress_user_course
  ON miracle_learning_20260209_user_lesson_progress(user_id, course_id);

-- discussions: List page sorted
CREATE INDEX IF NOT EXISTS ml_idx_discussions_status_pinned_created
  ON miracle_learning_20260209_discussions(status, is_pinned DESC, created_at DESC);