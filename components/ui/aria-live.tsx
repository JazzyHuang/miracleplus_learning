'use client';

import { useEffect, useState } from 'react';

interface AriaLiveProps {
  /** 消息内容 */
  message: string;
  /** 紧急程度：polite（礼貌等待）或 assertive（立即播报） */
  politeness?: 'polite' | 'assertive';
  /** 是否清除之前的消息再播报新消息 */
  atomic?: boolean;
}

/**
 * ARIA Live 区域组件
 * 用于向屏幕阅读器播报动态变化的内容
 * 
 * @example
 * <AriaLive message={loading ? '正在加载...' : '加载完成'} />
 */
export function AriaLive({
  message,
  politeness = 'polite',
  atomic = true,
}: AriaLiveProps) {
  const [announceMessage, setAnnounceMessage] = useState('');

  // 延迟更新消息以确保屏幕阅读器能检测到变化
  useEffect(() => {
    if (message) {
      // 先清空再设置，确保相同消息也会被播报
      setAnnounceMessage('');
      const timer = setTimeout(() => {
        setAnnounceMessage(message);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {announceMessage}
    </div>
  );
}

/**
 * 用于表单错误播报的 ARIA Live 区域
 */
export function FormErrorLive({ errors }: { errors?: Record<string, string> }) {
  const errorMessages = errors 
    ? Object.values(errors).filter(Boolean).join(', ')
    : '';

  return (
    <AriaLive
      message={errorMessages ? `表单错误: ${errorMessages}` : ''}
      politeness="assertive"
    />
  );
}

/**
 * 用于加载状态播报的 ARIA Live 区域
 */
export function LoadingLive({ loading }: { loading: boolean }) {
  return (
    <AriaLive
      message={loading ? '正在加载...' : ''}
      politeness="polite"
    />
  );
}
