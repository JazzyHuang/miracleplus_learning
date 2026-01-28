'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 简化的 Tooltip 组件
 * 使用原生 CSS 实现，不依赖 Radix UI
 */

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
}

const TooltipContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  delayDuration: number;
}>({
  open: false,
  setOpen: () => {},
  delayDuration: 200,
});

export function TooltipProvider({
  children,
  delayDuration = 200,
}: TooltipProviderProps) {
  return (
    <TooltipContext.Provider value={{ open: false, setOpen: () => {}, delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function Tooltip({ children }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const { delayDuration } = React.useContext(TooltipContext);

  return (
    <TooltipContext.Provider value={{ open, setOpen, delayDuration }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
  const { setOpen, delayDuration } = React.useContext(TooltipContext);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, delayDuration);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onMouseEnter?: () => void; onMouseLeave?: () => void }>, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    });
  }

  return (
    <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
    </span>
  );
}

export function TooltipContent({
  children,
  className,
  side = 'top',
  sideOffset = 4,
}: TooltipContentProps) {
  const { open } = React.useContext(TooltipContext);

  if (!open) return null;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={cn(
        'absolute z-50 px-3 py-1.5 text-sm rounded-md shadow-md',
        'bg-popover text-popover-foreground border',
        'animate-in fade-in-0 zoom-in-95',
        positionClasses[side],
        className
      )}
      style={{ marginTop: side === 'bottom' ? sideOffset : undefined, marginBottom: side === 'top' ? sideOffset : undefined }}
    >
      {children}
    </div>
  );
}
