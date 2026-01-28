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

  // 根据进度计算树的状态
  const treeState = useMemo(() => {
    if (completedCourses === 0) return 'seed';
    if (completedCourses <= 1) return 'sprout';
    if (completedCourses <= 2) return 'sapling';
    if (completedCourses <= 4) return 'young';
    if (completedCourses < totalCourses) return 'mature';
    return 'blooming';
  }, [completedCourses, totalCourses]);

  // 树的颜色
  const treeColors = {
    trunk: '#8B4513',
    leaves: isComplete ? '#22c55e' : '#4ade80',
    flowers: '#f472b6',
    fruits: '#eab308',
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

      {/* SVG 树 */}
      <svg
        width={sizeConfig.width}
        height={sizeConfig.height}
        viewBox="0 0 100 125"
        className="overflow-visible"
      >
        {/* 地面 */}
        <ellipse
          cx="50"
          cy="120"
          rx="40"
          ry="5"
          fill="#8B7355"
          opacity="0.3"
        />

        {/* 树干 */}
        <m.path
          d={getTrunkPath(treeState)}
          fill={treeColors.trunk}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* 树叶层级 */}
        {getLeafLayers(treeState, progress).map((layer, index) => (
          <m.ellipse
            key={index}
            cx={layer.cx}
            cy={layer.cy}
            rx={layer.rx}
            ry={layer.ry}
            fill={treeColors.leaves}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: layer.opacity }}
            transition={{
              delay: 0.2 + index * 0.15,
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
          />
        ))}

        {/* 花朵（完成状态） */}
        {isComplete && (
          <>
            {[
              { cx: 35, cy: 35 },
              { cx: 65, cy: 35 },
              { cx: 50, cy: 25 },
              { cx: 40, cy: 50 },
              { cx: 60, cy: 50 },
            ].map((pos, i) => (
              <m.circle
                key={`flower-${i}`}
                cx={pos.cx}
                cy={pos.cy}
                r="5"
                fill={treeColors.flowers}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 1 + i * 0.1,
                  type: 'spring',
                  stiffness: 300,
                }}
              />
            ))}
            {/* 果实 */}
            {[
              { cx: 30, cy: 55 },
              { cx: 70, cy: 55 },
              { cx: 50, cy: 45 },
            ].map((pos, i) => (
              <m.circle
                key={`fruit-${i}`}
                cx={pos.cx}
                cy={pos.cy}
                r="4"
                fill={treeColors.fruits}
                initial={{ scale: 0, y: -10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{
                  delay: 1.5 + i * 0.1,
                  type: 'spring',
                  stiffness: 200,
                }}
              />
            ))}
          </>
        )}

        {/* 种子（初始状态） */}
        {treeState === 'seed' && (
          <m.ellipse
            cx="50"
            cy="110"
            rx="8"
            ry="5"
            fill="#8B4513"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
          />
        )}
      </svg>

      {/* 进度文字 */}
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

/**
 * 获取树干路径
 */
function getTrunkPath(state: string): string {
  switch (state) {
    case 'seed':
      return '';
    case 'sprout':
      return 'M48,120 Q50,110 50,105 Q50,100 52,120';
    case 'sapling':
      return 'M47,120 Q48,100 50,85 Q52,100 53,120';
    case 'young':
      return 'M45,120 Q47,95 50,75 Q53,95 55,120';
    case 'mature':
    case 'blooming':
      return 'M43,120 Q45,90 50,65 Q55,90 57,120';
    default:
      return '';
  }
}

/**
 * 获取树叶层级配置
 */
function getLeafLayers(
  state: string,
  progress: number
): Array<{ cx: number; cy: number; rx: number; ry: number; opacity: number }> {
  const layers = [];

  if (state === 'seed' || state === 'sprout') {
    return [];
  }

  // 底层树叶
  if (progress >= 0.17) {
    layers.push({ cx: 50, cy: 75, rx: 20, ry: 12, opacity: 0.9 });
  }

  // 第二层
  if (progress >= 0.33) {
    layers.push({ cx: 50, cy: 60, rx: 25, ry: 15, opacity: 0.95 });
  }

  // 第三层
  if (progress >= 0.5) {
    layers.push({ cx: 50, cy: 45, rx: 22, ry: 13, opacity: 0.9 });
  }

  // 第四层
  if (progress >= 0.67) {
    layers.push({ cx: 50, cy: 35, rx: 18, ry: 11, opacity: 0.85 });
  }

  // 顶层
  if (progress >= 0.83) {
    layers.push({ cx: 50, cy: 25, rx: 12, ry: 8, opacity: 0.8 });
  }

  return layers;
}

/**
 * 获取树的状态描述
 */
function getTreeMessage(state: string, isComplete: boolean): string {
  if (isComplete) {
    return '🎉 知识之树已开花结果！';
  }

  switch (state) {
    case 'seed':
      return '🌱 播下学习的种子';
    case 'sprout':
      return '🌿 知识的嫩芽正在萌发';
    case 'sapling':
      return '🌳 小树正在茁壮成长';
    case 'young':
      return '🌲 知识之树渐渐丰满';
    case 'mature':
      return '🌴 即将迎来丰收！';
    default:
      return '开始你的学习之旅';
  }
}
