'use client';

import { SearchInput } from '@/components/common';

/**
 * 课程搜索组件
 * 使用通用 SearchInput 组件实现
 * @deprecated 建议直接使用 SearchInput 组件
 */
export function CourseSearch() {
  return <SearchInput placeholder="搜索课程..." />;
}
