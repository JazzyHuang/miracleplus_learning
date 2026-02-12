/**
 * 轻量级图表组件 - 使用动态导入减少 Bundle 大小
 *
 * recharts 约 200KB，仅在需要时加载
 * 这些组件主要用于管理后台，使用频率不高
 *
 * 注意: 这里使用 any 是因为 recharts 组件的完整类型定义非常复杂，
 * 使用动态导入时 TypeScript 难以准确推断。这是一个合理的权衡。
 */

'use client';

import dynamic from 'next/dynamic';

// 定义图表组件类型 - 使用 any 因为完整的 recharts 类型非常复杂
type ChartComponent = React.ComponentType<any>;

/**
 * 动态导入 AreaChart
 * 仅在组件渲染时加载 recharts
 */
export const AreaChart: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-muted rounded" />,
  }
);

export const Area: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Area })),
  { ssr: false }
);

/**
 * 动态导入 BarChart
 */
export const BarChart: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-muted rounded" />,
  }
);

export const Bar: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Bar })),
  { ssr: false }
);

/**
 * 动态导入 LineChart
 */
export const LineChart: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-muted rounded" />,
  }
);

export const Line: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Line })),
  { ssr: false }
);

/**
 * 动态导入图表组件
 */
export const XAxis: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.XAxis })),
  { ssr: false }
);

export const YAxis: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.YAxis })),
  { ssr: false }
);

export const Tooltip: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Tooltip })),
  { ssr: false }
);

export const ResponsiveContainer: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  { ssr: false }
);

export const PieChart: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-muted rounded-full" />,
  }
);

export const Pie: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Pie })),
  { ssr: false }
);

export const Cell: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Cell })),
  { ssr: false }
);

export const Legend: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Legend })),
  { ssr: false }
);

export const CartesianGrid: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.CartesianGrid })),
  { ssr: false }
);

/**
 * 动态导入 RadarChart（用于个人报告）
 */
export const RadarChart: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.RadarChart })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-muted rounded-full" />,
  }
);

export const Radar: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Radar })),
  { ssr: false }
);

export const PolarGrid: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PolarGrid })),
  { ssr: false }
);

export const PolarAngleAxis: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PolarAngleAxis })),
  { ssr: false }
);

export const PolarRadiusAxis: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PolarRadiusAxis })),
  { ssr: false }
);

export const Brush: ChartComponent = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Brush })),
  { ssr: false }
);
