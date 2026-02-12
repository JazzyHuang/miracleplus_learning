'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/**
 * Tooltip — 双主题自适应 + Portal渲染 + ESC关闭 + 键盘支持
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
  triggerRef: React.RefObject<HTMLElement | null>;
}>({
  open: false,
  setOpen: () => {},
  delayDuration: 200,
  triggerRef: { current: null },
});

export function TooltipProvider({
  children,
  delayDuration = 200,
}: TooltipProviderProps) {
  return (
    <TooltipContext.Provider value={{ open: false, setOpen: () => {}, delayDuration, triggerRef: { current: null } }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function Tooltip({ children }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const { delayDuration } = React.useContext(TooltipContext);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  // ESC key closes tooltip
  React.useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  return (
    <TooltipContext.Provider value={{ open, setOpen, delayDuration, triggerRef }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
  const { setOpen, delayDuration, triggerRef } = React.useContext(TooltipContext);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const localRef = React.useRef<HTMLElement | null>(null);

  const handleOpen = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, delayDuration);
  };

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setOpen(false);
  };

  const setRefs = React.useCallback((node: HTMLElement | null) => {
    localRef.current = node;
    if (triggerRef && typeof triggerRef === 'object' && 'current' in triggerRef) {
      // Use Object.assign to avoid direct mutation of readonly ref
      Object.assign(triggerRef, { current: node });
    }
  }, [triggerRef]);

  const eventHandlers = {
    onMouseEnter: handleOpen,
    onMouseLeave: handleClose,
    onFocus: handleOpen,
    onBlur: handleClose,
  };

  if (asChild && React.isValidElement<Record<string, unknown>>(children)) {
    // eslint-disable-next-line react-hooks/refs
    return React.cloneElement(children, {
      ...eventHandlers,
      ref: setRefs,
    });
  }

  return (
    <span tabIndex={0} ref={setRefs as React.Ref<HTMLSpanElement>} {...eventHandlers}>
      {children}
    </span>
  );
}

export function TooltipContent({
  children,
  className,
  side = 'top',
  sideOffset = 8,
}: TooltipContentProps) {
  const { open, triggerRef } = React.useContext(TooltipContext);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) return;

    const trigger = triggerRef.current;
    const rect = trigger.getBoundingClientRect();
    const content = contentRef.current;
    const tooltipWidth = content.offsetWidth || 200;
    const tooltipHeight = content.offsetHeight || 40;

    const positions = {
      top: { top: rect.top - sideOffset, left: rect.left + rect.width / 2 },
      bottom: { top: rect.bottom + sideOffset, left: rect.left + rect.width / 2 },
      left: { top: rect.top + rect.height / 2, left: rect.left - sideOffset },
      right: { top: rect.top + rect.height / 2, left: rect.right + sideOffset },
    };

    const pos = positions[side];

    // Clamp to viewport using actual tooltip dimensions
    const clampedLeft = Math.max(8, Math.min(pos.left, window.innerWidth - tooltipWidth - 8));
    const clampedTop = Math.max(8, Math.min(pos.top, window.innerHeight - tooltipHeight - 8));
    setPosition({ top: clampedTop, left: clampedLeft });
  }, [open, side, sideOffset, triggerRef]);

  if (!open || !mounted) return null;

  const transformOrigin = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  const tooltipEl = (
    <div
      ref={contentRef}
      role="tooltip"
      className={cn(
        'fixed z-[9999] px-3 py-2 text-sm rounded-lg',
        'bg-popover text-popover-foreground',
        'border border-border',
        'shadow-theme-md',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: transformOrigin[side],
      }}
    >
      {children}
    </div>
  );

  return createPortal(tooltipEl, document.body);
}
