import { ImageResponse } from 'next/og';
import { BRAND_COLORS } from '@/lib/brand-colors';

export const runtime = 'edge';

export const alt = 'Miracle Learning - 奇绩创坛学习平台';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_COLORS.light.foreground,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Brand gradient orb - top right */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-80px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.15) 40%, transparent 70%)',
          }}
        />
        {/* Brand gradient orb - bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-60px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)',
          }}
        />
        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            zIndex: 1,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${BRAND_COLORS.light.primary} 0%, ${BRAND_COLORS.light.primary} 50%, ${BRAND_COLORS.light.primary} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              color: 'white',
              fontWeight: 700,
            }}
          >
            M
          </div>
          {/* Title */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 700,
              color: BRAND_COLORS.light.background,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Miracle Learning
          </div>
          {/* Subtitle */}
          <div
            style={{
              fontSize: '24px',
              color: BRAND_COLORS.light.mutedForeground,
              letterSpacing: '0.01em',
            }}
          >
            奇绩创坛学习平台 — 系统化学习创业知识
          </div>
        </div>
        {/* Bottom border accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${BRAND_COLORS.light.primary} 0%, ${BRAND_COLORS.light.primary} 33%, ${BRAND_COLORS.light.primary} 66%, ${BRAND_COLORS.light.primary} 100%)`,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
