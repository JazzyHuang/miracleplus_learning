/**
 * 排序工具函数
 * 
 * 用于统一处理带有 order_index 字段的数据排序，
 * 避免在代码库中重复排序逻辑。
 */

/**
 * 带有 order_index 字段的基础接口
 */
export interface Sortable {
  order_index: number;
}

/**
 * 按 order_index 升序排序
 * 
 * @param items - 要排序的数组
 * @returns 排序后的新数组（不修改原数组）
 * 
 * @example
 * ```ts
 * const chapters = sortByOrderIndex(course.chapters);
 * ```
 */
export function sortByOrderIndex<T extends Sortable>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order_index - b.order_index);
}

/**
 * 按 order_index 降序排序
 * 
 * @param items - 要排序的数组
 * @returns 排序后的新数组（不修改原数组）
 */
export function sortByOrderIndexDesc<T extends Sortable>(items: T[]): T[] {
  return [...items].sort((a, b) => b.order_index - a.order_index);
}

/**
 * 带有创建时间字段的基础接口
 */
export interface Timestamped {
  created_at: string;
}

/**
 * 按创建时间降序排序（最新的在前）
 * 
 * @param items - 要排序的数组
 * @returns 排序后的新数组（不修改原数组）
 */
export function sortByCreatedAtDesc<T extends Timestamped>(items: T[]): T[] {
  return [...items].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * 按创建时间升序排序（最早的在前）
 * 
 * @param items - 要排序的数组
 * @returns 排序后的新数组（不修改原数组）
 */
export function sortByCreatedAtAsc<T extends Timestamped>(items: T[]): T[] {
  return [...items].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/**
 * 对课程的章节和课时进行嵌套排序
 * 
 * @param course - 包含章节的课程对象
 * @returns 排序后的课程对象（不修改原对象）
 * 
 * @example
 * ```ts
 * const sortedCourse = sortCourseChaptersAndLessons(course);
 * ```
 */
export function sortCourseChaptersAndLessons<
  TLesson extends Sortable,
  TChapter extends Sortable & { lessons?: TLesson[] },
  TCourse extends { chapters?: TChapter[] }
>(course: TCourse): TCourse {
  if (!course.chapters) {
    return course;
  }

  return {
    ...course,
    chapters: sortByOrderIndex(course.chapters).map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons ? sortByOrderIndex(chapter.lessons) : undefined,
    })),
  };
}

/**
 * 对章节的课时进行排序
 * 
 * @param chapter - 包含课时的章节对象
 * @returns 排序后的章节对象（不修改原对象）
 */
export function sortChapterLessons<
  TLesson extends Sortable,
  TChapter extends { lessons?: TLesson[] }
>(chapter: TChapter): TChapter {
  if (!chapter.lessons) {
    return chapter;
  }

  return {
    ...chapter,
    lessons: sortByOrderIndex(chapter.lessons),
  };
}

/**
 * 对课时的问题进行排序
 * 
 * @param lesson - 包含问题的课时对象
 * @returns 排序后的课时对象（不修改原对象）
 */
export function sortLessonQuestions<
  TQuestion extends Sortable,
  TLesson extends { questions?: TQuestion[] }
>(lesson: TLesson): TLesson {
  if (!lesson.questions) {
    return lesson;
  }

  return {
    ...lesson,
    questions: sortByOrderIndex(lesson.questions),
  };
}
