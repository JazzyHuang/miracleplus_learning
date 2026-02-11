'use client';

import { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { useReward } from 'react-rewards';

type CelebrationType = 'confetti' | 'emoji' | 'balloons';

interface CelebrationContextType {
  celebrate: (type?: CelebrationType) => void;
}

export const CelebrationContext = createContext<CelebrationContextType | null>(null);

/**
 * CelebrationEffects — 庆祝动画效果组件（不包裹 children）
 *
 * 渲染 reward 锚点元素并通过 onReady 回调将 celebrate 函数注入父级。
 * 配合 dynamic({ ssr: false }) 使用，不会导致 hydration mismatch。
 */
export function CelebrationEffects({ onReady }: { onReady: (fn: (type?: CelebrationType) => void) => void }) {
  const { reward: confettiReward } = useReward('celebrationConfetti', 'confetti', {
    lifetime: 200,
    elementCount: 80,
    spread: 90,
  });
  const { reward: emojiReward } = useReward('celebrationEmoji', 'emoji', {
    lifetime: 150,
    elementCount: 20,
    emoji: ['⭐', '🎉', '🏆', '✨'],
  });
  const { reward: balloonReward } = useReward('celebrationBalloons', 'balloons', {
    lifetime: 250,
    elementCount: 15,
    spread: 80,
  });

  const confettiRef = useRef(confettiReward);
  const emojiRef = useRef(emojiReward);
  const balloonRef = useRef(balloonReward);
  useEffect(() => {
    confettiRef.current = confettiReward;
    emojiRef.current = emojiReward;
    balloonRef.current = balloonReward;
  });

  const celebrate = useCallback((type: CelebrationType = 'confetti') => {
    switch (type) {
      case 'confetti': confettiRef.current(); break;
      case 'emoji': emojiRef.current(); break;
      case 'balloons': balloonRef.current(); break;
    }
  }, []);

  useEffect(() => { onReady(celebrate); }, [onReady, celebrate]);

  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
      <span id="celebrationConfetti" />
      <span id="celebrationEmoji" />
      <span id="celebrationBalloons" />
    </div>
  );
}

/**
 * Hook to access celebration animations from any component
 */
export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (!context) {
    return { celebrate: () => {} };
  }
  return context;
}
