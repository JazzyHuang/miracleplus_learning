/**
 * 性能监控工具
 * 
 * 用于监控和上报核心 Web Vitals 指标
 * 
 * Phase 7: 性能监控基础设施
 */

/** Web Vitals 指标类型 */
export type MetricName = 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';

/** Web Vitals 指标 */
export interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

/** 性能上报回调 */
export type ReportCallback = (metric: WebVitalMetric) => void;

/**
 * Core Web Vitals 阈值
 * 参考: https://web.dev/vitals/
 */
export const WEB_VITALS_THRESHOLDS = {
  // Largest Contentful Paint
  LCP: {
    good: 2500, // ≤2.5s
    poor: 4000, // >4s
  },
  // First Input Delay (已弃用，被 INP 取代)
  FID: {
    good: 100, // ≤100ms
    poor: 300, // >300ms
  },
  // Cumulative Layout Shift
  CLS: {
    good: 0.1, // ≤0.1
    poor: 0.25, // >0.25
  },
  // First Contentful Paint
  FCP: {
    good: 1800, // ≤1.8s
    poor: 3000, // >3s
  },
  // Time to First Byte
  TTFB: {
    good: 800, // ≤800ms
    poor: 1800, // >1.8s
  },
  // Interaction to Next Paint (替代 FID)
  INP: {
    good: 200, // ≤200ms
    poor: 500, // >500ms
  },
} as const;

/**
 * 获取指标评级
 */
export function getMetricRating(
  name: MetricName,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value > thresholds.poor) return 'poor';
  return 'needs-improvement';
}

/**
 * 格式化指标值为可读格式
 */
export function formatMetricValue(name: MetricName, value: number): string {
  switch (name) {
    case 'CLS':
      return value.toFixed(3);
    case 'LCP':
    case 'FCP':
    case 'TTFB':
    case 'FID':
    case 'INP':
      return `${Math.round(value)}ms`;
    default:
      return String(value);
  }
}

/**
 * 上报 Web Vitals 到控制台（开发环境）
 */
export function reportToConsole(metric: WebVitalMetric): void {
  const ratingEmoji = {
    good: '✅',
    'needs-improvement': '⚠️',
    poor: '❌',
  };

  console.log(
    `${ratingEmoji[metric.rating]} ${metric.name}: ${formatMetricValue(
      metric.name,
      metric.value
    )} (${metric.rating})`
  );
}

/**
 * 上报 Web Vitals 到分析服务
 * 
 * @example
 * // 集成 Google Analytics
 * reportToAnalytics(metric, (m) => {
 *   gtag('event', m.name, {
 *     value: Math.round(m.value),
 *     event_category: 'Web Vitals',
 *     event_label: m.id,
 *     non_interaction: true,
 *   });
 * });
 */
export function reportToAnalytics(
  metric: WebVitalMetric,
  sendToAnalytics: (metric: WebVitalMetric) => void
): void {
  sendToAnalytics(metric);
}

/**
 * 上报 Web Vitals 到自定义端点
 */
export async function reportToEndpoint(
  metric: WebVitalMetric,
  endpoint: string
): Promise<void> {
  // 使用 sendBeacon 以确保页面卸载时仍能发送
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(
      endpoint,
      JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : '',
      })
    );
  } else {
    // Fallback to fetch
    try {
      await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(metric),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to report metric:', error);
    }
  }
}

/**
 * 创建性能观察器
 * 用于监控长任务（Long Tasks）
 */
export function observeLongTasks(
  callback: (duration: number, startTime: number) => void
): (() => void) | null {
  if (typeof PerformanceObserver === 'undefined') {
    return null;
  }

  try {
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        callback(entry.duration, entry.startTime);
      }
    });

    observer.observe({ type: 'longtask', buffered: true });

    return () => observer.disconnect();
  } catch {
    return null;
  }
}

/**
 * 监控首屏资源加载时间
 */
export function getResourceLoadingStats(): {
  totalResources: number;
  totalSize: number;
  slowResources: { name: string; duration: number }[];
} {
  if (typeof performance === 'undefined') {
    return { totalResources: 0, totalSize: 0, slowResources: [] };
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const slowThreshold = 1000; // 1秒

  return {
    totalResources: resources.length,
    totalSize: resources.reduce((acc, r) => acc + (r.transferSize || 0), 0),
    slowResources: resources
      .filter((r) => r.duration > slowThreshold)
      .map((r) => ({ name: r.name, duration: Math.round(r.duration) }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10),
  };
}
