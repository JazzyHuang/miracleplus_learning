# CLAUDE.md - Miracle Learning

> **维护规则**: 每次进行开发、优化或修复后，必须同步更新本文档的相关内容（包括但不限于：新增/修改的路由、组件、数据库表、环境变量、架构模式、安全措施等）。确保本文档始终反映代码库的最新状态。

## Project Overview

Miracle Learning is a Chinese-language online learning platform with courses, workshops, AI tools, community discussions, and a gamification system. The UI is forced dark mode with an indigo/violet brand palette.

## Tech Stack

- **Framework**: Next.js 16.1.2 (App Router, React Server Components)
- **React**: 19.2.3 with React Compiler enabled (automatic memoization)
- **TypeScript**: Strict mode with all quality checks (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noUncheckedIndexedAccess`)
- **Styling**: Tailwind CSS 3.4 + shadcn/ui (New York style) + Radix UI primitives
- **Animation**: Framer Motion 12 with LazyMotion for code splitting
- **Backend**: Supabase (Auth, PostgreSQL with RLS, Storage)
- **Forms**: React Hook Form + Zod 4 validation
- **Markdown**: react-markdown + remark-gfm + rehype-pretty-code + shiki
- **PWA**: Serwist service worker
- **Package Manager**: pnpm
- **Bundler**: Turbopack (dev mode)

## Commands

```bash
pnpm dev        # Dev server with Turbopack
pnpm build      # Production build
pnpm start      # Production server
pnpm lint       # ESLint
pnpm analyze    # Bundle analysis (ANALYZE=true)
```

## Environment Variables

Required in `.env.local` (see `env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Admin operations (server-only) |
| `NEXT_PUBLIC_BASE_URL` | No | App base URL (default: `http://localhost:3000`) |
| `NEW_API_KEY` or `GEMINI_API_KEY` | No | AI question generation (need at least one for AI features) |
| `NEW_API_BASE_URL` | No | Custom AI API endpoint |

## Project Structure

```
app/
├── (auth)/              # Public auth routes (/login, /register)
├── (dashboard)/         # Protected user routes (requires auth)
│   ├── dashboard/       # Home page
│   ├── courses/         # Course list and detail
│   ├── workshop/        # Workshop list and detail
│   ├── discussions/     # Community discussions
│   ├── ai-tools/        # AI tool directory
│   ├── profile/         # User profile and badges
│   ├── leaderboard/     # Points leaderboard
│   └── invite/          # Referral system
├── (marketing)/         # Public landing page (/)
├── admin/               # Admin-only routes (requires admin role)
│   ├── courses/         # Course CRUD
│   └── workshops/       # Workshop management
├── api/                 # API routes
│   ├── ai/generate-questions/  # AI question generation
│   ├── progress/        # Lesson progress (sendBeacon)
│   └── revalidate/      # Cache revalidation
├── actions/             # Server actions (auth, admin, points)
└── auth/callback/       # OAuth/email verification callback

components/
├── ui/                  # shadcn/ui primitives (button, card, input, etc.)
├── admin/               # Admin dashboard components
├── course/              # Course cards, detail, lessons, markdown
├── workshop/            # Workshop submissions, checkins
├── gamification/        # Points, badges, streaks, leaderboard
├── community/           # Discussion cards, forms
├── ai-tools/            # Tool cards, experience forms
├── marketing/           # Landing page (hero, features, CTA)
├── dashboard/           # Dashboard shell, home content
├── sidebar/             # Navigation sidebar with context
├── seo/                 # JSON-LD structured data
├── pwa/                 # Install prompt, offline indicator
├── common/              # Shared (search, comments, like button)
├── profile/             # Edit profile dialog
├── quiz/                # Quiz panel and questions
└── providers.tsx        # Global providers (Theme, User, Motion)

lib/
├── supabase/            # Supabase clients and utilities
│   ├── client.ts        # Browser client
│   ├── server.ts        # Server client (cookies) + cache client (no cookies)
│   ├── auth.ts          # getAuthUser, getUserProfile, isAdmin (React cache)
│   ├── queries.ts       # Cached queries (unstable_cache with tags)
│   ├── storage.ts       # Image upload with multi-layer security
│   └── admin.ts         # Admin-specific operations
├── courses/             # CoursesService (lessons, progress, reviews, Q&A)
├── points/              # PointsService + BadgesService + config
├── ai-tools/            # AIToolsService + cached queries
├── community/           # DiscussionsService + InvitationsService
├── ai/                  # AI integration (Gemini via NewAPI)
├── validations/         # Zod schemas for all forms
├── api-client.ts        # HTTP client with retry + exponential backoff
├── env.ts               # Environment variable validation
├── logger.ts            # Environment-aware logging
├── performance.ts       # Web Vitals monitoring
├── rate-limit.ts        # In-memory rate limiting
└── utils.ts             # cn() helper (clsx + tailwind-merge)

contexts/
└── user-context.tsx     # UserProvider with cross-tab auth sync

hooks/
├── use-lesson-progress.ts  # Lesson progress tracking with auto-save
├── use-cached-query.ts     # Client-side cached queries
└── use-filter.ts           # Filter/search state management

supabase/migrations/     # PostgreSQL migration files
```

## Architecture Patterns

### Authentication

- **Server-side**: `getAuthUser()` uses `supabase.auth.getUser()` (token verification, not `getSession()`) wrapped in React `cache()` for per-request deduplication
- **Client-side**: `UserProvider` context listens to `onAuthStateChange` and syncs across tabs via storage events
- **Route protection**: Server Layout Guards in route group layouts (not middleware)
- **Admin check**: `app_metadata.role === 'admin'` (server-set, not user-modifiable)
- **Middleware**: Lightweight — only redirects authenticated users away from auth pages

### Data Fetching & Caching

- **Server queries**: `unstable_cache()` with revalidation tags (e.g., `['courses']`, `['user-stats']`) and a dedicated cache client (no cookies to avoid cache invalidation issues)
- **Auth queries**: React `cache()` for per-request deduplication
- **Stale times**: Dynamic 60s, static 300s (configured in next.config.ts)
- **Revalidation**: Tag-based via `/api/revalidate` endpoint and `revalidateTag()` in server actions
- **ISR**: Course/workshop detail pages use 5-minute revalidation

### Service Layer

Class-based services with dependency injection:

```typescript
export class CoursesService {
  constructor(private supabase: SupabaseClient) {}
  // methods...
}
export function createCoursesService(supabase: SupabaseClient) {
  return new CoursesService(supabase);
}
```

Services: `CoursesService`, `PointsService`, `BadgesService`, `AIToolsService`, `DiscussionsService`, `InvitationsService`

### Atomic Database Operations

Critical operations use Supabase RPC functions to ensure atomicity:
- `mark_lesson_complete()`, `add_user_points()`, `update_user_streak()`
- `accept_answer()`, `generate_invite_code()`, `upsert_lesson_time_spent()`
- `refresh_leaderboard()` (materialized view)

### API Client

`lib/api-client.ts` provides a unified HTTP client with:
- Timeout via AbortController
- Exponential backoff with jitter
- Error classification (retryable 5xx vs non-retryable 4xx)
- Structured responses: `{ success, data?, error?, retryable?, statusCode? }`

### Validation

All input validated with Zod schemas in `lib/validations/index.ts`:
- Auth forms (login, register with strong password rules)
- Content forms (course, chapter, lesson, workshop, question)
- URL validation (protocol whitelist: http/https only)
- Image validation (magic number verification, MIME type matching)

### Rate Limiting

In-memory rate limiter applied to:
- Login: 5 attempts / 15 minutes per IP
- Register: 3 attempts / 60 minutes per IP
- API routes: 10 requests / minute per user

## Code Conventions

### TypeScript

- Strict mode with all checks enabled
- Path alias: `@/*` maps to project root
- No `any` (warn), no unused vars (error, with `_` prefix ignore for args/vars/caught errors), `prefer-const` (error)
- `noUncheckedIndexedAccess: true` — array/object index access returns `T | undefined`

### ESLint Configuration

ESLint config is in `eslint.config.mjs` (flat config format) extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Key rules:

| Rule | Level | Notes |
|------|-------|-------|
| `@typescript-eslint/no-unused-vars` | error | `_` prefix ignored for args, vars, and caught errors |
| `@typescript-eslint/no-explicit-any` | warn | |
| `@typescript-eslint/no-non-null-assertion` | warn | |
| `@next/next/no-img-element` | error | Use `next/image` `<Image>` component |
| `react-hooks/rules-of-hooks` | error | |
| `react-hooks/exhaustive-deps` | warn | |
| `import/no-duplicates` | error | |
| `prefer-const` | error | |
| `no-console` | warn | Only `console.warn` and `console.error` allowed |

**Current status**: 0 errors, ~22 warnings (mostly `no-non-null-assertion` and `exhaustive-deps`)

### Components

- Server Components by default; add `'use client'` only for interactive components
- Feature-based directory organization under `components/`
- UI primitives in `components/ui/` follow shadcn/ui patterns (CVA variants)
- Dynamic imports for heavy components (command palette, etc.)

### Styling

- Tailwind utility classes with `cn()` helper for conditional merging
- CSS variables for theming (defined in `globals.css` and `tailwind.config.js`)
- Dark mode forced via class strategy
- Brand colors: indigo/violet gradient system

### Error Handling

- Structured error responses with `success`/`error` pattern
- AI errors use typed `AIError` class with codes: `CONFIG_ERROR`, `TIMEOUT`, `RATE_LIMIT`, `API_ERROR`, `PARSE_ERROR`, `CANCELLED`
- Unified auth error messages to prevent email enumeration
- `logger` module for environment-aware logging (dev: all levels, prod: error/warn only)

### Git Commits

- Conventional commits: `feat:`, `fix:`, `refactor:`
- Bilingual messages (Chinese or English)

## Security Considerations

- **Auth**: Always use `getUser()` server-side, never trust `getSession()` alone
- **Admin**: Role from `app_metadata` only (not user-editable)
- **File uploads**: Multi-layer validation (size, MIME, extension, magic numbers, secure filename via `crypto.randomUUID`)
- **URLs**: Protocol whitelist prevents javascript: XSS
- **JSON-LD**: `safeJsonLdStringify()` escapes `<` to `\u003c` to prevent XSS
- **Content limits**: Max lengths on all text inputs to prevent DoS
- **Redirects**: `sanitizeRedirectPath()` prevents open redirects (relative paths only)
- **Points anti-fraud**: Daily cap (300 points), per-action limits, duplicate/rapid action detection

## Gamification System

- **Points**: Awarded for course completion, workshop participation, community activity, AI tool contributions
- **Levels**: Observer (0-99) → Learner (100-499) → Practitioner (500-1999) → AI Navigator (2000+)
- **Badges**: Bronze/Silver/Gold tiers across learning, workshop, community, achievement categories
- **Streaks**: Daily login tracking with milestone bonuses
- **Leaderboard**: Materialized view refreshed via RPC

## AI Integration

- **Provider**: Gemini 2.0 Flash via NewAPI proxy
- **Usage**: Admin-only question generation for lessons
- **Retry**: 3 attempts with exponential backoff, respects Retry-After header
- **Timeout**: 30 seconds default
- **Validation**: Generated questions validated for type, options, correct answers

## Database Naming Convention (Shared Database)

This project runs on a **shared Supabase database**. To avoid conflicts with other projects, ALL database objects use prefixed names:

| Object Type | Prefix | Example |
|-------------|--------|---------|
| Tables | `miracle_learning_20260209_` | `miracle_learning_20260209_users` |
| Functions | `ml_` | `ml_is_admin()`, `ml_add_user_points()` |
| Triggers | `ml_` | `ml_on_auth_user_created` |
| Indexes | `ml_idx_` | `ml_idx_users_id_role` |
| Views | `ml_` | `ml_leaderboard_view` |
| Sequences | `ml_` | `ml_certificate_number_seq` |
| RLS Policies | `[ML]` prefix | `[ML] Users can view own profile` |
| Storage Bucket | `ml_images` | (instead of shared `images`) |

### Application Code Convention

All table names and RPC function names are centralized in `lib/db-tables.ts`:

```typescript
import { DB, RPC, STORAGE_BUCKET } from '@/lib/db-tables';

// Table access
supabase.from(DB.users).select('*');
supabase.from(DB.courses).select('*');

// RPC calls
supabase.rpc(RPC.add_user_points, { ... });
supabase.rpc(RPC.mark_lesson_complete, { ... });

// Storage
supabase.storage.from(STORAGE_BUCKET).upload(...);
```

**NEVER** use raw string table/function names in `.from()` or `.rpc()` calls. Always use `DB.xxx` and `RPC.xxx` constants.

### Critical Safety Rules

1. **auth.users trigger**: Uses unique name `ml_on_auth_user_created` — NEVER drop triggers on `auth.users` that belong to other projects
2. **No bulk sync**: NEVER `INSERT INTO ... FROM auth.users` to sync all auth users
3. **Foreign keys to auth.users**: Keep as `REFERENCES auth.users(id)` (shared auth table)
4. **pg_cron**: Uses unique task name `ml-refresh-leaderboard`

## Database Schema

The consolidated migration is in `supabase/migrations/001_miracle_learning_init.sql`. All tables use UUID primary keys, RLS enabled, `TIMESTAMPTZ` for timestamps, and the `miracle_learning_20260209_` prefix.

### Core Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `users` | User profiles (extends `auth.users`) | id, email, name, avatar_url, role, created_at |
| `courses` | Course catalog | id, title, description, cover_image, order_index, is_published |
| `chapters` | Course chapters | id, course_id (FK→courses), title, order_index, updated_at |
| `lessons` | Lesson content (markdown) | id, chapter_id (FK→chapters), title, content, order_index, updated_at |
| `questions` | Quiz questions | id, lesson_id (FK→lessons), type (single/multiple/boolean), question_text, options (JSONB), correct_answer (JSONB), explanation |
| `user_answers` | Quiz answer history | id, user_id, question_id, answer (JSONB), is_correct |
| `user_lesson_progress` | Learning progress | user_id, lesson_id, course_id, marked_complete_at, time_spent |

### Workshop Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `workshops` | Workshop events | id, title, description, cover_image, event_date, is_active, updated_at |
| `workshop_checkins` | Attendance records | id, user_id, workshop_id, image_url (UNIQUE user+workshop) |
| `workshop_submissions` | User submissions | id, user_id, workshop_id, status, reviewed_by (FK→auth.users) |
| `workshop_materials` | Workshop resources | id, workshop_id, updated_at |
| `instructor_applications` | Instructor applications | id, user_id, reviewed_by (FK→auth.users) |

### Gamification Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `point_rules` | Configurable point rules | action_type (UNIQUE), points, daily_limit, is_active |
| `user_point_balance` | User point totals | user_id (PK), total_points, available_points, spent_points, level |
| `point_transactions` | Point audit log | id, user_id, points, action_type, reference_id, reference_type |
| `user_streaks` | Login streak tracking | user_id (PK), current_streak, longest_streak, last_login_date |
| `badges` | Badge definitions | id, code (UNIQUE), name, category, tier (1-3), points_reward, requirement_type, requirement_value |
| `user_badges` | Unlocked badges | user_id, badge_id (UNIQUE pair) |
| `achievements` | Achievement definitions | id, code (UNIQUE), name, category, max_progress, points_reward |
| `user_achievements` | Achievement progress | user_id, achievement_id, current_progress, is_completed |

### AI Tools Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `tool_categories` | AI tool categories | id, name, slug (UNIQUE), icon (Lucide name) |
| `ai_tools` | AI tool listings | id, category_id, name, slug (UNIQUE), pricing_type (free/freemium/paid), avg_rating, tags[] |
| `tool_ratings` | User ratings (1-5) | user_id + tool_id (composite PK) |
| `tool_experiences` | Usage experiences | id, user_id, tool_id, use_case, screenshot_url, status (pending/approved/rejected) |
| `tool_cases` | Application case studies | id, user_id, tool_id, title, problem_background, solution, status |
| `tool_comparisons` | Tool comparisons | id, user_id, tool_ids[], comparison_content (JSONB) |
| `user_bookmarks` | User bookmarks | user_id + target_type + target_id (composite PK) |
| `weekly_picks` | Weekly featured tools | id, tool_id, week_start, picked_by (FK→auth.users) |

### Community Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `discussions` | Discussion topics | id, user_id, title, content, tags[], comment_count, like_count, status (active/closed/deleted) |
| `discussion_participants` | Participation records | user_id + discussion_id (composite PK) |
| `comments` | Polymorphic comments | id, user_id, target_type, target_id, content, is_deleted |
| `likes` | Polymorphic likes | id, user_id, target_type, target_id |
| `user_invitations` | Referral system | id, inviter_id, invitee_id, invite_code (UNIQUE), status (pending/registered/completed) |
| `course_notes` | User study notes | id, user_id, lesson_id (FK SET NULL on delete) |
| `qa_questions` | Course Q&A questions | id, user_id, course_id, lesson_id (FK SET NULL on delete), accepted_answer_id |
| `qa_answers` | Course Q&A answers | id, user_id, question_id |

### Other Tables

| Table | Description |
|-------|-------------|
| `reward_items` | Redeemable rewards (points shop) |
| `reward_orders` | Reward redemption orders |
| `certificates` | User certificates (ai_navigator/completion/achievement) |

### Key RPC Functions

| Function | Purpose |
|----------|---------|
| `add_user_points(user_id, points, action_type, ...)` | Atomic point addition with daily limits (300/day cap) |
| `update_user_streak(user_id)` | Atomic streak update + daily login points + milestone badges |
| `mark_lesson_complete(user_id, lesson_id, course_id)` | Atomic lesson completion with milestone checks |
| `upsert_lesson_time_spent(...)` | Atomic time tracking (used by sendBeacon) |
| `accept_answer(question_id, answer_id)` | Atomic answer acceptance |
| `generate_invite_code(user_id)` | Generate unique 8-char invite code |
| `refresh_leaderboard()` | Refresh materialized view concurrently |
| `generate_certificate_number()` | Generate sequential certificate number (ML + year + seq) |

### Views

| View | Purpose |
|------|---------|
| `leaderboard_view` (MATERIALIZED) | Pre-computed leaderboard with rank, points, streaks, badge count (excludes admins) |
| `leaderboard_safe_view` | Security view exposing only public fields (id, name, avatar, points, streaks) |

### Database Triggers

- `on_auth_user_created` → Auto-create user profile on signup
- `update_updated_at_column()` → Generic trigger for `updated_at` on workshops, chapters, lessons, questions, workshop_materials
- `update_discussion_comment_count()` → Sync discussion comment/participant counts
- `update_discussion_like_count()` → Sync discussion like counts
- `update_tool_rating_stats()` → Sync tool avg_rating and rating_count
- `update_tool_experience_count()` → Sync tool experience_count
- `update_tool_case_count()` → Sync tool case_count (only counts approved)

### Migration Conventions

- Files named `NNN_description.sql` (e.g., `025_comprehensive_fixes.sql`)
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotent DDL
- Use `DO $$ BEGIN ... END $$` blocks for conditional alterations
- All tables have RLS enabled with explicit policies
- Foreign keys use `ON DELETE CASCADE` for owned data, `ON DELETE SET NULL` for optional references
- Indexes named `idx_<table>_<column(s)>`

## No Testing Framework

There is currently no test runner configured. No `jest`, `vitest`, or `playwright` setup exists.

## Language

The application UI and most code comments are in Chinese (zh-CN). The HTML lang attribute is hardcoded to `zh-CN`. No i18n library is configured.
