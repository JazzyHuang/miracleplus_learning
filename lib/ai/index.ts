import type { QuestionType, AIGeneratedQuestion, QuestionOption } from '@/types/database';

const NEW_API_BASE_URL = process.env.NEW_API_BASE_URL || 'https://api.newapi.pro/v1';
const NEW_API_KEY = process.env.NEW_API_KEY;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callGemini(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  if (!NEW_API_KEY) {
    throw new Error('NEW_API_KEY is not configured');
  }

  const {
    model = 'gemini-2.0-flash',
    temperature = 0.7,
    maxTokens = 4096,
  } = options;

  const response = await fetch(`${NEW_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NEW_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`AI API 调用失败: ${response.status}`);
  }

  const data: ChatCompletionResponse = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('AI 未返回有效响应');
  }

  return data.choices[0].message.content;
}

export function validateQuestion(question: unknown): AIGeneratedQuestion | null {
  if (!question || typeof question !== 'object') {
    return null;
  }

  const q = question as Record<string, unknown>;

  // Validate type
  const validTypes: QuestionType[] = ['single', 'multiple', 'boolean'];
  if (!validTypes.includes(q.type as QuestionType)) {
    return null;
  }

  // Validate question_text
  if (typeof q.question_text !== 'string' || !q.question_text.trim()) {
    return null;
  }

  // Validate options
  if (!Array.isArray(q.options) || q.options.length < 2) {
    return null;
  }

  const options: QuestionOption[] = [];
  for (const opt of q.options) {
    if (
      typeof opt !== 'object' ||
      !opt ||
      typeof (opt as Record<string, unknown>).id !== 'string' ||
      typeof (opt as Record<string, unknown>).text !== 'string'
    ) {
      return null;
    }
    options.push({
      id: (opt as Record<string, unknown>).id as string,
      text: (opt as Record<string, unknown>).text as string,
    });
  }

  // Validate correct_answer
  let correctAnswer: string | string[];
  if (q.type === 'multiple') {
    if (!Array.isArray(q.correct_answer) || q.correct_answer.length === 0) {
      return null;
    }
    correctAnswer = q.correct_answer as string[];
  } else {
    if (typeof q.correct_answer !== 'string' || !q.correct_answer) {
      return null;
    }
    correctAnswer = q.correct_answer as string;
  }

  // Validate explanation
  const explanation = typeof q.explanation === 'string' ? q.explanation : '';

  return {
    type: q.type as QuestionType,
    question_text: q.question_text.trim(),
    options,
    correct_answer: correctAnswer,
    explanation,
  };
}

export function validateQuestions(rawQuestions: unknown[]): AIGeneratedQuestion[] {
  const validated: AIGeneratedQuestion[] = [];
  
  for (const q of rawQuestions) {
    const valid = validateQuestion(q);
    if (valid) {
      validated.push(valid);
    }
  }
  
  return validated;
}
