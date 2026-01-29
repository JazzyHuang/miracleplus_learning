'use client';

import { useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ExternalLink } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
}

/**
 * 优化的图片组件，使用 next/image
 * 支持自动检测图片尺寸和错误处理
 */
function OptimizedImage({ src, alt }: { src?: string; alt?: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || error) {
    return (
      <div className="rounded-xl my-4 bg-muted flex items-center justify-center h-48">
        <span className="text-muted-foreground text-sm">图片加载失败</span>
      </div>
    );
  }

  // 检查是否为外部图片
  const isExternal = src.startsWith('http://') || src.startsWith('https://');
  
  // 对于外部图片，使用 fill 模式
  if (isExternal) {
    return (
      <div className="relative my-4 rounded-xl overflow-hidden shadow-lg">
        <div className={`relative w-full ${!loaded ? 'min-h-48 bg-muted animate-pulse' : ''}`}>
          <Image
            src={src}
            alt={alt || '图片'}
            width={800}
            height={450}
            className="rounded-xl shadow-lg w-full h-auto object-cover"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
            unoptimized={!src.includes('supabase') && !src.includes('unsplash') && !src.includes('cloudinary')}
          />
        </div>
      </div>
    );
  }

  // 对于相对路径图片
  return (
    <div className="relative my-4 rounded-xl overflow-hidden shadow-lg">
      <Image
        src={src}
        alt={alt || '图片'}
        width={800}
        height={450}
        className="rounded-xl shadow-lg w-full h-auto"
        onError={() => setError(true)}
        sizes="(max-width: 768px) 100vw, 800px"
      />
    </div>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom heading styles
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mt-8 mb-4 pb-2 border-b">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold mt-8 mb-4">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mt-6 mb-3">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold mt-4 mb-2">{children}</h4>
          ),
          // Custom paragraph styles
          p: ({ children }) => (
            <p className="my-4 leading-7 text-foreground/90">{children}</p>
          ),
          // Custom link styles - external links open in new tab
          a: ({ href, children }) => {
            const isExternal = href?.startsWith('http');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-primary hover:text-primary/80 underline underline-offset-4 inline-flex items-center gap-1 transition-colors"
              >
                {children}
                {isExternal && <ExternalLink className="w-3 h-3" />}
              </a>
            );
          },
          // Custom code block styles
          pre: ({ children }) => (
            <pre className="bg-slate-900 text-slate-50 rounded-xl p-4 overflow-x-auto my-4 shadow-lg">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Custom list styles
          ul: ({ children }) => (
            <ul className="my-4 ml-6 list-disc space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 list-decimal space-y-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),
          // Custom blockquote styles
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r-lg">
              {children}
            </blockquote>
          ),
          // Custom table styles
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b px-4 py-3 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b px-4 py-3">{children}</td>
          ),
          // Custom hr style
          hr: () => <hr className="my-8 border-muted" />,
          // Custom image styles - 使用优化的 next/image
          img: ({ src, alt }) => <OptimizedImage src={typeof src === 'string' ? src : undefined} alt={alt} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
