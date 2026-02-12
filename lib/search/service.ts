/**
 * 全文搜索服务
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { RPC } from '@/lib/db-tables';
import { logger } from '@/lib/logger';

export interface SearchResult {
  resultType: 'course' | 'lesson' | 'discussion' | 'ai_tool';
  resultId: string;
  title: string;
  snippet: string;
  url: string;
  rank: number;
}

const TYPE_LABELS: Record<string, string> = {
  course: '课程',
  lesson: '课时',
  discussion: '讨论',
  ai_tool: 'AI 工具',
};

export function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type;
}

export class SearchService {
  constructor(private supabase: SupabaseClient) {}

  async search(
    query: string,
    types?: string[],
    limit = 10
  ): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any).rpc(RPC.search_content, {
      p_query: query.trim(),
      p_types: types || ['course', 'lesson', 'discussion', 'ai_tool'],
      p_limit: limit,
    });

    if (error) {
      logger.error('搜索失败:', error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((r: any) => ({
      resultType: r.result_type,
      resultId: r.result_id,
      title: r.title,
      snippet: r.snippet || '',
      url: r.url,
      rank: r.rank,
    }));
  }
}

export function createSearchService(supabase: SupabaseClient) {
  return new SearchService(supabase);
}
