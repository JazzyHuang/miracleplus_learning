import { cn } from '@/lib/utils';

/**
 * WaveDivider — 波浪形有机分隔线（对齐 Google Learn About）
 * 
 * 用于页面区块之间的有机过渡
 */
interface WaveDividerProps {
  /** 翻转波浪方向 */
  flip?: boolean;
  /** 波浪颜色 (CSS 颜色值) */
  color?: string;
  /** 使用 className 覆盖颜色 (通过 text-* 类 + currentColor) */
  className?: string;
  /** 波浪高度 */
  height?: number;
}

export function WaveDivider({ 
  flip = false, 
  color,
  className,
  height = 120,
}: WaveDividerProps) {
  return (
    <div 
      className={cn(
        "w-full overflow-hidden leading-[0]", 
        flip && "rotate-180", 
        className
      )}
      aria-hidden="true"
    >
      <svg 
        viewBox="0 0 1440 120" 
        fill="none" 
        preserveAspectRatio="none" 
        className="w-full block"
        style={{ height }}
      >
        <path 
          d="M0,64 C240,110 480,10 720,64 C960,118 1200,14 1440,64 L1440,120 L0,120 Z" 
          fill={color || "currentColor"} 
        />
      </svg>
    </div>
  );
}

/**
 * WaveDividerSubtle — 更柔和的波浪分隔线
 */
export function WaveDividerSubtle({ 
  flip = false, 
  color,
  className,
  height = 80,
}: WaveDividerProps) {
  return (
    <div 
      className={cn(
        "w-full overflow-hidden leading-[0]", 
        flip && "rotate-180", 
        className
      )}
      aria-hidden="true"
    >
      <svg 
        viewBox="0 0 1440 80" 
        fill="none" 
        preserveAspectRatio="none" 
        className="w-full block"
        style={{ height }}
      >
        <path 
          d="M0,40 C360,70 720,10 1080,40 C1260,55 1380,45 1440,40 L1440,80 L0,80 Z" 
          fill={color || "currentColor"} 
          opacity="0.5"
        />
        <path 
          d="M0,50 C360,75 720,25 1080,50 C1260,60 1380,50 1440,45 L1440,80 L0,80 Z" 
          fill={color || "currentColor"} 
        />
      </svg>
    </div>
  );
}
