'use client';

import { useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypePrettyCode from 'rehype-pretty-code';
import { ExternalLink } from 'lucide-react';
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
        onError={() => setError(true)}
        sizes="(max-width: 768px) 100vw, 800px"
      />
    </div>
  );
}

// Module-level components object — stable reference avoids ReactMarkdown internal re-diffs
const markdownComponents: Parameters<typeof ReactMarkdown>[0]['components'] = {
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
  pre: ({ children }) => (
    <pre className="bg-secondary text-foreground rounded-xl p-4 overflow-x-auto my-4 shadow-lg">
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
