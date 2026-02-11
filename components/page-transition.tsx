/**
 * Page Transition - 轻量级页面过渡
 * 
 * 性能优化：
 * - 移除 framer-motion AnimatePresence mode="wait"（消除 ~200ms 阻塞）
 * - 使用纯 CSS animation 实现入场过渡（0 KB JS 开销）
 * - Next.js 16 的 viewTransition 配置已在 next.config.ts 中启用，
 *   提供原生浏览器级别的页面间过渡动画
 * 
 * 之前：AnimatePresence mode="wait" 会等待退出动画完成后才渲染新页面
 * 现在：新页面立即渲染，仅用 CSS opacity 过渡实现平滑感知
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in duration-150 ease-out">
      {children}
    </div>
  );
}
