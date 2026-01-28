'use client';

import { m } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <m.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full"
      />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50">
      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <m.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </m.div>
        <m.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-muted-foreground font-medium"
        >
          加载中...
        </m.p>
      </m.div>
    </div>
  );
}

export function ContentLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="relative">
          <m.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full"
          />
        </div>
        <p className="text-sm text-muted-foreground">加载中...</p>
      </m.div>
    </div>
  );
}
