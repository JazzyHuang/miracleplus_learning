'use client';

import Link from 'next/link';

/**
 * 离线回退页面
 * 当用户离线且请求的页面不在缓存中时，Service Worker 会返回此页面
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">网络已断开</h1>
        <p className="text-muted-foreground mb-8">
          当前页面需要网络连接。请检查你的网络设置后重试。
        </p>
        <div className="mb-8 p-4 rounded-lg bg-muted/50 text-left">
          <p className="text-sm font-medium text-foreground mb-2">以下页面可能已缓存，可离线访问：</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><Link href="/dashboard" className="text-primary hover:underline">首页 / 仪表盘</Link></li>
            <li><Link href="/courses" className="text-primary hover:underline">课程列表</Link></li>
            <li><Link href="/leaderboard" className="text-primary hover:underline">排行榜</Link></li>
            <li><Link href="/discussions" className="text-primary hover:underline">讨论区</Link></li>
          </ul>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/80 transition-colors"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}
