export type UserRole = 'user' | 'admin';

export type QuestionType = 'single' | 'multiple' | 'boolean';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface Workshop {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  event_date: string;
  is_active: boolean;
  feishu_url: string | null;
  created_at: string;
}

export interface WorkshopCheckin {
  id: string;
  user_id: string;
  workshop_id: string;
  image_url: string;
  created_at: string;
  user?: User;
  workshop?: Workshop;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
  chapters?: Chapter[];
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  content: string;
  feishu_url: string | null;
  order_index: number;
  created_at: string;
  questions?: Question[];
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  lesson_id: string;
  type: QuestionType;
  question_text: string;
  options: QuestionOption[];
  correct_answer: string | string[]; // single answer for single/boolean, array for multiple
  explanation?: string;
  order_index: number;
  created_at: string;
}

export interface UserAnswer {
  id: string;
  user_id: string;
  question_id: string;
  answer: string | string[];
  is_correct: boolean;
  created_at: string;
}

// Database response types with relations
export interface CourseWithChapters extends Course {
  chapters: ChapterWithLessons[];
}

export interface ChapterWithLessons extends Chapter {
  lessons: Lesson[];
}

export interface LessonWithQuestions extends Lesson {
  questions: Question[];
}

// AI Question Generation types
export interface AIGenerateQuestionsRequest {
  lessonId: string;
  questionTypes: QuestionType[];
  count: number;
}

export interface AIGeneratedQuestion {
  type: QuestionType;
  question_text: string;
  options: QuestionOption[];
  correct_answer: string | string[];
  explanation: string;
}

export interface AIGenerateQuestionsResponse {
  success: boolean;
  questions?: Question[];
  generatedCount?: number;
  error?: string;
}
