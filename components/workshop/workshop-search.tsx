'use client';

import { SearchInput } from '@/components/common';

/**
 * 活动搜索组件
 * 使用通用 SearchInput 组件实现
 * @deprecated 建议直接使用 SearchInput 组件
 */
export function WorkshopSearch() {
  return <SearchInput placeholder="搜索活动..." />;
}
