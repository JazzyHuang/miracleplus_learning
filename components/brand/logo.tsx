import { cn } from '@/lib/utils';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg';
type LogoVariant = 'color' | 'mono';

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
}

const sizeMap: Record<LogoSize, number> = {
  xs: 16,
  sm: 20,
  md: 32,
  lg: 64,
};

/**
 * MiraclePlus 品牌 Logo 图标
 *
 * 9 根高低不同的竖条排列成抽象 "M" 形态。
 * - variant="color" → 品牌 indigo（hsl(var(--primary))）
 * - variant="mono"  → currentColor（白色用于深色容器）
 */
export function Logo({ size = 'sm', variant = 'color', className }: LogoProps) {
  const px = sizeMap[size];
  const fill = variant === 'color' ? 'hsl(var(--primary))' : 'currentColor';

  // 9 bars: x positions and heights within a 100×100 viewBox
  // Bar width = 8, gap = 3, total width = 9*8 + 8*3 = 96 ≈ centered in 100
  // Heights are proportional to the MiraclePlus logo "M" shape
  const bars: Array<{ x: number; h: number }> = [
    { x: 2, h: 92 },   // bar 1 — tallest (left pillar of M)
    { x: 13, h: 92 },  // bar 2 — tallest
    { x: 24, h: 52 },  // bar 3 — medium-short (inner valley)
    { x: 35, h: 60 },  // bar 4 — medium
    { x: 46, h: 42 },  // bar 5 — shortest (center dip)
    { x: 57, h: 55 },  // bar 6 — medium
    { x: 68, h: 65 },  // bar 7 — medium-tall
    { x: 79, h: 78 },  // bar 8 — tall
    { x: 90, h: 92 },  // bar 9 — tallest (right pillar of M)
  ];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={100 - bar.h}
          width={8}
          height={bar.h}
          rx={1}
          fill={fill}
        />
      ))}
    </svg>
  );
}
