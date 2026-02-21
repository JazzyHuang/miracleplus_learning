'use client';

import * as React from 'react';
import {
  Maximize2,
  Minimize2,
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Type,
  Link as LinkIcon,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { MarkdownRenderer } from '@/components/course/markdown-renderer';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
  showPreview?: boolean;
}

/**
 * Markdown 编辑器组件
 *
 * 功能：
 * - 实时预览
 * - 工具栏插入语法
 * - 全屏编辑
 * - 支持所有 Markdown 语法
 *
 * @example
 * ```tsx
 * <MarkdownEditor
 *   value={content}
 *   onChange={setContent}
 *   placeholder="支持 Markdown 语法..."
 *   minHeight="400px"
 * />
 * ```
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder = '支持 Markdown 语法...',
  minHeight = '400px',
  readOnly = false,
  showPreview = true,
}: MarkdownEditorProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'edit' | 'preview' | 'split'>('split');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (syntax: string, placeholderText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value;
    const before = text.substring(0, start);
    const after = text.substring(end);

    let insertion = syntax;
    let cursorOffset = syntax.length;

    if (placeholderText) {
      insertion = syntax.replace(placeholderText, '');
      cursorOffset = syntax.indexOf(placeholderText);
    }

    const newText = before + insertion + after;
    onChange(newText);

    // 恢复焦点并设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  };

  const toolbarActions = [
    {
      icon: Type,
      label: '标题',
      action: () => insertMarkdown('## 标题\n', '标题'),
    },
    {
      icon: Bold,
      label: '粗体',
      action: () => insertMarkdown('**粗体文本**', '粗体文本'),
    },
    {
      icon: Italic,
      label: '斜体',
      action: () => insertMarkdown('*斜体文本*', '斜体文本'),
    },
    {
      icon: Code,
      label: '代码块',
      action: () => insertMarkdown('\n```\n代码\n```\n'),
    },
    {
      icon: LinkIcon,
      label: '链接',
      action: () => insertMarkdown('[链接文字](https://example.com)', '链接文字'),
    },
    {
      icon: Quote,
      label: '引用',
      action: () => insertMarkdown('> 引用内容\n'),
    },
    {
      icon: List,
      label: '无序列表',
      action: () => insertMarkdown('\n- 列表项\n- 列表项\n'),
    },
    {
      icon: ListOrdered,
      label: '有序列表',
      action: () => insertMarkdown('\n1. 列表项\n2. 列表项\n'),
    },
  ];

  // Keyboard shortcuts for common Markdown formatting
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    switch (e.key) {
      case 'b':
        e.preventDefault();
        insertMarkdown('**粗体文本**', '粗体文本');
        break;
      case 'i':
        e.preventDefault();
        insertMarkdown('*斜体文本*', '斜体文本');
        break;
      case 'k':
        e.preventDefault();
        insertMarkdown('[链接文字](https://example.com)', '链接文字');
        break;
      case '`':
        e.preventDefault();
        insertMarkdown('\n```\n代码\n```\n');
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Shared textarea props
  const textareaProps = {
    ref: textareaRef,
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    onKeyDown: handleKeyDown,
    placeholder,
    readOnly,
    className: 'min-h-[400px] border-0 rounded-none resize-none font-mono text-sm focus-visible:ring-0',
  } as const;

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all',
        isFullscreen && 'fixed inset-4 z-50 rounded-xl'
      )}
    >
      {/* 工具栏 */}
      {!readOnly && (
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-0.5">
            {toolbarActions.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                size="icon"
                onClick={action.action}
                className="h-8 w-8"
                aria-label={action.label}
              >
                <action.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">{value.length} 字符</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8"
              aria-label={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* 编辑区域 */}
      {showPreview ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview' | 'split')} className="min-h-0">
          <div className="flex items-center justify-between px-3 border-b">
            <TabsList className="h-9">
              <TabsTrigger value="edit">编辑</TabsTrigger>
              <TabsTrigger value="split">分屏</TabsTrigger>
              <TabsTrigger value="preview">预览</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="edit" className="m-0">
            <Textarea
              {...textareaProps}
              style={{
                minHeight: isFullscreen ? 'calc(100vh - 200px)' : minHeight,
              }}
            />
          </TabsContent>
          <TabsContent value="split" className="m-0 grid grid-cols-2 min-h-[400px]">
            <Textarea
              {...textareaProps}
              className="min-h-[400px] border-0 border-r rounded-none resize-none font-mono text-sm focus-visible:ring-0"
              style={{
                minHeight: isFullscreen ? 'calc(100vh - 200px)' : minHeight,
              }}
            />
            <div className="overflow-auto p-4 bg-background">
              <MarkdownRenderer content={value} />
            </div>
          </TabsContent>
          <TabsContent value="preview" className="m-0">
            <div
              className="overflow-auto p-4"
              style={{
                minHeight: isFullscreen ? 'calc(100vh - 200px)' : minHeight,
              }}
            >
              <MarkdownRenderer content={value} />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Textarea
          {...textareaProps}
          style={{
            minHeight: isFullscreen ? 'calc(100vh - 200px)' : minHeight,
          }}
        />
      )}
    </div>
  );
}
