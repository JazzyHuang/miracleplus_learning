'use client';

import { useMemo } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GrowthTreeProps {
  /** 已完成的课程数 */
  completedCourses: number;
  /** 总课程数（默认为 6） */
  totalCourses?: number;
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * AI 认知成长树组件
 *
 * 用于可视化展示课程学习进度
 * - 每完成一门课程，树木生长一层
 * - 完成所有课程后，树木开花结果
 */
export function GrowthTree({
  completedCourses,
  totalCourses = 6,
  showLabel = true,
  className,
  size = 'md',
}: GrowthTreeProps) {
  const progress = Math.min(completedCourses / totalCourses, 1);
  const isComplete = completedCourses >= totalCourses;

  const sizeConfig = useMemo(() => {
    const configs = {
      sm: { width: 120, height: 160, text: 'text-xs' },
      md: { width: 160, height: 200, text: 'text-sm' },
      lg: { width: 200, height: 250, text: 'text-base' },
    };
    return configs[size];
  }, [size]);

  const treeState = useMemo(() => {
    if (completedCourses === 0) return 'seed';
    if (completedCourses <= 1) return 'sprout';
    if (completedCourses <= 2) return 'sapling';
    if (completedCourses <= 4) return 'young';
    if (completedCourses < totalCourses) return 'mature';
    return 'blooming';
  }, [completedCourses, totalCourses]);

  // 主题感知颜色
  const colors = {
    trunk: 'var(--color-muted-foreground)',
    leaves: isComplete ? 'var(--color-success)' : 'hsl(var(--primary))',
    flowers: 'hsl(var(--brand-secondary, 280 50% 65%))',
    fruits: 'hsl(35 80% 55%)',
    ground: 'var(--color-muted-foreground)',
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {showLabel && (
        <div className="text-center mb-4">
          <h3 className={cn('font-semibold', sizeConfig.text)}>AI 认知成长树</h3>
          <p className={cn('text-muted-foreground', sizeConfig.text)}>
            {completedCourses}/{totalCourses} 门课程
          </p>
        </div>
      )}

      <svg
        width={sizeConfig.width}
        height={sizeConfig.height}
        viewBox="0 0 100 125"
        className="overflow-visible"
      >
        {/* 地面 — 有机弧线 */}
        <m.path
          d="M10,118 Q30,124 50,122 Q70,120 90,118"
          fill="none"
          stroke={colors.ground}
          strokeWidth="1.5"
          opacity="0.25"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* 树干 — 三次贝塞尔曲线 */}
        <m.path
          d={getTrunkPath(treeState)}
          fill={colors.trunk}
          fillOpacity={0.5}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* 树枝（young 及以上） */}
        {getBranches(treeState).map((branch, i) => (
          <m.path
            key={`branch-${i}`}
            d={branch.d}
            fill="none"
            stroke={colors.trunk}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity={0.4}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.4 + i * 0.15, duration: 0.6 }}
          />
        ))}

        {/* 树叶 — 有机 path 替代 ellipse */}
        {getLeafClusters(treeState, progress).map((leaf, index) => (
          <m.path
            key={`leaf-${index}`}
            d={leaf.d}
            fill={colors.leaves}
            fillOpacity={leaf.opacity}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: leaf.opacity }}
            transition={{
              delay: 0.3 + index * 0.12,
              type: 'spring',
              stiffness: 180,
              damping: 18,
            }}
            style={{ transformOrigin: `${leaf.cx}px ${leaf.cy}px` }}
          />
        ))}

        {/* 花朵 — 五瓣花形 */}
        {isComplete && getFlowerPositions().map((pos, i) => (
          <m.g
            key={`flower-${i}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1 + i * 0.1, type: 'spring', stiffness: 300 }}
            style={{ transformOrigin: `${pos.cx}px ${pos.cy}px` }}
          >
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx={pos.cx + Math.cos((angle * Math.PI) / 180) * 3.5}
                cy={pos.cy + Math.sin((angle * Math.PI) / 180) * 3.5}
                rx="2.5"
                ry="1.5"
                fill={colors.flowers}
                transform={`rotate(${angle} ${pos.cx + Math.cos((angle * Math.PI) / 180) * 3.5} ${pos.cy + Math.sin((angle * Math.PI) / 180) * 3.5})`}
              />
            ))}
            <circle cx={pos.cx} cy={pos.cy} r="2" fill={colors.fruits} />
          </m.g>
        ))}

        {/* 果实 — 水滴形 */}
        {isComplete && getFruitPositions().map((pos, i) => (
          <m.path
            key={`fruit-${i}`}
            d={`M${pos.cx},${pos.cy - 3} Q${pos.cx + 3},${pos.cy} ${pos.cx},${pos.cy + 4} Q${pos.cx - 3},${pos.cy} ${pos.cx},${pos.cy - 3}Z`}
            fill={colors.fruits}
            initial={{ scale: 0, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 1.5 + i * 0.12, type: 'spring', stiffness: 200 }}
            style={{ transformOrigin: `${pos.cx}px ${pos.cy}px` }}
          />
        ))}

        {/* 种子 */}
        {treeState === 'seed' && (
          <m.path
            d="M44,112 Q50,106 56,112 Q50,116 44,112Z"
            fill={colors.trunk}
            fillOpacity={0.6}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
            style={{ transformOrigin: '50px 112px' }}
          />
        )}
      </svg>

      <m.p
        className={cn(
          'mt-4 font-medium',
          sizeConfig.text,
          isComplete ? 'text-amber-500' : 'text-primary'
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {getTreeMessage(treeState, isComplete)}
      </m.p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 树干路径 — 三次贝塞尔曲线，带自然弯曲
// ---------------------------------------------------------------------------
function getTrunkPath(state: string): string {
  switch (state) {
    case 'seed':
      return '';
    case 'sprout':
      return 'M48,120 C48,115 49,108 50,105 C51,108 52,115 52,120Z';
    case 'sapling':
      return 'M47,120 C47,108 48,95 50,85 C52,95 53,108 53,120Z';
    case 'young':
      return 'M45,120 C45,105 47,88 50,72 C53,88 55,105 55,120Z';
    case 'mature':
    case 'blooming':
      return 'M43,120 C43,100 46,82 50,65 C54,82 57,100 57,120Z';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// 树枝 — 从树干分叉出的曲线
// ---------------------------------------------------------------------------
function getBranches(state: string): Array<{ d: string }> {
  if (state === 'seed' || state === 'sprout' || state === 'sapling') return [];
  const branches: Array<{ d: string }> = [];
  if (state === 'young' || state === 'mature' || state === 'blooming') {
    branches.push({ d: 'M49,85 Q38,78 30,75' });
    branches.push({ d: 'M51,85 Q62,78 70,75' });
    branches.push({ d: 'M49,78 Q40,68 35,62' });
    branches.push({ d: 'M51,78 Q60,68 65,62' });
  }
  if (state === 'mature' || state === 'blooming') {
    branches.push({ d: 'M50,72 Q42,58 38,50' });
    branches.push({ d: 'M50,72 Q58,58 62,50' });
  }
  return branches;
}

// ---------------------------------------------------------------------------
// 树叶簇 — 有机 path 替代 ellipse
// ---------------------------------------------------------------------------
function getLeafClusters(
  state: string,
  progress: number
): Array<{ d: string; cx: number; cy: number; opacity: number }> {
  if (state === 'seed' || state === 'sprout') return [];
  const clusters: Array<{ d: string; cx: number; cy: number; opacity: number }> = [];

  if (progress >= 0.17) {
    clusters.push({
      d: 'M30,78 Q38,66 50,72 Q62,66 70,78 Q60,84 50,82 Q40,84 30,78Z',
      cx: 50, cy: 75, opacity: 0.85,
    });
  }
  if (progress >= 0.33) {
    clusters.push({
      d: 'M25,65 Q35,50 50,58 Q65,50 75,65 Q62,72 50,70 Q38,72 25,65Z',
      cx: 50, cy: 62, opacity: 0.9,
    });
  }
  if (progress >= 0.5) {
    clusters.push({
      d: 'M28,52 Q38,38 50,45 Q62,38 72,52 Q60,58 50,56 Q40,58 28,52Z',
      cx: 50, cy: 48, opacity: 0.85,
    });
  }
  if (progress >= 0.67) {
    clusters.push({
      d: 'M32,40 Q40,28 50,34 Q60,28 68,40 Q58,46 50,44 Q42,46 32,40Z',
      cx: 50, cy: 37, opacity: 0.8,
    });
  }
  if (progress >= 0.83) {
    clusters.push({
      d: 'M38,30 Q44,20 50,25 Q56,20 62,30 Q56,34 50,33 Q44,34 38,30Z',
      cx: 50, cy: 27, opacity: 0.75,
    });
  }
  return clusters;
}

function getFlowerPositions() {
  return [
    { cx: 33, cy: 38 },
    { cx: 67, cy: 38 },
    { cx: 50, cy: 24 },
    { cx: 38, cy: 52 },
    { cx: 62, cy: 52 },
  ];
}

function getFruitPositions() {
  return [
    { cx: 28, cy: 58 },
    { cx: 72, cy: 58 },
    { cx: 50, cy: 46 },
  ];
}

function getTreeMessage(state: string, isComplete: boolean): string {
  if (isComplete) return '🎉 知识之树已开花结果！';
  switch (state) {
    case 'seed': return '🌱 播下学习的种子';
    case 'sprout': return '🌿 知识的嫩芽正在萌发';
    case 'sapling': return '🌳 小树正在茁壮成长';
    case 'young': return '🌲 知识之树渐渐丰满';
    case 'mature': return '🌴 即将迎来丰收！';
    default: return '开始你的学习之旅';
  }
}
