'use client';

import { useState, useEffect, useRef } from 'react';
import { List } from 'lucide-react';
import { cn, slugify } from '@/lib/utils';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  /** Markdown 内容 */
  content: string;
  className?: string;
}

/** 从 Markdown 提取标题 */
function extractHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = markdown.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)/);
    if (match) {
      const level = (match[1] ?? '#').length;
      const text = (match[2] ?? '').replace(/[*_`\[\]]/g, '').trim();
      const id = slugify(text);
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export function TableOfContents({ content, className }: TableOfContentsProps) {
  const headings = extractHeadings(content);
  const [activeId, setActiveId] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    // 延迟初始化，等待 Markdown 渲染完成
    const timer = setTimeout(() => {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
            }
          }
        },
        { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
      );

      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el) observerRef.current.observe(el);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  if (headings.length < 2) return null;

  return (
    <nav aria-label="目录" className={cn('text-sm', className)}>
      <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
        <List className="w-4 h-4" />
        目录
      </h4>
      <ul className="space-y-1">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={cn(
                'block py-1 px-2 rounded text-muted-foreground hover:text-foreground transition-colors truncate',
                activeId === h.id && 'text-primary font-medium bg-primary/5'
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
