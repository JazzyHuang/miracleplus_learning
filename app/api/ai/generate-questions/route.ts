import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/supabase/admin';
import { callGemini, validateQuestions, AIError } from '@/lib/ai';
import { generateQuestionsPrompt, parseAIResponse } from '@/lib/ai/prompts';
import { checkRateLimit, rateLimitResponse, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import type { QuestionType } from '@/types/database';

/** 请求超时时间（毫秒） */
const AI_REQUEST_TIMEOUT = 60000; // 60秒，AI 生成需要较长时间

// 请求验证 Schema
const requestSchema = z.object({
  lessonId: z.string().uuid('无效的课时ID'),
  questionTypes: z.array(z.enum(['single', 'multiple', 'boolean'])).min(1, '请选择至少一种题目类型'),
  count: z.number().int().min(1, '至少生成1道题').max(20, '最多生成20道题'),
});

export async function POST(request: Request) {
  try {
    // 速率限制检查
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(`ai-generate:${clientIP}`, RATE_LIMITS.aiGenerate);
    
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // 解析并验证请求体
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);
    
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: errors },
        { status: 400 }
      );
    }

    const { lessonId, questionTypes, count } = parseResult.data;

    // Create Supabase client and verify admin
    const supabase = await createClient();
    
    // 使用统一的管理员权限检查
    const { isAdmin, user } = await checkAdminAccess(supabase);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限执行此操作' },
        { status: 403 }
      );
    }

    // Get lesson content
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, content')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { success: false, error: '课时不存在' },
        { status: 404 }
      );
    }

    if (!lesson.content || lesson.content.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: '课程内容太少，无法生成题目。请先添加课程内容（至少50个字符）' },
        { status: 400 }
      );
    }

    // Get current max order_index for the lesson
    const { data: existingQuestions } = await supabase
      .from('questions')
      .select('order_index')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: false })
      .limit(1);

    const startOrderIndex = existingQuestions && existingQuestions.length > 0
      ? existingQuestions[0].order_index + 1
      : 0;

    // Generate prompt and call AI
    const { system, user: userPrompt } = generateQuestionsPrompt(
      lesson.content,
      lesson.title,
      questionTypes as QuestionType[],
      count
    );

    let aiResponse: string;
    try {
      aiResponse = await callGemini([
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ], {
        temperature: 0.7,
        maxTokens: 8192,
        timeout: AI_REQUEST_TIMEOUT,
        maxRetries: 3,
      });
    } catch (error) {
      // 处理 AI 特定错误
      if (error instanceof AIError) {
        const statusCode = error.code === 'RATE_LIMIT' ? 429 
          : error.code === 'CONFIG_ERROR' ? 500
          : error.code === 'TIMEOUT' ? 504
          : 502;
        
        return NextResponse.json(
          { 
            success: false, 
            error: error.message,
            code: error.code,
            retryable: error.retryable,
          },
          { status: statusCode }
        );
      }
      throw error;
    }

    // Parse and validate AI response
    const rawQuestions = parseAIResponse(aiResponse);
    const validatedQuestions = validateQuestions(rawQuestions);

    if (validatedQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'AI生成的题目格式无效，请重试' },
        { status: 500 }
      );
    }

    // Insert questions into database
    const questionsToInsert = validatedQuestions.map((q, index) => ({
      lesson_id: lessonId,
      type: q.type,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      order_index: startOrderIndex + index,
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error('Failed to insert questions:', insertError);
      return NextResponse.json(
        { success: false, error: '保存题目失败：' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: insertedQuestions,
      generatedCount: insertedQuestions.length,
    });

  } catch (error) {
    console.error('AI generate questions error:', error);
    
    // 分类错误以提供更好的用户反馈
    if (error instanceof AIError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.code,
          retryable: error.retryable,
        },
        { status: error.statusCode || 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'AI出题失败，请稍后重试',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
