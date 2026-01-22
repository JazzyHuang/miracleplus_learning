import type { QuestionType } from '@/types/database';

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  boolean: '判断题',
};

export function generateQuestionsPrompt(
  lessonContent: string,
  lessonTitle: string,
  questionTypes: QuestionType[],
  count: number
): { system: string; user: string } {
  const typeDescriptions = questionTypes
    .map((type) => {
      switch (type) {
        case 'single':
          return '单选题（有4个选项，只有1个正确答案）';
        case 'multiple':
          return '多选题（有4个选项，有2-3个正确答案）';
        case 'boolean':
          return '判断题（只有"正确"和"错误"两个选项）';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('、');

  const typesList = questionTypes.map((t) => QUESTION_TYPE_LABELS[t]).join('、');

  const system = `你是一位专业的教育内容出题专家。你的任务是根据提供的课程内容，生成高质量的测试题目。

要求：
1. 题目必须基于提供的课程内容，不要编造课程中没有的知识点
2. 题目难度适中，既能检验学生对知识点的理解，又不会过于刁钻
3. 题目表述清晰准确，避免歧义
4. 每道题都要提供详细的答案解析
5. 选项设计要合理，干扰项要有一定的迷惑性但不能是错误的知识点

输出格式要求：
- 必须输出有效的JSON数组格式
- 不要包含任何其他文字说明，只输出JSON
- JSON格式如下：
[
  {
    "type": "single|multiple|boolean",
    "question_text": "题目内容",
    "options": [
      {"id": "a", "text": "选项A内容"},
      {"id": "b", "text": "选项B内容"},
      {"id": "c", "text": "选项C内容"},
      {"id": "d", "text": "选项D内容"}
    ],
    "correct_answer": "a" 或 ["a", "b"] (多选题用数组),
    "explanation": "答案解析"
  }
]

注意：
- 单选题和判断题的 correct_answer 是字符串（如 "a" 或 "true"）
- 多选题的 correct_answer 是数组（如 ["a", "c"]）
- 判断题的 options 固定为 [{"id": "true", "text": "正确"}, {"id": "false", "text": "错误"}]
- 选项id使用小写字母: a, b, c, d`;

  const user = `请根据以下课程内容生成 ${count} 道测试题目。

课程标题：${lessonTitle}

题目类型要求：${typeDescriptions}
（请尽量平均分配各类型题目数量，如果只有一种类型则全部生成该类型）

课程内容：
---
${lessonContent}
---

请生成 ${count} 道题目，题目类型包括：${typesList}。直接输出JSON数组，不要有其他内容。`;

  return { system, user };
}

export function parseAIResponse(response: string): unknown[] {
  // Try to extract JSON from the response
  let jsonStr = response.trim();
  
  // If response is wrapped in markdown code blocks, extract the JSON
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  
  // Try to find array in the response
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }
    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', response);
    throw new Error('无法解析AI返回的内容，请重试');
  }
}
