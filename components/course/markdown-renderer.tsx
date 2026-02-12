'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypePrettyCode from 'rehype-pretty-code';
import { ExternalLink, Copy, Check, Link as LinkIcon } from 'lucide-react';
import { cn, slugify } from '@/lib/utils';
// 性能优化：用 shiki/rehype-pretty-code 替换 highlight.js（5.43MB→594KB）
// shiki 使用 VSCode TextMate 语法，无需额外 CSS 文件

interface MarkdownRendererProps {
  content: string;
}

// 性能优化：将插件配置和自定义组件提升到模块级别
// 避免每次渲染创建新引用导致 shiki highlighter 重新初始化（阻塞主线程 100-500ms）
const remarkPlugins = [remarkGfm];

// 安全：自定义 sanitize schema，允许代码高亮所需的 className/style
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ['className']],
    span: [...(defaultSchema.attributes?.span || []), ['className', 'style']],
    pre: [...(defaultSchema.attributes?.pre || []), ['className', 'style']],
    div: [...(defaultSchema.attributes?.div || []), ['className', 'style', 'data-language', 'data-theme']],
    figure: [...(defaultSchema.attributes?.figure || []), ['className', 'data-rehype-pretty-code-figure']],
  },
};

// rehype-sanitize runs AFTER rehype-pretty-code to catch any HTML it injects
const rehypePlugins = [
  [rehypePrettyCode, { theme: 'github-dark', keepBackground: true }],
  [rehypeSanitize, sanitizeSchema],
] as Parameters<typeof ReactMarkdown>[0]['rehypePlugins'];

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
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
            // 性能优化：尽可能通过 Next.js 图片代理优化外部图片
            // 仅对完全未知域名使用 unoptimized
            unoptimized={!src.includes('supabase') && !src.includes('unsplash') && !src.includes('cloudinary') && !src.includes('picsum')}
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
        loading="lazy"
        onError={() => setError(true)}
        sizes="(max-width: 768px) 100vw, 800px"
      />
    </div>
  );
}

/**
 * 代码块组件 — 复制按钮 + 语言标签
 */
function CodeBlock({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  // 从 data-language 或子元素 className 提取语言
  const dataLang = (props as Record<string, unknown>)['data-language'] as string | undefined;
  const language = dataLang || '';

  const handleCopy = useCallback(async () => {
    const text = preRef.current?.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="relative group my-4">
      {/* 语言标签 + 复制按钮 */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-secondary/80 rounded-t-xl border-b border-border/30">
        <span className="text-xs text-muted-foreground font-mono uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
          aria-label="复制代码"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-success" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      <pre
        ref={preRef}
        className="bg-secondary text-foreground rounded-b-xl rounded-t-none p-4 overflow-x-auto shadow-lg"
        {...props}
      >
        {children}
      </pre>
    </div>
  );
}

/**
 * 标题组件 — 带锚点链接
 */
function HeadingWithAnchor({
  level,
  className,
  children,
}: {
  level: 1 | 2 | 3 | 4;
  className: string;
  children: React.ReactNode;
}) {
  const text = typeof children === 'string' ? children : '';
  const id = slugify(text);
  const Tag = `h${level}` as const;

  return (
    <Tag id={id} className={cn(className, 'group relative scroll-mt-20')}>
      {children}
      {id && (
        <a
          href={`#${id}`}
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
          aria-label={`链接到 ${text}`}
        >
          <LinkIcon className="w-4 h-4 inline" />
        </a>
      )}
    </Tag>
  );
}

// Module-level components object — stable reference avoids ReactMarkdown internal re-diffs
const markdownComponents: Parameters<typeof ReactMarkdown>[0]['components'] = {
  // Custom heading styles with anchor links
  h1: ({ children }) => (
    <HeadingWithAnchor level={1} className="text-3xl font-bold mt-8 mb-4 pb-2 border-b">{children}</HeadingWithAnchor>
  ),
  h2: ({ children }) => (
    <HeadingWithAnchor level={2} className="text-2xl font-bold mt-8 mb-4">{children}</HeadingWithAnchor>
  ),
  h3: ({ children }) => (
    <HeadingWithAnchor level={3} className="text-xl font-semibold mt-6 mb-3">{children}</HeadingWithAnchor>
  ),
  h4: ({ children }) => (
    <HeadingWithAnchor level={4} className="text-lg font-semibold mt-4 mb-2">{children}</HeadingWithAnchor>
  ),
  // Custom paragraph styles
  p: ({ children }) => (
    <p className="my-4 leading-7 text-foreground/90">{children}</p>
  ),
  // Custom link styles - external links open in new tab
  // Security: Validate URL protocol to prevent javascript:/data: XSS
  a: ({ href, children }) => {
    let safeHref = href;
    let isExternal = false;

    if (href) {
      try {
        const url = new URL(href, 'https://placeholder.local');
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          isExternal = !url.hostname.endsWith('placeholder.local');
          safeHref = href;
        } else {
          // Block dangerous protocols (javascript:, data:, vbscript:, etc.)
          safeHref = '#';
        }
      } catch {
        // Relative paths are allowed
        safeHref = href.startsWith('/') ? href : '#';
      }
    }

    return (
      <a
        href={safeHref}
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
  // Custom code block with copy button and language label
  pre: ({ children, ...props }) => (
    <CodeBlock {...props}>{children}</CodeBlock>
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
  // Custom blockquote styles — brand accent left border
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground bg-primary/[0.05] py-3 rounded-r-lg">
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
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
