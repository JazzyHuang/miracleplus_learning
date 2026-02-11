import type { Discussion } from '@/types/database';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://miracle.learning';

interface DiscussionJsonLdProps {
  discussion: Discussion;
  baseUrl?: string;
}

/** 安全序列化 JSON-LD，转义 HTML 特殊字符防止 XSS */
function safeJsonLdStringify(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * 讨论帖结构化数据组件
 * 使用 Schema.org DiscussionForumPosting 格式
 * 
 * 帮助搜索引擎理解社区讨论内容，提升 SEO 可见度
 */
export function DiscussionJsonLd({ discussion, baseUrl = BASE_URL }: DiscussionJsonLdProps) {
  const discussionUrl = `${baseUrl}/discussions/${discussion.id}`;
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': discussionUrl,
    headline: discussion.title,
    text: discussion.content,
    url: discussionUrl,
    datePublished: discussion.created_at,
    author: {
      '@type': 'Person',
      name: discussion.user?.name || discussion.user?.email || '匿名用户',
    },
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: discussion.comment_count || 0,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: discussion.like_count || 0,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ViewAction',
        userInteractionCount: discussion.view_count || 0,
      },
    ],
    discussionUrl,
    inLanguage: 'zh-CN',
    isPartOf: {
      '@type': 'DiscussionForum',
      name: 'Miracle Learning 社区',
      url: `${baseUrl}/discussions`,
    },
    ...(discussion.tags && discussion.tags.length > 0 && {
      keywords: discussion.tags.join(', '),
    }),
  };

  return (
    <script
      id={`discussion-jsonld-${discussion.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
    />
  );
}
