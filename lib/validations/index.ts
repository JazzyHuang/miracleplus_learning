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
    .url('请输入有效的图片URL')
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
    .url('请输入有效的图片URL')
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
 * 登录表单验证 Schema
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
  password: z
    .string()
    .min(6, '密码至少6个字符')
    .max(50, '密码不能超过50字符'),
  confirmPassword: z
    .string()
    .min(1, '请确认密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;
