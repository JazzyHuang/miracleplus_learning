import { z } from 'zod';

/**
 * 安全URL验证 - 仅允许 http 和 https 协议
 * 防止 javascript:, data:, vbscript: 等协议导致的XSS攻击
 */
const isSecureUrl = (url: string): boolean => {
  if (!url) return true; // 允许空值
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

// 通用验证规则 - 带协议白名单的安全URL验证
export const urlSchema = z
  .string()
  .url('请输入有效的URL')
  .refine(isSecureUrl, { message: '仅支持 http 和 https 协议' })
  .optional()
  .or(z.literal(''));

// 安全URL Schema（必填版本）
export const secureUrlSchema = z
  .string()
  .url('请输入有效的URL')
  .refine(isSecureUrl, { message: '仅支持 http 和 https 协议' });

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式不正确 (YYYY-MM-DD)');

/**
 * 课程表单验证 Schema
 */
export const courseSchema = z.object({
  title: z
    .string()
    .min(1, '请输入课程标题')
    .max(100, '标题不能超过100字符'),
  description: z
    .string()
    .max(500, '简介不能超过500字符')
    .optional()
    .or(z.literal('')),
  cover_image: z
    .string()
    .optional()
    .or(z.literal('')),
  is_published: z.boolean().optional().default(false),
});

export type CourseFormData = z.infer<typeof courseSchema>;

/**
 * 章节表单验证 Schema
 */
export const chapterSchema = z.object({
  title: z
    .string()
    .min(1, '请输入章节标题')
    .max(100, '标题不能超过100字符'),
  order_index: z.number().min(0, '排序必须大于等于0').default(0),
});

export type ChapterFormData = z.infer<typeof chapterSchema>;

/**
 * 课时表单验证 Schema
 */
export const lessonSchema = z.object({
  title: z
    .string()
    .min(1, '请输入课时标题')
    .max(100, '标题不能超过100字符'),
  content: z.string().optional().or(z.literal('')),
  feishu_url: z
    .string()
    .url('请输入有效的飞书链接')
    .refine(isSecureUrl, { message: '仅支持 http 和 https 协议' })
    .optional()
    .or(z.literal('')),
  order_index: z.number().min(0).default(0),
});

export type LessonFormData = z.infer<typeof lessonSchema>;

/**
 * Workshop 表单验证 Schema
 */
export const workshopSchema = z.object({
  title: z
    .string()
    .min(1, '请输入活动标题')
    .max(100, '标题不能超过100字符'),
  description: z
    .string()
    .max(1000, '描述不能超过1000字符')
    .optional()
    .or(z.literal('')),
  cover_image: z
    .string()
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .max(200, '地点不能超过200字符')
    .optional()
    .or(z.literal('')),
  start_date: z.string().min(1, '请选择开始日期'),
  end_date: z.string().min(1, '请选择结束日期'),
  feishu_url: z
    .string()
    .url('请输入有效的飞书链接')
    .refine(isSecureUrl, { message: '仅支持 http 和 https 协议' })
    .optional()
    .or(z.literal('')),
  is_published: z.boolean().default(false),
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  {
    message: '结束日期必须大于等于开始日期',
    path: ['end_date'],
  }
);

export type WorkshopFormData = z.infer<typeof workshopSchema>;

/**
 * 问题类型
 */
export const questionTypeSchema = z.enum(['single', 'multiple', 'boolean'], {
  message: '请选择问题类型',
});

export type QuestionType = z.infer<typeof questionTypeSchema>;

/**
 * 问题表单验证 Schema
 * 使用 superRefine 进行跨字段验证
 */
export const questionSchema = z.object({
  question: z
    .string()
    .min(1, '请输入问题内容')
    .max(500, '问题不能超过500字符'),
  type: questionTypeSchema,
  options: z
    .array(z.string().min(1, '选项不能为空'))
    .min(2, '至少需要2个选项')
    .max(6, '最多6个选项'),
  correct_answer: z.union([z.string(), z.array(z.string())]),
  explanation: z
    .string()
    .max(500, '解析不能超过500字符')
    .optional()
    .or(z.literal('')),
}).superRefine((data, ctx) => {
  const { type, correct_answer, options } = data;

  // 根据题目类型验证答案格式
  if (type === 'multiple') {
    // 多选题：答案必须是数组且至少有一个选项
    if (!Array.isArray(correct_answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '多选题答案必须是数组',
        path: ['correct_answer'],
      });
      return;
    }
    if (correct_answer.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请至少选择一个正确答案',
        path: ['correct_answer'],
      });
      return;
    }
    // 验证答案是否在选项范围内
    const invalidAnswers = correct_answer.filter((ans) => !options.includes(ans));
    if (invalidAnswers.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '正确答案必须是选项之一',
        path: ['correct_answer'],
      });
    }
  } else {
    // 单选题/判断题：答案必须是字符串
    if (Array.isArray(correct_answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '单选题/判断题答案必须是单个选项',
        path: ['correct_answer'],
      });
      return;
    }
    if (!correct_answer || correct_answer.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请设置正确答案',
        path: ['correct_answer'],
      });
      return;
    }
    // 验证答案是否在选项范围内
    if (!options.includes(correct_answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '正确答案必须是选项之一',
        path: ['correct_answer'],
      });
    }
  }

  // 判断题特殊验证：只能有2个选项
  if (type === 'boolean' && options.length !== 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '判断题必须正好有2个选项',
      path: ['options'],
    });
  }
});

export type QuestionFormData = z.infer<typeof questionSchema>;

/**
 * 密码强度验证 Schema
 * 要求：至少 8 个字符，包含大写字母、小写字母和数字
 */
export const strongPasswordSchema = z
  .string()
  .min(8, '密码至少8个字符')
  .max(50, '密码不能超过50字符')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    '密码必须包含大写字母、小写字母和数字'
  );

/**
 * 登录表单验证 Schema
 * 登录时使用较宽松的密码验证（兼容旧用户）
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '请输入邮箱地址')
    .email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(6, '密码至少6个字符'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * 注册表单验证 Schema
 * 新用户使用强密码验证
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, '请输入姓名')
    .max(50, '姓名不能超过50字符'),
  email: z
    .string()
    .min(1, '请输入邮箱地址')
    .email('请输入有效的邮箱地址'),
  password: strongPasswordSchema,
  confirmPassword: z
    .string()
    .min(1, '请确认密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * 安全 JSON 解析
 * 为 JSON.parse 添加类型验证和错误处理
 * 防止无效 JSON 导致运行时崩溃
 *
 * @example
 * ```ts
 * const data = safeJsonParse(localStorage.getItem('data') || '', userSchema) ?? defaultValue;
 * ```
 */
export function safeJsonParse<T>(json: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed = JSON.parse(json);
    return schema.parse(parsed);
  } catch {
    return null;
  }
}

/**
 * LocalStorage 安全读取
 * 包装 localStorage.getItem 并进行类型验证
 */
export function safeGetItem<T>(
  key: string,
  schema: z.ZodType<T>,
  defaultValue: T
): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return safeJsonParse(item, schema) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * LocalStorage 安全写入
 * 包装 localStorage.setItem 并进行类型验证
 */
export function safeSetItem<T>(key: string, value: T, schema: z.ZodType<T>): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const validated = schema.parse(value);
    localStorage.setItem(key, JSON.stringify(validated));
    return true;
  } catch {
    return false;
  }
}

/**
 * 搜索历史 Schema
 */
export const searchHistorySchema = z.array(z.string());

/**
 * 用户偏好设置 Schema
 */
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  sidebarCollapsed: z.boolean().optional(),
  fontSize: z.enum(['sm', 'md', 'lg']).optional(),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

// ==================== 设置页面 Schemas ====================

/**
 * 个人资料设置 Schema
 */
export const profileSettingsSchema = z.object({
  name: z.string().min(1, '请输入昵称').max(20, '昵称不能超过20字符'),
  bio: z.string().max(200, '简介不能超过200字符').optional().or(z.literal('')),
  avatar_url: z.string().optional().or(z.literal('')),
});

export type ProfileSettingsData = z.infer<typeof profileSettingsSchema>;

/**
 * 修改密码 Schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(1, '请确认新密码'),
}).refine((d) => d.newPassword !== d.currentPassword, {
  message: '新密码不能与当前密码相同',
  path: ['newPassword'],
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

/**
 * 通知偏好 Schema
 */
export const notificationSettingsSchema = z.object({
  email_course_updates: z.boolean(),
  email_community_replies: z.boolean(),
  email_weekly_digest: z.boolean(),
  email_point_milestones: z.boolean(),
});

export type NotificationSettingsData = z.infer<typeof notificationSettingsSchema>;

/**
 * 学习偏好 Schema
 */
export const learningSettingsSchema = z.object({
  font_size: z.enum(['sm', 'md', 'lg']),
  reduce_motion: z.boolean(),
});

export type LearningSettingsData = z.infer<typeof learningSettingsSchema>;

/**
 * 隐私设置 Schema
 */
export const privacySettingsSchema = z.object({
  show_on_leaderboard: z.boolean(),
  show_profile_public: z.boolean(),
  show_activity: z.boolean(),
});

export type PrivacySettingsData = z.infer<typeof privacySettingsSchema>;

/**
 * 注销账户确认 Schema
 */
export const deleteAccountSchema = z.object({
  confirmEmail: z.string().email('请输入有效的邮箱地址'),
});
