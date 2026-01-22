import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callGemini, validateQuestions } from '@/lib/ai';
import { generateQuestionsPrompt, parseAIResponse } from '@/lib/ai/prompts';
import type { AIGenerateQuestionsRequest, QuestionType } from '@/types/database';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body: AIGenerateQuestionsRequest = await request.json();
    const { lessonId, questionTypes, count } = body;

    // Validate request
    if (!lessonId) {
      return NextResponse.json(
        { success: false, error: '缺少课时ID' },
        { status: 400 }
      );
    }

    if (!questionTypes || questionTypes.length === 0) {
      return NextResponse.json(
        { success: false, error: '请选择至少一种题目类型' },
        { status: 400 }
      );
    }

    if (!count || count < 1 || count > 20) {
      return NextResponse.json(
        { success: false, error: '题目数量必须在1-20之间' },
        { status: 400 }
      );
    }

    // Create Supabase client and verify admin
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
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

    const aiResponse = await callGemini([
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.7,
      maxTokens: 8192,
    });

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
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'AI出题失败，请稍后重试' 
      },
      { status: 500 }
    );
  }
}
