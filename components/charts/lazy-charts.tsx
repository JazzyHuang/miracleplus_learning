/**
 * 轻量级图表组件 - 使用动态导入减少 Bundle 大小
 *
 * recharts 约 200KB，通过 recharts-bundle.tsx 统一导出后单次加载
 * 仅在需要时加载，主要用于管理后台
 *
 * 注意: 这里使用 any 是因为 recharts 组件的完整类型定义非常复杂，
 * 使用动态导入时 TypeScript 难以准确推断。这是一个合理的权衡。
 */

'use client';

import dynamic from 'next/dynamic';

type ChartComponent = React.ComponentType<any>;

const mod = () => import('./recharts-bundle');

export const AreaChart: ChartComponent = dynamic(
  () => mod().then(m => ({ default: m.AreaChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
export const Area: ChartComponent = dynamic(() => mod().then(m => ({ default: m.Area })), { ssr: false });
export const BarChart: ChartComponent = dynamic(
  () => mod().then(m => ({ default: m.BarChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
export const Bar: ChartComponent = dynamic(() => mod().then(m => ({ default: m.Bar })), { ssr: false });
export const LineChart: ChartComponent = dynamic(
  () => mod().then(m => ({ default: m.LineChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded" /> }
);
export const Line: ChartComponent = dynamic(() => mod().then(m => ({ default: m.Line })), { ssr: false });
export const XAxis: ChartComponent = dynamic(() => mod().then(m => ({ default: m.XAxis })), { ssr: false });
export const YAxis: ChartComponent = dynamic(() => mod().then(m => ({ default: m.YAxis })), { ssr: false });
export const Tooltip: ChartComponent = dynamic(() => mod().then(m => ({ default: m.Tooltip })), { ssr: false });
export const ResponsiveContainer: ChartComponent = dynamic(() => mod().then(m => ({ default: m.ResponsiveContainer })), { ssr: false });
export const PieChart: ChartComponent = dynamic(
  () => mod().then(m => ({ default: m.PieChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded-full" /> }
);
export const Pie: ChartComponent = dynamic(() => mod().then(m => ({ default: m.Pie })), { ssr: false });
export const Cell: ChartComponent = dynamic(() => mod().then(m => ({ default: m.Cell })), { ssr: false });
export const Legend: ChartComponent = dynamic(() => mod().then(m => ({ default: m.Legend })), { ssr: false });
export const CartesianGrid: ChartComponent = dynamic(() => mod().then(m => ({ default: m.CartesianGrid })), { ssr: false });
export const RadarChart: ChartComponent = dynamic(
  () => mod().then(m => ({ default: m.RadarChart })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded-full" /> }
);
export const Radar: ChartComponent = dynamic(() => mod().then(m => ({ default: m.Radar })), { ssr: false });
export const PolarGrid: ChartComponent = dynamic(() => mod().then(m => ({ default: m.PolarGrid })), { ssr: false });
export const PolarAngleAxis: ChartComponent = dynamic(() => mod().then(m => ({ default: m.PolarAngleAxis })), { ssr: false });
export const PolarRadiusAxis: ChartComponent = dynamic(() => mod().then(m => ({ default: m.PolarRadiusAxis })), { ssr: false });
export const Brush: ChartComponent = dynamic(() => mod().then(m => ({ default: m.Brush })), { ssr: false });
